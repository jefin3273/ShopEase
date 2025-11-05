import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface EventData {
  eventType: 'click' | 'hover' | 'scroll' | 'pageview' | 'input' | 'submit' | 'custom';
  eventName: string;
  pageURL: string;
  metadata?: {
    element?: string;
    id?: string;
    className?: string;
    text?: string;
    x?: number;
    y?: number;
    vw?: number;
    vh?: number;
    hoverDuration?: number;
    scrollDepth?: number;
    formData?: Record<string, any>;
    customProps?: Record<string, any>;
    referrer?: string;
    title?: string;
  };
}

interface RecordingEvent {
  type: 'mousemove' | 'click' | 'scroll' | 'resize' | 'input' | 'pageChange';
  timestamp: number;
  data: any;
}

interface SuperProperties {
  [key: string]: any;
}

class TrackingClient {
  private sessionId: string | null = null;
  private userId: string | null = null;
  private isRecording: boolean = false;
  private recordingBuffer: RecordingEvent[] = [];
  private superProperties: SuperProperties = {};
  private flushInterval: number = 5000; // Flush every 5 seconds
  private flushTimer: number | null = null;
  private lastMouseMove: number = 0;
  private mouseMoveThrottle: number = 100; // Throttle mousemove to 100ms
  private isAdmin: boolean = false;

  constructor() {
    this.checkAdminStatus();
    this.initSession();
    this.setupEventListeners();
    this.setupPerformanceTracking();
  }

