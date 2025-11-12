# Seed Data Documentation

This document describes the new seeding functionality for PageViews and Funnels.

## New Seed Types

### 1. Page Views (`page-views`)
- **Description**: User navigation data for path analysis and user journey tracking
- **Default Count**: 500 page views
- **Purpose**: Generates realistic user navigation paths across various pages of the site
- **Features**:
  - Multiple user journey patterns (purchase, browse, content exploration)
  - Device, browser, and OS information
  - Realistic time on page and scroll depth metrics
  - Session-based grouping
  - Referrer tracking

### 2. Funnels (`funnels`)
- **Description**: Conversion funnel configurations with steps and analytics
- **Default Count**: 5 pre-configured funnels
- **Purpose**: Provides sample funnel configurations for analyzing conversion paths
- **Includes**:
  - E-commerce Checkout Flow
  - Quick Purchase Flow
  - Account Registration
  - Cart Recovery Flow
  - Content to Product Flow

## Usage

### Via Seed Data Manager UI
1. Navigate to the Seed Data Manager page in the admin panel
2. Find the "Page Views" or "Funnels" card
3. Click "Seed" to generate test data
4. Click "Clear" to remove seeded data (manual data is preserved)

### Via API

#### Seed Page Views
```bash
POST /api/seed/data/page-views
Content-Type: application/json

{
  "count": 500
}
```

#### Seed Funnels
```bash
POST /api/seed/data/funnels
```

#### Clear Seeded Page Views
```bash
DELETE /api/seed/data/page-views
```

#### Clear Seeded Funnels
```bash
DELETE /api/seed/data/funnels
```

#### Get Seed Status
```bash
GET /api/seed/status
```

Returns counts for all seed types including:
```json
{
  "pageViews": {
    "seeded": 500,
    "manual": 0,
    "total": 500
  },
  "funnels": {
    "seeded": 5,
    "manual": 0,
    "total": 5
  }
}
```

## Sample Data

### Page Views
The seeder generates realistic navigation paths including:
- Home → Products → Product Detail → Cart → Checkout → Thank You
- Blog → Product → Cart
- Account management flows
- Browsing sessions
- Cart abandonment scenarios

Each page view includes:
- Session ID and User ID
- Page URL and title
- Referrer information
- Timestamp
- Time on page (10-190 seconds)
- Scroll depth (1-100%)
- Device information (desktop/mobile/tablet, browser, OS)

### Funnels
Pre-configured funnels with realistic conversion metrics:

1. **E-commerce Checkout Flow** (15.12% conversion)
   - Product View → Add to Cart → View Cart → Checkout → Complete

2. **Quick Purchase Flow** (37% conversion)
   - Product Page → Quick Buy → Payment → Complete

3. **Account Registration** (60% conversion)
   - Landing → Sign Up → Email → Password → Complete

4. **Cart Recovery** (12% conversion)
   - Cart Abandoned → Email Sent → Email Clicked → Return → Purchase

5. **Content to Product** (30% conversion)
   - Blog Post → CTA Click → Product Page → Add to Cart

## Database Models

### PageView Schema
```javascript
{
  sessionId: String,
  userId: String,
  projectId: String,
  pageURL: String,
  pageTitle: String,
  referrer: String,
  timestamp: Date,
  timeOnPage: Number,
  scrollDepth: Number,
  exitPage: Boolean,
  device: {
    type: String,
    browser: String,
    os: String
  },
  isSeeded: Boolean
}
```

### Funnel Schema
```javascript
{
  name: String,
  description: String,
  projectId: String,
  steps: [{
    order: Number,
    name: String,
    eventType: String,
    pageURL: String,
    element: String
  }],
  stats: {
    totalEntered: Number,
    completed: Number,
    conversionRate: Number,
    avgTimeToComplete: Number,
    dropoffByStep: [...]
  },
  timeWindow: {
    value: Number,
    unit: String
  },
  isActive: Boolean,
  isSeeded: Boolean
}
```

## Integration Points

The seeded data works with:
- **Path Analysis**: Visualizes user journey flows using PageView data
- **Funnel Analysis**: Analyzes conversion rates using Funnel configurations
- **Session Analytics**: Groups page views by session
- **Performance Dashboard**: Shows page-level metrics

## Notes

- All seeded data is marked with `isSeeded: true` flag
- Seeded data can be cleared without affecting manually created data
- Page views are distributed across the last 7 days
- Sessions contain 2-8 page views on average
- 70% of sessions have a userId (logged-in users)
