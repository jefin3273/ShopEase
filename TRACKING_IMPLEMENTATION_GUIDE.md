# 🧠 User Behavior Tracking System - Complete Implementation Guide

## Overview

This is a comprehensive, production-ready user behavior tracking system implementing:

✅ **Click tracking** - Track all user clicks with element context  
✅ **Scroll depth tracking** - Monitor how far users scroll on pages  
✅ **Mouse hover tracking** - Detect which elements users hover on  
✅ **Mouse movement tracking** - Capture cursor positions for heatmaps  
✅ **Page visit & navigation** - Track page views and user journeys  
✅ **Engagement time tracking** - Measure active time on each page  
✅ **Session recording** - Capture user interactions for replay  
✅ **Event batching** - Efficient bulk sending to reduce network calls  
✅ **Privacy-safe** - Masks sensitive inputs, respects user privacy  

---

## Architecture

```
Frontend (React)
    │
    ├── AnalyticsManager.ts
    │   ├── Event Listeners (click, scroll, hover, mousemove)
    │   ├── Event Queue (batching)
    │   ├── Session Recording
    │   └── Periodic Flush (HTTP/sendBeacon)
    │
    ▼
Backend (Express + MongoDB)
    │
    ├── /api/tracking/interaction (single event)
    ├── /api/tracking/interactions/batch (bulk events)
    ├── /api/tracking/session (session recording)
    ├── /api/tracking/sessions (list/get recordings)
    ├── /api/tracking/heatmap (generate heatmap)
    └── /api/tracking/heatmap/raw (raw data points)
    │
    ▼
MongoDB Collections
    ├── userinteractions (individual events)
    ├── sessionrecordings (session replay data)
    └── heatmapdata (aggregated heatmap points)
```

---

## Installation

### Frontend Dependencies

```bash
cd brained
npm install rrweb rrweb-player heatmap.js ua-parser-js
```

### Backend (Already Installed)

All backend dependencies are already in `server/package.json`.

---

## Quick Start

### 1. Backend Setup

The backend routes are automatically mounted at `/api/tracking`. No additional setup required.

**Environment Variables** (optional):
```env
CORS_DEBUG=true  # Enable CORS debugging logs
```

### 2. Frontend Integration

The `AnalyticsManager` is automatically initialized as a singleton. To use it in your app:

```typescript
// In your main App.tsx or index.tsx
import analyticsManager from './services/AnalyticsManager';

// Analytics is automatically tracking on page load
// No initialization code needed!

// Optional: Identify a user after login
analyticsManager.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium',
});

// Optional: Track custom events
analyticsManager.trackCustomEvent('purchase_completed', {
  orderId: 'ORD-123',
  amount: 99.99,
  currency: 'USD',
});
```

### 3. Track Page Views in React Router

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import analyticsManager from './services/AnalyticsManager';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    analyticsManager.trackPageView();
  }, [location]);

  return (
    // your app
  );
}
```

---

## Features in Detail

### 1. Click Tracking

**What it tracks:**
- Element tag name, ID, class
- Click coordinates (x, y, viewport %)
- Element text content (first 100 chars)
- Page title, URL
- Device type, screen size

**Backend endpoint:** `POST /api/tracking/interaction`

**Payload:**
```json
{
  "sessionId": "abc-123",
  "userId": "user-123",
  "eventType": "click",
  "eventName": "click",
  "pageURL": "https://example.com/products",
  "metadata": {
    "element": "button",
    "elementId": "add-to-cart",
    "className": "btn btn-primary",
    "text": "Add to Cart",
    "x": 450,
    "y": 320,
    "vw": 35.5,
    "vh": 42.1,
    "device": "desktop",
    "screenWidth": 1920,
    "screenHeight": 1080
  }
}
```

### 2. Scroll Depth Tracking

**What it tracks:**
- Scroll percentage (0-100%)
- Scroll position (scrollTop, scrollLeft)
- Page height
- Throttled to 500ms by default

**Use cases:**
- Identify drop-off points
- Measure content engagement
- Optimize content length

### 3. Mouse Hover Tracking

**What it tracks:**
- Element hovered
- Hover duration (only >1s by default)
- Element context

**Use cases:**
- Identify confusing UI elements
- Detect interest signals
- Optimize tooltips/popovers

### 4. Mouse Movement (Heatmaps)

**What it tracks:**
- Cursor X/Y coordinates
- Throttled to 100ms by default
- Aggregated into heatmap

**Backend aggregation:** `GET /api/tracking/heatmap?pageURL=...&type=mousemove`

**Returns:**
```json
{
  "heatmapData": [
    { "x": 450, "y": 320, "value": 15 },
    { "x": 451, "y": 321, "value": 12 },
    ...
  ],
  "metadata": {
    "totalInteractions": 1234,
    "uniqueUsers": 87
  }
}
```

### 5. Session Recording

**How it works:**
1. Frontend records DOM events (clicks, scrolls, inputs) as timestamped events
2. Events are batched and sent to backend every 5 seconds
3. Backend stores events in MongoDB with sessionId
4. Admin can replay sessions using the session viewer

**Privacy:**
- Input values are **never** captured (only "hasValue" boolean)
- Password fields are always skipped
- Configurable masking via `privacy` config

**Backend endpoints:**
- `POST /api/tracking/session` - Store session events
- `GET /api/tracking/sessions` - List all sessions (paginated)
- `GET /api/tracking/sessions/:sessionId` - Get single session
- `POST /api/tracking/session/:sessionId/complete` - Mark session complete

### 6. Engagement Time Tracking

**What it measures:**
- Time on page (total)
- Active time (user is interacting)
- Idle detection (30s threshold)
- Page visibility tracking (tab switches)

**Use cases:**
- Calculate avg. time on page
- Identify engaging content
- Detect bounce vs. engaged visits

---

## API Reference

### Frontend API (AnalyticsManager)

```typescript
import analyticsManager from './services/AnalyticsManager';