  private checkAdminStatus(): void {
    // Check if user is logged in and is admin
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const auth = JSON.parse(authData);
        this.isAdmin = auth?.user?.role === 'admin';
      }
    } catch (e) {
      // Auth is in React context, not localStorage
      // Will be set via updateAdminStatus when user logs in
    }
  }

  public updateAdminStatus(isAdmin: boolean): void {
    this.isAdmin = isAdmin;
    // Stop recording immediately if user is admin
    if (isAdmin && this.isRecording) {
      this.stopRecording();
    }
  }

  private shouldTrack(): boolean {
    // Don't track if user is admin or on admin routes
    if (this.isAdmin) return false;
    if (window.location.pathname.startsWith('/admin')) return false;

    // Check if tracking is enabled
    const trackingEnabled = localStorage.getItem('tracking_enabled') !== 'false';
    if (!trackingEnabled) return false;

    // Check if user has opted out
    const hasOptedOut = localStorage.getItem('analytics_opt_out') === 'true';
    if (hasOptedOut) return false;

    return true;
  }

  private initSession(): void {
    // Check for existing session in localStorage
    let session = localStorage.getItem('pagepulse_session');
    if (!session) {
      session = this.generateUUID();
      localStorage.setItem('pagepulse_session', session);
    }
    this.sessionId = session;

    // Check for user ID
    const storedUserId = localStorage.getItem('pagepulse_userId');
    if (storedUserId) {
      this.userId = storedUserId;
    }

    // Load super properties
    const storedProps = localStorage.getItem('pagepulse_superProps');
    if (storedProps) {
      try {
        this.superProperties = JSON.parse(storedProps);
      } catch (e) {
        console.error('Failed to parse super properties', e);
      }
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private setupEventListeners(): void {
    // Click tracking
    document.addEventListener('click', (e) => {
      if (!this.shouldTrack()) return; // Skip tracking for admins

      const target = e.target as HTMLElement;
      this.captureEvent({
        eventType: 'click',
        eventName: 'click',
        pageURL: window.location.href,
        metadata: {
          element: target.tagName.toLowerCase(),
          id: target.id || undefined,
          className: target.className || undefined,
          text: target.innerText?.substring(0, 100) || undefined,
          x: e.clientX,
          y: e.clientY,
          vw: (e.clientX / window.innerWidth) * 100,
          vh: (e.clientY / window.innerHeight) * 100,
        },
      });

      if (this.isRecording) {
        this.addRecordingEvent({
          type: 'click',
          timestamp: Date.now(),
          data: {
            x: e.clientX,
            y: e.clientY,
            element: target.tagName.toLowerCase(),
            id: target.id,
            className: target.className,
          },
        });
      }
    });

    // Mouse move tracking (throttled)
    document.addEventListener('mousemove', (e) => {
      if (!this.isRecording) return;
      if (!this.shouldTrack()) return; // Skip tracking for admins

      const now = Date.now();
      if (now - this.lastMouseMove < this.mouseMoveThrottle) return;
      this.lastMouseMove = now;

      this.addRecordingEvent({
        type: 'mousemove',
        timestamp: now,
        data: {
          x: e.clientX,
          y: e.clientY,
        },
      });
    });

    // Scroll tracking
    let scrollTimeout: number | null = null;
    document.addEventListener('scroll', () => {
      if (!this.shouldTrack()) return; // Skip tracking for admins
      if (scrollTimeout) clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        const scrollDepth = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

        this.captureEvent({
          eventType: 'scroll',
          eventName: 'scroll',
          pageURL: window.location.href,
          metadata: {
            scrollDepth: Math.round(scrollDepth),
          },
        });

        if (this.isRecording) {
          this.addRecordingEvent({
            type: 'scroll',
            timestamp: Date.now(),
            data: {
              scrollY: window.scrollY,
              scrollX: window.scrollX,
              scrollDepth: Math.round(scrollDepth),
            },
          });
        }
      }, 500);
    });

    // Page view tracking on load
    window.addEventListener('load', () => {
      this.capturePageView();
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.captureEvent({
          eventType: 'custom',
          eventName: 'page_hidden',
          pageURL: window.location.href,
        });
      } else {
        this.captureEvent({
          eventType: 'custom',
          eventName: 'page_visible',
          pageURL: window.location.href,
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      const formData: Record<string, any> = {};

      new FormData(form).forEach((value, key) => {
        // Don't capture sensitive data (passwords, credit cards, etc.)
        if (!key.toLowerCase().includes('password') && !key.toLowerCase().includes('card')) {
          formData[key] = value;
        }
      });

      this.captureEvent({
        eventType: 'submit',
        eventName: 'form_submit',
        pageURL: window.location.href,
        metadata: {
          element: 'form',
          id: form.id || undefined,
          className: form.className || undefined,
          formData,
        },
      });
    });

    // Intercept console errors
    const originalError = console.error;
    console.error = (...args) => {
      if (this.isRecording) {
        this.addConsoleLog({
          level: 'error',
          message: args.map(arg => String(arg)).join(' '),
          timestamp: Date.now(),
        });
      }
      originalError.apply(console, args);
    };

    // Window resize
    window.addEventListener('resize', () => {
      if (this.isRecording) {
        this.addRecordingEvent({
          type: 'resize',
          timestamp: Date.now(),
          data: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
      }
    });
  }

  private setupPerformanceTracking(): void {
    if (!this.shouldTrack()) return;

    // Track Core Web Vitals and performance metrics
    const performanceMetrics = {
      TTFB: 0,
      FCP: 0,
      LCP: 0,
      CLS: 0,
      INP: 0,
      FID: 0,
      loadTime: 0,
      domReadyTime: 0,
      dnsTime: 0,
    };

    // Track TTFB (Time to First Byte)
    const trackTTFB = () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          performanceMetrics.TTFB = navigation.responseStart - navigation.requestStart;
          performanceMetrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
          performanceMetrics.domReadyTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          performanceMetrics.dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
        }
      } catch (e) {
        console.error('TTFB tracking error:', e);
      }
    };

    // Track FCP (First Contentful Paint)
    const trackFCP = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-contentful-paint') {
              performanceMetrics.FCP = entry.startTime;
              observer.disconnect();
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.error('FCP tracking error:', e);
      }
    };

    // Track LCP (Largest Contentful Paint)
    const trackLCP = () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          performanceMetrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        // Stop observing after user interaction or 5 seconds
        const stopObserving = () => observer.disconnect();
        setTimeout(stopObserving, 5000);
        ['keydown', 'click', 'scroll'].forEach(type => {
          window.addEventListener(type, stopObserving, { once: true, capture: true });
        });
      } catch (e) {
        console.error('LCP tracking error:', e);
      }
    };

    // Track CLS (Cumulative Layout Shift)
    const trackCLS = () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries: any[] = [];

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

              if (sessionValue && entry.startTime - lastSessionEntry.startTime < 1000 && entry.startTime - firstSessionEntry.startTime < 5000) {
                sessionValue += entry.value;
                sessionEntries.push(entry);
              } else {
                sessionValue = entry.value;
                sessionEntries = [entry];
              }

              if (sessionValue > clsValue) {
                clsValue = sessionValue;
                performanceMetrics.CLS = clsValue;
              }
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.error('CLS tracking error:', e);
      }
    };

    // Track INP (Interaction to Next Paint) - Modern metric
    const trackINP = () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        let maxDuration = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (entry.duration > maxDuration) {
              maxDuration = entry.duration;
              performanceMetrics.INP = maxDuration;
            }
          }
        });

        observer.observe({
          entryTypes: ['event'],
          buffered: true
        });
      } catch (e) {
        // INP not supported, will use FID as fallback
        console.log('INP not supported, using FID fallback');
      }
    };

    // Track FID (First Input Delay) - Fallback metric
    const trackFID = () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries as any[]) {
            if (entry.name === 'first-input') {
              performanceMetrics.FID = entry.processingStart - entry.startTime;
              observer.disconnect();
            }
          }
        });

        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.error('FID tracking error:', e);
      }
    };

    // Track JavaScript Errors
    let jsErrors: any[] = [];
    const errorListener = (event: ErrorEvent) => {
      const error = {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      };
      jsErrors.push(error);
      console.log('🐛 JS Error captured:', error.message, '| Total errors:', jsErrors.length);
    };
    window.addEventListener('error', errorListener);

    const rejectionListener = (event: PromiseRejectionEvent) => {
      const error = {
        message: 'Unhandled Promise Rejection: ' + event.reason,
        source: 'Promise',
        timestamp: new Date().toISOString()
      };
      jsErrors.push(error);
      console.log('🐛 Promise rejection captured:', event.reason, '| Total errors:', jsErrors.length);
    };
    window.addEventListener('unhandledrejection', rejectionListener);

    // Track API Calls
    let apiCalls: any[] = [];

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        apiCalls.push({
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          timestamp: new Date().toISOString()
        });

        return response;
      } catch (error: any) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        apiCalls.push({
          url,
          method: args[1]?.method || 'GET',
          status: 0,
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    };

    // Intercept XMLHttpRequest (used by axios)
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
      (this as any)._perfTrack = {
        method,
        url: url.toString(),
        startTime: 0
      };
      return originalOpen.apply(this, [method, url, ...rest] as any);
    };

    XMLHttpRequest.prototype.send = function (...args: any[]) {
      if ((this as any)._perfTrack) {
        (this as any)._perfTrack.startTime = performance.now();

        this.addEventListener('loadend', () => {
          const endTime = performance.now();
          const perfTrack = (this as any)._perfTrack;
          const duration = endTime - perfTrack.startTime;

          apiCalls.push({
            url: perfTrack.url,
            method: perfTrack.method,
            status: this.status,
            duration,
            timestamp: new Date().toISOString()
          });
        });
      }

      return originalSend.apply(this, args);
    };

    // Send metrics function
    const sendPerformanceMetrics = () => {
      if (!this.shouldTrack()) return;

      // Only send if we have meaningful data
      const hasMetrics = performanceMetrics.TTFB > 0 ||
        performanceMetrics.FCP > 0 ||
        performanceMetrics.LCP > 0;

      if (!hasMetrics && jsErrors.length === 0 && apiCalls.length === 0) {
        console.log('⏭️ Skipping send - no meaningful data yet');
        return; // Don't send empty data
      }

      console.log('📤 Sending performance metrics:', {
        metrics: performanceMetrics,
        jsErrors: jsErrors.length,
        apiCalls: apiCalls.length
      });

      const metrics = {
        sessionId: this.sessionId,
        userId: this.userId || 'anonymous',
        projectId: 'default',
        pageURL: window.location.href,
        TTFB: performanceMetrics.TTFB,
        FCP: performanceMetrics.FCP,
        LCP: performanceMetrics.LCP,
        CLS: performanceMetrics.CLS,
        INP: performanceMetrics.INP,
        FID: performanceMetrics.FID,
        loadTime: performanceMetrics.loadTime,
        domReadyTime: performanceMetrics.domReadyTime,
        dnsTime: performanceMetrics.dnsTime,
        jsErrors: [...jsErrors], // Send a copy
        apiCalls: [...apiCalls], // Send a copy
        deviceInfo: {
          device: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          browser: navigator.userAgent.split(' ').pop(),
          os: navigator.platform,
        },
        timestamp: new Date().toISOString()
      };

      axios.post(`${API_URL}/api/analytics/performance`, metrics)
        .then(() => {
          console.log('✅ Performance metrics sent successfully');
          // Clear the arrays after successful send
          jsErrors = [];
          apiCalls = [];
        })
        .catch((err) => {
          console.error('❌ Failed to send performance metrics', err);
        });
    };    // Initialize tracking
    trackTTFB();
    trackFCP();
    trackLCP();
    trackCLS();
    trackINP();
    trackFID();

    // Send metrics on page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        sendPerformanceMetrics();
      }, 2000); // Wait 2 seconds for metrics to be collected
    });

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      sendPerformanceMetrics();
    });

    // Also send metrics periodically (every 10 seconds)
    setInterval(() => {
      sendPerformanceMetrics();
    }, 10000);
  }

  public captureEvent(eventData: EventData): void {
    if (!this.sessionId) return;
    if (!this.shouldTrack()) return; // Don't track admin users or admin pages

    const payload = {
      sessionId: this.sessionId,
      userId: this.userId || 'anonymous',
      projectId: 'default',
      eventType: eventData.eventType,
      eventName: eventData.eventName,
      pageURL: eventData.pageURL,
      metadata: {
        ...eventData.metadata,
        ...this.superProperties,
      },
    };

    // Use the correct tracking endpoint
    axios.post(`${API_URL}/api/tracking/interactions`, payload).catch((err) => {
      console.error('Failed to capture event', err);
    });
  }

  public capturePageView(): void {
    this.captureEvent({
      eventType: 'pageview',
      eventName: 'pageview',
      pageURL: window.location.href,
      metadata: {
        referrer: document.referrer || undefined,
        title: document.title,
      },
    });
  }

  public identify(userId: string, properties?: Record<string, any>): void {
    this.userId = userId;
    localStorage.setItem('pagepulse_userId', userId);

    if (properties) {
      this.setSuperProperties(properties);
    }

    // Don't send identify event for admin users
    if (this.shouldTrack()) {
      axios.post(`${API_URL}/api/analytics/identify`, {
        userId,
        properties,
      }).catch((err) => {
        console.error('Failed to identify user', err);
      });
    }
  }

  public setSuperProperties(properties: SuperProperties): void {
    this.superProperties = { ...this.superProperties, ...properties };
    localStorage.setItem('pagepulse_superProps', JSON.stringify(this.superProperties));
  }

  public startRecording(): void {
    if (this.isRecording) return;
    if (!this.shouldTrack()) return; // Don't record admin users or admin pages

    this.isRecording = true;
    this.recordingBuffer = [];

    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flushRecording();
    }, this.flushInterval);

    // Capture initial snapshot
    this.captureSnapshot();

    this.captureEvent({
      eventType: 'custom',
      eventName: 'recording_started',
      pageURL: window.location.href,
    });
  }

  public stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    // Flush remaining events
    this.flushRecording();

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.captureEvent({
      eventType: 'custom',
      eventName: 'recording_stopped',
      pageURL: window.location.href,
    });
  }

  private addRecordingEvent(event: RecordingEvent): void {
    this.recordingBuffer.push(event);

    // Auto-flush if buffer is too large
    if (this.recordingBuffer.length >= 100) {
      this.flushRecording();
    }
  }

  private flushRecording(): void {
    if (this.recordingBuffer.length === 0 || !this.sessionId) return;

    const events = [...this.recordingBuffer];
    this.recordingBuffer = [];

    axios.post(`${API_URL}/api/analytics/recording-events`, {
      sessionId: this.sessionId,
      events,
    }).catch((err) => {
      console.error('Failed to flush recording events', err);
      // Put events back in buffer if failed
      this.recordingBuffer.unshift(...events);
    });
  }

  private captureSnapshot(): void {
    if (!this.sessionId) return;

    // Simple DOM snapshot (could be enhanced with a library like rrweb)
    const snapshot = {
      html: document.documentElement.outerHTML,
      url: window.location.href,
      timestamp: Date.now(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    axios.post(`${API_URL}/api/analytics/snapshot`, {
      sessionId: this.sessionId,
      snapshot,
    }).catch((err) => {
      console.error('Failed to capture snapshot', err);
    });
  }

  private addConsoleLog(log: { level: string; message: string; timestamp: number }): void {
    if (!this.sessionId) return;

    axios.post(`${API_URL}/api/analytics/console`, {
      sessionId: this.sessionId,
      log,
    }).catch((err) => {
      console.error('Failed to log console message', err);
    });
  }

  public trackCustomEvent(eventName: string, properties?: Record<string, any>): void {
    this.captureEvent({
      eventType: 'custom',
      eventName,
      pageURL: window.location.href,
      metadata: {
        customProps: properties,
      },
    });
  }

  public reset(): void {
    this.sessionId = this.generateUUID();
    localStorage.setItem('pagepulse_session', this.sessionId);
    this.userId = null;
    localStorage.removeItem('pagepulse_userId');
    this.superProperties = {};
    localStorage.removeItem('pagepulse_superProps');
    this.stopRecording();
  }
}

// Export singleton instance
const trackingClient = new TrackingClient();
export default trackingClient;
