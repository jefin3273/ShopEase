# 🎯 PagePulse Admin Quick Reference

## 🚦 Quick Start

### 1. Enable Tracking
```
1. Go to: /admin/tracking
2. Click: "Tracking Active" button (should be green)
3. Status: You'll see "All non-admin user sessions are being tracked"
```

### 2. View Live Analytics
```
1. Go to: /admin/dashboard
2. See: Real-time visitor count, page views, session duration
3. Charts show: Event trends, device types, browser types
```

### 3. Watch Session Recordings
```
1. Go to: /admin/analytics/recordings
2. Browse: List of all user sessions
3. Filter: By errors, user ID, date range
4. Click: Play button to watch session replay
5. Pagination: Navigate through multiple pages
```

### 4. View Heatmaps
```
1. Go to: /admin/analytics/heatmap
2. Enter: Page URL (e.g., /products or /home)
3. Select: Heatmap type (click, scroll, hover, mousemove)
4. Filter: By device (all, desktop, mobile, tablet)
5. Click: "Generate" button
6. Result: Visual heatmap overlay showing user interactions
```

---

## 🎛️ Admin Controls

### Tracking Toggle
- **Location**: `/admin/tracking`
- **Green Button**: Tracking is ON - all non-admin users are being tracked
- **Gray Button**: Tracking is OFF - no data is being collected
- **Impact**: Immediate - affects all users in real-time

### Session Filters
- **Location**: `/admin/analytics/recordings`
- **Filters Available**:
  - Has Errors (show only sessions with JS errors)
  - User ID (search for specific user)
  - Date range (coming soon)
- **Pagination**: 20 sessions per page

### Heatmap Options
- **Location**: `/admin/analytics/heatmap`
- **Page URL**: Enter relative path (e.g., `/products`) or full URL
- **Heatmap Types**:
  - **Click**: Shows where users click
  - **Scroll**: Shows scroll depth patterns
  - **Hover**: Shows elements users hover over
  - **Mousemove**: Shows cursor movement patterns
- **Device Filters**: All, Desktop, Mobile, Tablet
- **Intensity Slider**: Adjust heatmap opacity

---

## 📊 What You're Tracking

### Automatic Events (Always Tracked):
- ✅ Page views (every page visit)
- ✅ Clicks (every click with element details)
- ✅ Scrolls (scroll depth on each page)
- ✅ Mouse hovers (elements hovered >1 second)
- ✅ Mouse movements (for heatmaps)
- ✅ Form submissions
- ✅ JavaScript errors
- ✅ Page visibility changes (tab switches)

### Business Events (Cart & Checkout):
- ✅ Add to cart (product, quantity, price)
- ✅ Remove from cart (product details)
- ✅ Update cart quantity
- ✅ Clear cart (item count, total value)
- ✅ Begin checkout (item count, total)
- ✅ Purchase complete (order number, items, total)
- ✅ Checkout errors (error details)

### Session Info (Always Captured):
- ✅ Session ID (unique per user/tab)
- ✅ User ID (if logged in)
- ✅ Device type (desktop/mobile/tablet)
- ✅ Browser (Chrome, Firefox, Safari, etc.)
- ✅ Operating system
- ✅ Screen size
- ✅ Entry URL (first page visited)
- ✅ Exit URL (last page visited)
- ✅ Session duration
- ✅ Total events, clicks, scrolls

---

## 🔍 Reading the Data

### Dashboard Metrics:
- **Active Visitors**: Users currently on your site (incomplete sessions)
- **Total Visitors**: Unique users in last 24 hours
- **Page Views**: Total page loads in last 24 hours
- **Avg Session Duration**: Average time users spend on site

### Session Recording Info:
- **Duration**: How long the session lasted (mm:ss format)
- **Events**: Total number of events captured
- **Clicks**: Number of clicks in session
- **Scrolls**: Number of scroll events
- **Has Errors**: Red badge if session had JavaScript errors
- **Device Info**: Device type, browser, OS

### Heatmap Stats:
- **Total Interactions**: Sum of all interaction values
- **Unique Users**: Number of different users in heatmap
- **Heat Points**: Number of distinct coordinates with data
- **Peak Value**: Highest interaction count at any point

---

## ⚠️ Important Notes

### Who Is Tracked:
- ✅ Anonymous visitors (not logged in)
- ✅ Logged-in customers
- ❌ Admin users (never tracked)

### Session Behavior:
- Each logged-in user gets their own unique session
- Anonymous users get anonymous session IDs
- Each browser tab gets its own session (sessionStorage)
- Sessions persist across page reloads in same tab
- New tab = new session

### Privacy:
- ❌ Input values are NEVER captured
- ❌ Passwords are NEVER captured
- ❌ Credit card numbers are NEVER captured
- ✅ Only event types (click, scroll, etc.) are captured
- ✅ Element context (button ID, class) is captured
- ✅ User can opt-out via localStorage flag

### Performance:
- Events are batched (sent in groups of 20)
- Events are flushed every 5 seconds
- Mouse movements are throttled (100ms)
- Scrolls are throttled (500ms)
- Minimal impact on page performance

---

## 🐛 Troubleshooting

### "No sessions found"
- ✅ Check if tracking is enabled in `/admin/tracking`
- ✅ Make sure you're not logged in as admin on test browser
- ✅ Try visiting site as anonymous user or regular customer
- ✅ Check browser console for errors

### "Heatmap not showing"
- ✅ Make sure page URL is correct (include leading slash)
- ✅ Try different heatmap type (click, scroll, hover)
- ✅ Check if there's data for that page (users must have visited it)
- ✅ Try "Regenerate" option to refresh cached data

### "Dashboard shows 0 visitors"
- ✅ Tracking may be disabled - check `/admin/tracking`
- ✅ Backend may not be running - check server logs
- ✅ CORS may be blocking requests - check browser console
- ✅ Database may be empty - need users to visit site first

### "Recording list is empty"
- ✅ Users must complete some interactions first
- ✅ Sessions are only saved when events occur
- ✅ Check filters (may be filtering out all sessions)
- ✅ Try refreshing the page

---

## 📱 API Endpoints (For Reference)

### If you need to query directly:
```
GET  /api/tracking/sessions                   - List all sessions
GET  /api/tracking/sessions/:id               - Get specific session
GET  /api/tracking/interactions/summary       - Aggregated stats
GET  /api/tracking/interactions/scroll-depth  - Scroll analysis
GET  /api/tracking/interactions/top-clicks    - Most clicked elements
GET  /api/tracking/heatmap                    - Generate heatmap
```

### Query parameters:
```
?page=1&limit=20              - Pagination
?hasErrors=true               - Filter by errors
?userId=user-123              - Filter by user
?startDate=2025-01-01         - Date range
?pageURL=/products            - Filter by page
?type=click                   - Heatmap type
?device=desktop               - Device filter
```

---

## 🎉 You're All Set!

The tracking system is now fully operational. Visit `/admin/tracking` to enable tracking and start collecting data!

**Need help?** Check the comprehensive guide: `TRACKING_IMPLEMENTATION_COMPLETE.md`