// Identify user
analyticsManager.identify('user-123', { email: 'user@example.com' });

// Track custom event
analyticsManager.trackCustomEvent('button_click', { buttonId: 'cta-1' });

// Track page view (automatically called on load)
analyticsManager.trackPageView();

// Get session info
const sessionId = analyticsManager.getSessionId();
const userId = analyticsManager.getUserId();
const activeTime = analyticsManager.getActiveTime(); // seconds

// Reset analytics (e.g., on logout)
analyticsManager.reset();

// Clean up (on app unmount)
analyticsManager.destroy();
```

### Backend API

#### **Interactions**

##### Record Single Interaction
```http
POST /api/tracking/interaction
Content-Type: application/json

{
  "sessionId": "abc-123",
  "userId": "user-123",
  "eventType": "click",
  "eventName": "add_to_cart",
  "pageURL": "https://shop.com/product/1",
  "metadata": { "productId": "123" }
}
```

##### Batch Record Interactions
```http
POST /api/tracking/interactions/batch
Content-Type: application/json

{
  "interactions": [
    { "sessionId": "abc", "eventType": "click", ... },
    { "sessionId": "abc", "eventType": "scroll", ... }
  ]
}
```

##### Get Interaction Summary
```http
GET /api/tracking/interactions/summary?startDate=2025-01-01&groupBy=eventType
```

Response:
```json
{
  "summary": [
    { "eventType": "click", "count": 1234, "uniqueUsers": 87, "avgTimeOnPage": 45.2 },
    { "eventType": "scroll", "count": 890, "uniqueUsers": 76, "avgTimeOnPage": 50.1 }
  ]
}
```

##### Get Scroll Depth Distribution
```http
GET /api/tracking/interactions/scroll-depth?pageURL=https://shop.com/products
```

Response:
```json
{
  "distribution": [
    { "range": "0-25%", "count": 150, "uniqueUsers": 120 },
    { "range": "25-50%", "count": 100, "uniqueUsers": 85 },
    { "range": "50-75%", "count": 60, "uniqueUsers": 50 },
    { "range": "75-100%", "count": 40, "uniqueUsers": 35 }
  ]
}
```

##### Get Top Clicked Elements
```http
GET /api/tracking/interactions/top-clicks?pageURL=https://shop.com/products&limit=10
```

#### **Session Recordings**

##### Store Session Events
```http
POST /api/tracking/session
Content-Type: application/json

{
  "sessionId": "abc-123",
  "userId": "user-123",
  "events": [
    { "type": "click", "timestamp": 1500, "data": { "x": 450, "y": 320 } },
    { "type": "scroll", "timestamp": 2000, "data": { "scrollTop": 500 } }
  ],
  "metadata": {
    "url": "https://shop.com/products",
    "device": { "type": "desktop", "browser": "Chrome" }
  }
}
```

##### List Sessions
```http
GET /api/tracking/sessions?page=1&limit=20&hasErrors=false&isComplete=true
```

##### Get Single Session
```http
GET /api/tracking/sessions/abc-123
```

##### Complete Session
```http
POST /api/tracking/session/abc-123/complete
```

#### **Heatmaps**

##### Generate Heatmap
```http
GET /api/tracking/heatmap?pageURL=https://shop.com/products&type=click&device=desktop
```

Response:
```json
{
  "heatmapData": [
    { "x": 450, "y": 320, "value": 15 },
    ...
  ],
  "metadata": {
    "totalInteractions": 1234,
    "uniqueUsers": 87
  }
}
```

##### Get Raw Heatmap Points
```http
GET /api/tracking/heatmap/raw?pageURL=https://shop.com/products&type=mousemove&limit=1000
```

---

## Configuration

### AnalyticsManager Configuration

```typescript
import { AnalyticsManager } from './services/AnalyticsManager';

