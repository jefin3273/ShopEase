/**
 * PagePulse Analytics SDK
 * Lightweight tracking script for client websites
 * Usage: <script src="https://yourserver.com/pagepulse.js" data-project-id="your-project-id"></script>
 */

(function () {
  'use strict';

  // Configuration
  const config = {
    apiUrl: window.PAGEPULSE_API_URL || 'http://localhost:5000/api',
    projectId: document.currentScript?.getAttribute('data-project-id') || 'default',
    sessionId: null,
    userId: null,
    autoTrack: true,
  };

  // Utility functions
  const utils = {
    generateId: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    getDeviceInfo: () => {
      const ua = navigator.userAgent;
      let deviceType = 'desktop';

      if (/mobile/i.test(ua)) deviceType = 'mobile';
      else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

      return {
        type: deviceType,
        browser: navigator.userAgent.split(' ').pop(),
        os: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
      };
    },

    getLocation: () => {
      // In production, use IP geolocation service
      return {
        country: 'Unknown',
        city: 'Unknown',
        ip: 'Unknown',
      };
    },

    getUTMParams: () => {
      const params = new URLSearchParams(window.location.search);
      return {
        utmSource: params.get('utm_source'),
        utmMedium: params.get('utm_medium'),
        utmCampaign: params.get('utm_campaign'),
      };
    },

    sendBeacon: async (endpoint, data) => {
      try {
        const url = `${config.apiUrl}${endpoint}`;

        if (navigator.sendBeacon) {
          // sendBeacon requires a Blob with proper content type for JSON
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const sent = navigator.sendBeacon(url, blob);

          if (!sent) {
            // Fallback to fetch if sendBeacon fails
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
              keepalive: true
            });
          }
        } else {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true,
          });
        }
      } catch (error) {
        console.error('PagePulse tracking error:', error);
      }
    },
  };

  // Session management
  const session = {
    start: async () => {
      // Check if session exists in localStorage
      const storedSessionId = localStorage.getItem('pagepulse_session');
      const storedUserId = localStorage.getItem('pagepulse_user');

      if (storedSessionId) {
        config.sessionId = storedSessionId;
        config.userId = storedUserId;
        return;
      }

      // Create new session
      config.sessionId = utils.generateId();
      config.userId = storedUserId || utils.generateId();

      localStorage.setItem('pagepulse_session', config.sessionId);
      localStorage.setItem('pagepulse_user', config.userId);

      // Send session start event
      await utils.sendBeacon('/api/sessions/start', {
        userId: config.userId,
        projectId: config.projectId,
        entryPage: window.location.href,
        referrer: document.referrer,
        ...utils.getUTMParams(),
        device: utils.getDeviceInfo(),
        location: utils.getLocation(),
      });
    },

    update: async (pageData) => {
      if (!config.sessionId) return;

      await utils.sendBeacon(`/api/sessions/${config.sessionId}/end`, {
        pageURL: pageData.url || window.location.href,
        pageTitle: pageData.title || document.title,
        timeOnPage: pageData.timeOnPage || 0,
        scrollDepth: pageData.scrollDepth || 0,
        exitPage: pageData.exitPage || false,
      });
    },

    end: async () => {
      if (!config.sessionId) return;

      await utils.sendBeacon(`/sessions/${config.sessionId}/end`, {});

      // Clear session
      localStorage.removeItem('pagepulse_session');
    },
  };

  // Page tracking
  const pageTracker = {
    startTime: Date.now(),
    maxScroll: 0,

    init: () => {
      // Track page view
      pageTracker.track();

      // Track scroll depth
      window.addEventListener('scroll', pageTracker.trackScroll);

      // Track time on page before leaving
      window.addEventListener('beforeunload', pageTracker.beforeUnload);
    },

    track: () => {
      session.update({
        url: window.location.href,
        title: document.title,
      });
    },

    trackScroll: () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrolled / height) * 100;

      if (scrollPercent > pageTracker.maxScroll) {
        pageTracker.maxScroll = scrollPercent;
      }
    },

    beforeUnload: () => {
      const timeOnPage = Math.floor((Date.now() - pageTracker.startTime) / 1000);

      session.update({
        url: window.location.href,
        title: document.title,
        timeOnPage,
        scrollDepth: Math.round(pageTracker.maxScroll),
        exitPage: true,
      });
    },
  };

  // Event tracking
  const eventTracker = {
    init: () => {
      // Track clicks
      document.addEventListener('click', eventTracker.trackClick);

      // Track form submissions
      document.addEventListener('submit', eventTracker.trackFormSubmit);
    },

    trackClick: (e) => {
      const target = e.target;

      utils.sendBeacon('/analytics/events', {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        eventType: 'click',
        eventName: 'Element Clicked',
        pageURL: window.location.href,
        metadata: {
          element: target.tagName,
          id: target.id,
          className: target.className,
          text: target.innerText?.substring(0, 50),
          x: e.clientX,
          y: e.clientY,
          vw: window.innerWidth,
          vh: window.innerHeight,
        },
      });
    },

    trackFormSubmit: (e) => {
      const form = e.target;

      utils.sendBeacon('/analytics/events', {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        eventType: 'form_submit',
        eventName: 'Form Submitted',
        pageURL: window.location.href,
        metadata: {
          formId: form.id,
          formAction: form.action,
        },
      });
    },

    track: (eventName, metadata = {}) => {
      utils.sendBeacon('/analytics/events', {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        eventType: 'custom',
        eventName,
        pageURL: window.location.href,
        metadata,
      });
    },
  };

  // Performance tracking
  const performanceTracker = {
    metrics: {
      TTFB: null,
      FCP: null,
      LCP: null,
      CLS: null,
      INP: null,
      FID: null,
      loadTime: null,
      domReadyTime: null,
      dnsTime: null,
      apiCalls: [],
      jsErrors: [] // Move jsErrors to metrics object
    },
    clsObserver: null,
    lcpObserver: null,
    inpObserver: null,
    fidObserver: null,

    init: () => {
      // Track basic metrics on load
      window.addEventListener('load', performanceTracker.trackBasicMetrics);

      // Track Core Web Vitals
      performanceTracker.trackTTFB();
      performanceTracker.trackFCP();
      performanceTracker.trackLCP();
      performanceTracker.trackCLS();
      performanceTracker.trackINP();
      performanceTracker.trackFID();

      // Track JS errors
      performanceTracker.trackJSErrors();

      // Track API calls
      performanceTracker.trackAPILatency();

      // Send metrics before page unload
      window.addEventListener('beforeunload', () => {
        performanceTracker.sendMetrics();
      });

      // Also send metrics after 10 seconds to capture early data
      setTimeout(() => {
        performanceTracker.sendMetrics();
      }, 10000);
    },

    trackBasicMetrics: () => {
      if (!window.performance) return;

      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const nav = navigation;
        performanceTracker.metrics.loadTime = nav.loadEventEnd - nav.fetchStart;
        performanceTracker.metrics.domReadyTime = nav.domContentLoadedEventEnd - nav.fetchStart;
        performanceTracker.metrics.dnsTime = nav.domainLookupEnd - nav.domainLookupStart;
      }
    },

    trackTTFB: () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          performanceTracker.metrics.TTFB = navigation.responseStart - navigation.requestStart;
        }
      } catch (e) {
        console.error('TTFB tracking error:', e);
      }
    },

    trackFCP: () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-contentful-paint') {
              performanceTracker.metrics.FCP = entry.startTime;
              observer.disconnect();
              break;
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.error('FCP tracking error:', e);
      }
    },

    trackLCP: () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          performanceTracker.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        performanceTracker.lcpObserver = observer;

        // Stop observing after 5 seconds or on user interaction
        const stopObserving = () => {
          if (observer) observer.disconnect();
        };
        setTimeout(stopObserving, 5000);
        ['keydown', 'click', 'scroll'].forEach(type => {
          window.addEventListener(type, stopObserving, { once: true, capture: true });
        });
      } catch (e) {
        console.error('LCP tracking error:', e);
      }
    },

    trackCLS: () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries = [];

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
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
                performanceTracker.metrics.CLS = clsValue;
              }
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });
        performanceTracker.clsObserver = observer;
      } catch (e) {
        console.error('CLS tracking error:', e);
      }
    },

    trackINP: () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        let maxDuration = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // INP considers all interactions
            if (entry.duration > maxDuration) {
              maxDuration = entry.duration;
              performanceTracker.metrics.INP = maxDuration;
            }
          }
        });

        observer.observe({
          entryTypes: ['event'],
          buffered: true
        });
        performanceTracker.inpObserver = observer;
      } catch (e) {
        // Fallback to FID for older browsers
        console.log('INP not supported, using FID fallback');
      }
    },

    trackFID: () => {
      try {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-input') {
              performanceTracker.metrics.FID = entry.processingStart - entry.startTime;
              observer.disconnect();
              break;
            }
          }
        });

        observer.observe({ entryTypes: ['first-input'] });
        performanceTracker.fidObserver = observer;
      } catch (e) {
        console.error('FID tracking error:', e);
      }
    },

    trackJSErrors: () => {
      window.addEventListener('error', (event) => {
        const error = {
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        };
        performanceTracker.metrics.jsErrors.push(error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error = {
          message: 'Unhandled Promise Rejection: ' + event.reason,
          source: 'Promise',
          timestamp: new Date().toISOString()
        };
        performanceTracker.metrics.jsErrors.push(error);
      });
    },

    trackAPILatency: () => {
      // Intercept fetch
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const startTime = performance.now();
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;

        try {
          const response = await originalFetch.apply(this, args);
          const endTime = performance.now();
          const duration = endTime - startTime;

          performanceTracker.metrics.apiCalls.push({
            url,
            method: args[1]?.method || 'GET',
            status: response.status,
            duration,
            timestamp: new Date().toISOString()
          });

          return response;
        } catch (error) {
          const endTime = performance.now();
          const duration = endTime - startTime;

          performanceTracker.metrics.apiCalls.push({
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

      // Intercept XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._perfTrack = { method, url, startTime: null };
        return originalOpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        if (this._perfTrack) {
          this._perfTrack.startTime = performance.now();

          this.addEventListener('loadend', () => {
            const endTime = performance.now();
            const duration = endTime - this._perfTrack.startTime;

            performanceTracker.metrics.apiCalls.push({
              url: this._perfTrack.url,
              method: this._perfTrack.method,
              status: this.status,
              duration,
              timestamp: new Date().toISOString()
            });
          });
        }

        return originalSend.apply(this, args);
      };
    },

    sendMetrics: () => {
      const metrics = {
        sessionId: config.sessionId,
        userId: config.userId,
        projectId: config.projectId,
        pageURL: window.location.href,
        TTFB: performanceTracker.metrics.TTFB,
        FCP: performanceTracker.metrics.FCP,
        LCP: performanceTracker.metrics.LCP,
        CLS: performanceTracker.metrics.CLS,
        INP: performanceTracker.metrics.INP,
        FID: performanceTracker.metrics.FID,
        loadTime: performanceTracker.metrics.loadTime,
        domReadyTime: performanceTracker.metrics.domReadyTime,
        dnsTime: performanceTracker.metrics.dnsTime,
        apiCalls: [...performanceTracker.metrics.apiCalls], // Send a copy
        jsErrors: [...performanceTracker.metrics.jsErrors], // Send a copy
        deviceInfo: utils.getDeviceInfo(),
        timestamp: new Date().toISOString()
      };

      utils.sendBeacon('/analytics/performance', metrics);

      // Clear arrays after sending
      performanceTracker.metrics.apiCalls = [];
      performanceTracker.metrics.jsErrors = [];
    },

    track: () => {
      // Legacy method for backward compatibility
      performanceTracker.sendMetrics();
    }
  };

  // Public API
  window.PagePulse = {
    init: (options = {}) => {
      Object.assign(config, options);

      // Start session
      session.start().then(() => {
        if (config.autoTrack) {
          pageTracker.init();
          eventTracker.init();
          performanceTracker.init();
        }
      });
    },

    track: (eventName, metadata) => {
      eventTracker.track(eventName, metadata);
    },

    identify: (userId, properties = {}) => {
      config.userId = userId;
      localStorage.setItem('pagepulse_user', userId);

      eventTracker.track('User Identified', {
        userId,
        ...properties,
      });
    },

    page: (pageName, properties = {}) => {
      pageTracker.track();

      eventTracker.track('Page View', {
        pageName: pageName || document.title,
        ...properties,
      });
    },
  };

  // Auto-initialize if script has data-project-id
  if (document.currentScript?.getAttribute('data-project-id')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.PagePulse.init();
      });
    } else {
      window.PagePulse.init();
    }
  }
})();
