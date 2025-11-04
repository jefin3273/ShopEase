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

  constructor() {
    this.initSession();
    this.setupEventListeners();
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

  public captureEvent(eventData: EventData): void {
    if (!this.sessionId) return;

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

    axios.post(`${API_URL}/api/analytics/identify`, {
      userId,
      properties,
    }).catch((err) => {
      console.error('Failed to identify user', err);
    });
  }

  public setSuperProperties(properties: SuperProperties): void {
    this.superProperties = { ...this.superProperties, ...properties };
    localStorage.setItem('pagepulse_superProps', JSON.stringify(this.superProperties));
  }

  public startRecording(): void {
    if (this.isRecording) return;
    
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