const customAnalytics = new AnalyticsManager({
  batchSize: 50,              // Send after 50 events
  flushInterval: 10000,       // Flush every 10 seconds
  mouseMoveThrottle: 200,     // Throttle mousemove to 200ms
  scrollThrottle: 1000,       // Throttle scroll to 1s
  enableSessionRecording: true,
  enableHeatmaps: true,
  privacy: {
    maskAllInputs: true,
    maskTextClass: 'sensitive',
    blockClass: 'no-track',
  },
});
```

### Privacy & GDPR Compliance

**Default Privacy Settings:**
- ✅ Input values are **never** captured
- ✅ Password fields are always skipped
- ✅ Credit card inputs are ignored
- ✅ User can opt-out via `analyticsManager.destroy()`

**Implementing Opt-Out:**
```typescript
// Store user preference
localStorage.setItem('analytics_opt_out', 'true');

// On app load, check preference
if (localStorage.getItem('analytics_opt_out') === 'true') {
  analyticsManager.destroy();
}
```

**GDPR Cookie Banner:**
```typescript
// After user accepts tracking
if (userAcceptsTracking) {
  // Analytics is already running
} else {
  analyticsManager.destroy();
}
```

---

## Performance Optimization

### 1. Event Batching

Events are batched and sent in bulk to reduce network overhead:
- Default batch size: 20 events
- Default flush interval: 5 seconds
- Automatic flush on page unload (using `sendBeacon`)

### 2. Throttling

Heavy events are throttled to prevent performance impact:
- Mouse move: 100ms throttle (10 events/sec max)
- Scroll: 500ms throttle (2 events/sec max)

### 3. Efficient Storage

Backend uses MongoDB indexes for fast queries:
- `sessionId` indexed for session lookup
- `userId` indexed for user analytics
- `pageURL` + `eventType` compound index
- `timestamp` indexed for time-based queries

---

## Admin Dashboard Integration

### Session Recordings List

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

function SessionsList() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    axios.get('/api/tracking/sessions?limit=20')
      .then(res => setSessions(res.data.sessions));
  }, []);

  return (
    <div>
      {sessions.map(session => (
        <div key={session.sessionId}>
          <h3>Session {session.sessionId}</h3>
          <p>Duration: {session.duration}s</p>
          <p>Clicks: {session.stats?.totalClicks}</p>
          <button onClick={() => window.location.href = `/admin/sessions/${session.sessionId}`}>
            View Replay
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Heatmap Viewer

```typescript
import { useEffect, useRef } from 'react';
import axios from 'axios';
import h337 from 'heatmap.js'; // or similar library

function HeatmapViewer({ pageURL }: { pageURL: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get(`/api/tracking/heatmap?pageURL=${encodeURIComponent(pageURL)}&type=click`)
      .then(res => {
        const heatmapInstance = h337.create({
          container: containerRef.current!,
        });
        
        heatmapInstance.setData({
          max: Math.max(...res.data.heatmapData.map((p: any) => p.value)),
          data: res.data.heatmapData,
        });
      });
  }, [pageURL]);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

---

## Troubleshooting

### Events Not Being Sent

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Backend logs for CORS issues
4. Ensure `VITE_API_BASE` is set correctly in production

### Session Recording Not Working

**Check:**
1. `enableSessionRecording` is `true` in config
2. Backend route `/api/tracking/session` is mounted
3. MongoDB is connected
4. Check backend logs for errors

### Heatmap Not Displaying

**Check:**
1. `enableHeatmaps` is `true`
2. Mouse move events are being captured (check network tab)
3. Backend has aggregated data for the page
4. Try regenerating: `GET /api/tracking/heatmap?regenerate=true`

---

## Next Steps

1. **Install frontend dependencies:**
   ```bash
   cd brained
   npm install rrweb rrweb-player heatmap.js ua-parser-js
   ```

2. **Wire Analytics Manager into your app** (see next section in this guide)

3. **Build admin dashboards** for session replay and heatmaps

4. **Set up alerts** for errors, drop-offs, or anomalies

5. **Export data** for further analysis (CSV/PDF already supported via existing endpoints)

---

## Support

For issues or questions:
- Check backend logs: `cd brained/server && npm run dev`
- Check browser console for frontend errors
- Review MongoDB collections: `userinteractions`, `sessionrecordings`, `heatmapdata`

---

**Built with ❤️ for comprehensive user behavior analytics**
