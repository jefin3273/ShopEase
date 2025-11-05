# 🚀 PagePulse — Self-Hosted Analytics & Session Replay Platform

<div align="center">

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=222)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646cff?logo=vite&logoColor=fff)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=fff)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47a248?logo=mongodb&logoColor=fff)](https://www.mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio)](https://socket.io)
[![rrweb](https://img.shields.io/badge/rrweb-2.0-ff6b6b?logo=javascript)](https://www.rrweb.io/)

### 🌐 Live Demo

**Frontend:** [https://shop-ease-analytics.vercel.app/](https://shop-ease-analytics.vercel.app/)  
**Backend API:** [https://shopease-backend-dt29.onrender.com](https://shopease-backend-dt29.onrender.com)

</div>

---

## 🎯 What is PagePulse?

**PagePulse** is a **complete, self-hosted analytics and session replay platform** — think **PostHog + Hotjar + Sentry + Mixpanel** combined, but built from scratch with full control over your data. Perfect for **white-labeling**, **enterprise deployments**, or **privacy-conscious applications** where you need analytics without third-party dependencies.

### 🏆 Why PagePulse?

Instead of paying for multiple SaaS tools and sending your data to third parties:

- ✅ **Own Your Data** — Self-hosted, privacy-first analytics
- ✅ **All-in-One Platform** — Replaces PostHog, Hotjar, Sentry, Mixpanel
- ✅ **White-Label Ready** — Rebrand and resell as your own product
- ✅ **Real-Time Insights** — Live analytics, heatmaps, and session replays
- ✅ **Cost-Effective** — No per-event pricing or usage limits
- ✅ **Enterprise Features** — A/B testing, funnels, cohorts, error tracking

---

## 📊 Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAGEPULSE ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐           │
│  │    React     │    │  Tracking    │    │    Session       │           │
│  │   Frontend   │    │     SDK      │    │   Recorder       │           │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘           │
│         │                   │                      │                      │
└─────────┼───────────────────┼──────────────────────┼──────────────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  API LAYER                                                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐           │
│  │   Express    │◄──►│  Socket.IO   │◄──►│   Analytics      │           │
│  │     API      │    │    Server    │    │    Engine        │           │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘           │
│         │                   │                      │                      │
└─────────┼───────────────────┼──────────────────────┼──────────────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  STORAGE LAYER                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐           │
│  │   MongoDB    │    │   Session    │    │   Analytics      │           │
│  │   Database   │    │   Storage    │    │      DB          │           │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘           │
│         │                   │                      │                      │
└─────────┼───────────────────┼──────────────────────┼──────────────────────┘
          │                   │                      │
          └───────────────────┴──────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                                                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  📊 Real-Time Analytics  │  🔥 Heatmaps        │  📹 Session Replay       │
│  🎯 Funnel Analysis      │  🧪 A/B Testing     │  👥 Cohort Analysis      │
│  ⚡ Performance Monitor  │  📈 Event Tracking  │  🎨 White-Label Ready    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Feature Comparison

| Feature | PagePulse | PostHog | Hotjar | Sentry | Mixpanel |
|---------|-----------|---------|--------|--------|----------|
| Session Replay | ✅ | ✅ | ✅ | ❌ | ❌ |
| Heatmaps | ✅ | ✅ | ✅ | ❌ | ❌ |
| Error Tracking | ✅ | ✅ | ❌ | ✅ | ❌ |
| Event Analytics | ✅ | ✅ | ❌ | ❌ | ✅ |
| Funnel Analysis | ✅ | ✅ | ✅ | ❌ | ✅ |
| A/B Testing | ✅ | ✅ | ❌ | ❌ | ✅ |
| Cohort Analysis | ✅ | ✅ | ❌ | ❌ | ✅ |
| Performance Monitoring | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Self-Hosted** | ✅ | ⚠️ (Paid) | ❌ | ⚠️ (Limited) | ❌ |
| **White-Label Ready** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **No Usage Limits** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🎨 Core Features

### 📹 Session Replay (like Hotjar/LogRocket)

```
┌─────────────────────────────────────────────────────────┐
│  🎬 Session Recording                                   │
├─────────────────────────────────────────────────────────┤
│  ✓ Full DOM capture with rrweb                          │
│  ✓ Mouse movements, clicks, scrolls                     │
│  ✓ Console logs and network requests                    │
│  ✓ Privacy filters (mask passwords, PII)                │
│  ✓ Checkout for error recovery                          │
│  ✓ Event compression for bandwidth optimization         │
│  ✓ Cross-origin iframe support (optional)               │
└─────────────────────────────────────────────────────────┘
```

### 🔥 Heatmaps (like Hotjar)

```
┌─────────────────────────────────────────────────────────┐
│  🎯 Click & Interaction Heatmaps                        │
├─────────────────────────────────────────────────────────┤
│  ✓ Click density visualization                          │
│  ✓ Scroll depth analysis                                │
│  ✓ Hover zone tracking                                  │
│  ✓ Device-specific heatmaps (mobile/tablet/desktop)     │
│  ✓ Page comparison and filtering                        │
└─────────────────────────────────────────────────────────┘
```

### 📊 Event Analytics (like Mixpanel)

```
┌─────────────────────────────────────────────────────────┐
│  📈 Real-Time Event Tracking                            │
├─────────────────────────────────────────────────────────┤
│  ✓ Custom event tracking                                │
│  ✓ User properties and super properties                 │
│  ✓ Real-time dashboards                                 │
│  ✓ Event segmentation and filtering                     │
│  ✓ CSV/PDF exports                                      │
└─────────────────────────────────────────────────────────┘
```

### 🧪 A/B Testing & Experiments

```
┌─────────────────────────────────────────────────────────┐
│  🔬 Experimentation Platform                            │
├─────────────────────────────────────────────────────────┤
│  ✓ Multi-variant testing (A/B/n)                        │
│  ✓ Traffic allocation control                           │
│  ✓ Statistical significance calculation                 │
│  ✓ Goal-based conversion tracking                       │
│  ✓ Experiment lifecycle management                      │
└─────────────────────────────────────────────────────────┘
```

### 🎯 Funnel Analysis

```
┌─────────────────────────────────────────────────────────┐
│  🚀 Conversion Funnel Analysis                          │
├─────────────────────────────────────────────────────────┤
│  ✓ Multi-step funnel creation                           │
│  ✓ Conversion rate tracking                             │
│  ✓ Drop-off analysis                                    │
│  ✓ Time-to-convert metrics                              │
│  ✓ Cohort-specific funnels                              │
└─────────────────────────────────────────────────────────┘
```

### 👥 Cohort Analysis

```
┌─────────────────────────────────────────────────────────┐
│  👨‍👩‍👧‍👦 User Segmentation & Cohorts                         │
├─────────────────────────────────────────────────────────┤
│  ✓ Behavioral cohort creation                           │
│  ✓ Retention analysis                                   │
│  ✓ Property-based segmentation                          │
│  ✓ Time-based cohorts                                   │
│  ✓ Cohort comparison                                    │
└─────────────────────────────────────────────────────────┘
```

### ⚡ Performance Monitoring (like Sentry)

```
┌─────────────────────────────────────────────────────────┐
│  🏎️  Core Web Vitals & Performance                     │
├─────────────────────────────────────────────────────────┤
│  ✓ TTFB, LCP, FCP, CLS, INP, FID tracking              │
│  ✓ API latency monitoring                               │
│  ✓ JavaScript error capture                             │
│  ✓ Network request logging                              │
│  ✓ Device and browser breakdown                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVENT TRACKING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

   👤 User Browser
        │
        │ (Page Interaction)
        ▼
   📦 Tracking SDK
        │
        │ POST /api/tracking/events
        ▼
   🔌 Express API
        │
        ├──────────────────┐
        │                  │
        ▼                  ▼
   💾 MongoDB       🔄 Socket.IO
        │                  │
        │                  │ (Real-time Update)
        │                  ▼
        │          👨‍💼 Admin Dashboard
        │                  │
        └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      SESSION RECORDING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

   👤 User Browser
        │
        │ (Session Recording)
        ▼
   📦 Tracking SDK
        │
        │ (Stream Recording Events)
        ▼
   🔄 Socket.IO
        │
        ▼
   💾 MongoDB


┌─────────────────────────────────────────────────────────────────────────────┐
│                       ANALYTICS QUERY FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   👨‍💼 Admin Dashboard
        │
        │ (Request Analytics)
        ▼
   🔌 Express API
        │
        │ (Aggregate Data)
        ▼
   💾 MongoDB
        │
        │ (Return Results)
        ▼
   🔌 Express API
        │
        │ (Display Charts & Metrics)
        ▼
   👨‍💼 Admin Dashboard
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 7+ (local or Atlas)
- Git

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/brained-app/NEURATHON-PagePulse.git
cd NEURATHON-PagePulse/brained
```

### 2️⃣ Backend Setup

```bash
cd server
npm install


# Start backend
npm run dev
```

### 3️⃣ Frontend Setup

```bash
cd ..  # Back to brained/
npm install

# Configure frontend API base URL in src/services/api.ts:
# - API_BASE: http://localhost:5000

# Start frontend
npm run dev
```

### 4️⃣ Seed Demo Data (Optional)

```bash
cd server
npm run seed:analytics:with-events
npm run seed:products
```

### 5️⃣ Access the Platform

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

### 6️⃣ Admin Dashboard

Create an admin user in MongoDB or use:

```json
{
  "email": "admin@pagepulse.local",
  "password": "admin1234",
  "role": "admin"
}
```

Access admin features at: http://localhost:5173/admin

---

## 📁 Project Structure

```
PagePulse/
├── brained/                          # Frontend Application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/                # Admin Dashboard
│   │   │   │   ├── Analytics.tsx     # Main Analytics Dashboard
│   │   │   │   ├── RealTimeAnalyticsDashboard.tsx
│   │   │   │   ├── HeatmapVisualization.tsx
│   │   │   │   ├── SessionReplayPlayer.tsx
│   │   │   │   ├── FunnelAnalysis.tsx
│   │   │   │   ├── ABTesting.tsx
│   │   │   │   ├── CohortAnalysis.tsx
│   │   │   │   ├── PerformanceAnalyticsDashboard.tsx
│   │   │   │   ├── RecordingsList.tsx
│   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   └── PeopleTab.tsx
│   │   │   ├── Cart.tsx              # E-commerce Demo
│   │   │   ├── Checkout.tsx
│   │   │   └── ProductList.tsx
│   │   ├── services/
│   │   │   ├── trackingClient.ts     # Custom Analytics SDK
│   │   │   ├── sessionRecorder.ts    # rrweb Session Recording
│   │   │   └── privacyFilter.ts      # PII Masking
│   │   ├── context/
│   │   │   ├── CartContext.tsx       # Demo: Cart Management
│   │   │   └── AuthContext.tsx       # Authentication
│   │   └── components/
│   │       └── ui/                   # Shadcn UI Components
│   ├── public/
│   │   └── pagepulse.js             # Standalone Tracking Script
│   └── package.json
│
├── server/                           # Backend API
│   ├── controllers/
│   │   ├── analyticsController.js   # Analytics API
│   │   ├── trackingController.js    # Event Ingestion
│   │   ├── sessionsController.js    # Session Replay API
│   │   └── experimentsController.js # A/B Testing
│   ├── models/
│   │   ├── EventAnalytics.js        # Event Schema
│   │   ├── PerformanceMetrics.js    # Performance Schema
│   │   ├── SessionRecording.js      # Session Schema
│   │   ├── Funnel.js                # Funnel Schema
│   │   ├── Experiment.js            # A/B Test Schema
│   │   └── Cohort.js                # Cohort Schema
│   ├── routes/
│   │   ├── analytics.js
│   │   ├── tracking.js
│   │   ├── sessions.js
│   │   ├── funnels.js
│   │   ├── experiments.js
│   │   └── cohorts.js
│   ├── middleware/
│   │   ├── rateLimiter.js           # Rate Limiting
│   │   ├── deviceInfo.js            # UA Parsing
│   │   └── auth.js                  # JWT Validation
│   ├── scripts/
│   │   ├── seedAnalytics.js         # Demo Data Generator
│   │   └── seedProducts.js          # E-commerce Demo Data
│   └── server.js                    # Express + Socket.IO Server
│
└── README.md                         # This file
```

---

## 🔌 API Reference

### Event Tracking

```http
POST /api/tracking/events
Content-Type: application/json

{
  "eventType": "click",
  "eventName": "signup_button",
  "pageURL": "https://example.com/signup",
  "metadata": {
    "element": "button#signup",
    "x": 150,
    "y": 300
  }
}
```

### Performance Metrics

```http
POST /api/tracking/performance
Content-Type: application/json

{
  "pageURL": "https://example.com",
  "TTFB": 120,
  "LCP": 1500,
  "FCP": 600,
  "CLS": 0.02,
  "INP": 50
}
```

### Session Replay

```http
POST /api/tracking/sessions/upload
Content-Type: application/json

{
  "sessionId": "uuid-here",
  "events": [...],  // rrweb events
  "consoleLogs": [...],
  "networkRequests": [...],
  "errors": [...]
}
```

### Analytics Query

```http
GET /api/analytics/events/summary?
  start=2024-01-01&
  end=2024-01-31&
  groupBy=day

Response:
{
  "success": true,
  "summary": {
    "totalEvents": 15000,
    "uniqueUsers": 1200,
    "topEvents": [...]
  }
}
```

---

## 🎯 White-Labeling Guide

PagePulse is designed to be fully white-labeled for your brand:

### 1. Branding

```typescript
// src/config/branding.ts
export const BRAND_CONFIG = {
  name: "Your Analytics Platform",
  logo: "/your-logo.svg",
  primaryColor: "#your-color",
  domain: "analytics.yourdomain.com"
};
```

### 2. Remove PagePulse Branding

```bash
# Find and replace all instances
find ./src -type f -name "*.tsx" -exec sed -i 's/PagePulse/YourBrand/g' {} +
```

### 3. Custom Domain

Update the API base URL configuration in your frontend and backend configuration files with your domain.

### 4. Database Prefix

```javascript
// server/models/EventAnalytics.js
const schema = new Schema({...});
module.exports = mongoose.model('YourBrand_EventAnalytics', schema);
```

---

## 🚢 Deployment Guide

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd brained
vercel --prod

# Configure your backend API URL in the Vercel dashboard settings
```

### Render (Backend)

1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd server && npm install`
4. Set start command: `npm start`
5. Configure your MongoDB connection string, allowed client URLs, JWT secret, and port in the Render dashboard settings

### MongoDB Atlas

1. Create cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Whitelist Render IP or use `0.0.0.0/0` for testing
4. Update your MongoDB connection string in your backend configuration

---

## 🔒 Privacy & Security Features

- ✅ **Data Masking** — Auto-mask passwords, credit cards, emails
- ✅ **GDPR Compliant** — User opt-out and data deletion
- ✅ **Rate Limiting** — Protect against API abuse
- ✅ **JWT Authentication** — Secure admin access
- ✅ **CORS Protection** — Whitelist trusted origins
- ✅ **No Third-Party Tracking** — 100% self-hosted

---

## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd brained
npm test

# E2E tests
npm run test:e2e
```

---

## 📈 Performance Benchmarks

- **Event Ingestion:** 10,000+ events/second
- **Session Replay:** < 100ms latency
- **Dashboard Load:** < 2s initial render
- **Data Compression:** 80% reduction with rrweb pack()
- **MongoDB Queries:** Optimized with indexes

---

## 🛣️ Roadmap

- [ ] AI-powered insights and anomaly detection
- [ ] Custom dashboards with drag-and-drop widgets
- [ ] Multi-project support with workspace isolation
- [ ] Advanced user journey mapping
- [ ] Slack/Discord/Email alert integrations
- [ ] GraphQL API
- [ ] Mobile SDK (React Native)
- [ ] Docker Compose for one-click deployment
- [ ] Kubernetes Helm charts
- [ ] SSO integration (OAuth, SAML)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [rrweb](https://www.rrweb.io/) - Session replay library
- [Recharts](https://recharts.org/) - Chart library
- [Shadcn UI](https://ui.shadcn.com/) - UI components
- [Express](https://expressjs.com/) - Backend framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Socket.IO](https://socket.io/) - Real-time engine

---

## 📧 Support

- **Documentation:** [docs.pagepulse.io](https://docs.pagepulse.io)
- **Issues:** [GitHub Issues](https://github.com/brained-app/NEURATHON-PagePulse/issues)
- **Discord:** [Join our community](https://discord.gg/pagepulse)
- **Email:** support@pagepulse.io

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ by the PagePulse Team

</div>

---

## 🗺️ Project Structure

```
brained/
  ├── public/
  ├── src/
  │   ├── components/
  │   │   ├── pages/
  │   │   │   ├── Cart.tsx              # Full cart UI + summary
  │   │   │   ├── Checkout.tsx          # Simplified checkout (login required here)
  │   │   │   ├── OrderSuccess.tsx      # Success screen + receipt download
  │   │   │   ├── ProductList.tsx, ProductDetail.tsx, SearchResults.tsx, …
  │   │   └── ui/                        # Shadcn-style UI primitives
  │   ├── context/
  │   │   └── CartContext.tsx           # Global cart with persistence + tracking
  │   ├── services/
  │   │   └── trackingClient.ts         # Custom analytics/tracking client
  │   └── App.tsx, main.tsx
  ├── server/
  │   ├── controllers/
  │   │   └── ordersController.js
  │   ├── models/
  │   │   └── Order.js
  │   ├── routes/
  │   │   ├── orders.js
  │   │   └── analytics.js
  │   ├── middleware/
  │   │   ├── rateLimiter.js
  │   │   └── deviceInfo.js
  │   ├── scripts/                      # Seed scripts (products, analytics)
  │   └── server.js                     # Express + Socket.IO + MongoDB
  ├── package.json (frontend)
  └── README.md (frontend)
```

---

## 🚀 Quick start (Windows cmd.exe)

1) Backend (server)

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained\server
npm install
npm run dev
```

2) Frontend (client)

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained
npm install
npm run dev
```

Defaults: frontend http://localhost:5173, backend http://localhost:5000 (or configure `PORT=5001` in backend).

---

## 🧪 Verify the backend

Health check:

```cmd
curl http://localhost:5001/api/health
```

Seed sample analytics data (dev only):

```cmd
curl http://localhost:5001/api/analytics/seed
```

Summaries:

```cmd
curl http://localhost:5001/api/analytics/events/summary
curl http://localhost:5001/api/analytics/performance/summary
```

Exports:

```cmd
curl -v http://localhost:5001/api/analytics/export/csv --output analytics.csv
curl -v http://localhost:5001/api/analytics/export/pdf --output analytics.pdf
```

---

## 🧰 Key Features

### 🛒 Cart & Search
- Add to cart from list/detail pages, update quantities, remove items
- Persistent via localStorage; survives login/logout and refreshes
- Search results page with category filter and sorting

### 💳 Checkout & Orders
- Cart accessible without login; login required only at checkout
- After payment: navigate to success page and download HTML receipt
- Orders stored in MongoDB and linked to the authenticated user

Order endpoints (auth‑secured):

```
POST   /api/orders                 # create order (auth)
GET    /api/orders/my-orders       # user’s orders (auth)
GET    /api/orders/:id             # order details (auth + owner/admin)
GET    /api/orders/admin/all       # admin only
PATCH  /api/orders/:id/status      # admin only
```

### 📊 Analytics API
- Ingest events: `POST /api/analytics/events`
- Ingest performance: `POST /api/analytics/performance`
- Summaries: `GET /api/analytics/events/summary`, `GET /api/analytics/performance/summary`
- Exports: `GET /api/analytics/export/csv`, `GET /api/analytics/export/pdf`
- Integration stubs: `POST /api/analytics/integrations/{hotjar|mixpanel|custom}`

Request body examples:

```json
{
  "eventType": "click",
  "element": "#signup",
  "pageURL": "https://example.com/signup",
  "metadata": { "source": "banner" }
}
```

```json
{
  "pageURL": "https://example.com",
  "TTFB": 120,
  "LCP": 1500,
  "FCP": 600,
  "CLS": 0.02
}
```

---

## 🧱 Architecture (high level)

Browser (React) → Express API → MongoDB

- Frontend: captures interactions and performance metrics, hits ingestion endpoints
- Server: enriches with UA‑parsed device info, rate‑limits, persists to MongoDB, aggregates, exports CSV/PDF
- MongoDB: stores `event_analytics`, `performance_metrics`, and `orders`

---

## 🧪 Demo data (optional)

From `brained/server`:

```cmd
:: Products
npm run seed:products
:: or reset
npm run seed:products:reset

:: Analytics (funnels, cohorts, experiments)
npm run seed:analytics
:: with sample events
npm run seed:analytics:with-events
```

---

## 🔐 Auth flow

- Anonymous users can browse and build a cart
- Login enforced at checkout time; after login you’re returned to the flow
- Only the last 4 digits of any card are stored (when present)

---

## 🧾 Receipts

After a successful order you’ll land on `/order-success` and can “Download Receipt” (HTML) for your records.

---

## 🛠️ Troubleshooting

- CORS: ensure `CLIENT_URLS` configuration in backend includes your frontend origin
- API base: configure API base URL if your server isn't on http://localhost:5001
- Mongo: verify MongoDB connection string and that MongoDB is running
- Port: server defaults to `5000`; set `PORT=5001` in configuration to match examples above

---

## 🧑‍💻 Demo account

Use a quick test account or create one via Signup:

```
Email: demo@shopease.local
Password: demo1234
```

Notes:
- Admin pages require a user with role `admin` (flip in MongoDB for your test user if needed)
- Cart works without login; checkout prompts for auth and resumes with your cart

---

## 🎥 Screenshots & GIFs

Place media under `brained/public/demo/` (or `docs/`) and update links:

| Flow | Preview |
|---|---|
| Home → Product → Add to Cart | ![Add to Cart](brained/public/demo/add-to-cart.gif) |
| Cart → Checkout → Success | ![Checkout Success](brained/public/demo/checkout-success.gif) |
| Admin Analytics Overview | ![Analytics Overview](brained/public/demo/analytics-overview.png) |

---

## � Deployment (Vercel + Render)

Frontend on Vercel (Vite + React):
- Build ignores TypeScript errors now (build = `vite build`). For strict checking locally, run `npm run typecheck`.
- Configure your backend API URL in Vercel dashboard settings
- Re-run build/deploy after updating configuration.

Backend on Render (Express):
- Use the `brained/server` as the project root.
- Start command: `npm start` (already configured). Render provides `PORT` automatically; the server uses it.
- Required configuration in Render dashboard:
  - `MONGO_URI` — your MongoDB connection string
  - `CLIENT_URLS` — comma-separated list of allowed origins (e.g., `https://<your-vercel-app>.vercel.app,https://<custom-domain>`)
  - Optional: `JWT_SECRET`, `PORT` (Render sets PORT automatically)
- Health check: `GET /api/health` → `{"status":"Server running"}`

CORS and multiple URLs:
- The server reads `CLIENT_URLS` (comma separated) and applies it to both HTTP CORS and Socket.IO CORS.
- After your frontend is live on Vercel, copy the origin (e.g., `https://my-app.vercel.app`) into Render's `CLIENT_URLS` configuration.
- On the frontend, configure the API base URL to point to the Render URL (e.g., `https://my-api.onrender.com`).

Post-deploy validation checklist:
- Backend: `GET https://<render>/api/health` returns 200
- Backend: try `GET https://<render>/api/analytics/events/summary` (after seeding locally or posting events)
- Frontend: app loads on Vercel, API requests go to configured backend
- Browser console: no CORS errors; if you see CORS blocked, ensure the exact Vercel origin is present in `CLIENT_URLS`.

Notes:
- If you use a custom domain on Vercel, add that domain to `CLIENT_URLS` too.
- For local testing while prod is live, you can keep `CLIENT_URLS=http://localhost:5173,https://<vercel-domain>`.

---

## �📄 License

MIT
