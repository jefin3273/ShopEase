# 🧠 NEURATHON‑PagePulse (Brained) — E‑commerce + Analytics MERN Starter

Modern React + TypeScript storefront with real-time analytics, a persistent shopping cart, streamlined checkout + receipts, and a lightweight Express/MongoDB backend. Built for fast experiments and solid UX.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=222)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-7.x-646cff?logo=vite&logoColor=fff)
![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=fff)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47a248?logo=mongodb&logoColor=fff)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio)

---

## ✨ Highlights

- 🛒 Real cart: add/update/remove with quantities, persisted in localStorage
- 🔍 Search with filters and sorting (relevance/price/rating)
- 💳 Checkout requires login only at payment time (cart visible without login)
- 📄 Order success page with downloadable HTML receipt
- 🧩 Admin area with analytics (funnels, cohorts, A/B), recordings, heatmaps, performance
- 📈 Analytics backend for events and performance with summaries and CSV/PDF export
- 🔒 Rate limiting and server‑side device info enrichment
- 🔌 Realtime via Socket.IO + custom tracking client

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

Defaults: frontend http://localhost:5173, backend http://localhost:5000 (or set `PORT=5001` in `server/.env`).

---

## ⚙️ Configure environment

Create `brained/server/.env` (never commit secrets):

```properties
MONGO_URI=mongodb://localhost:27017/pagepulse
# Recommended to set a port explicitly
PORT=5001
# One or many origins (comma-separated)
CLIENT_URLS=http://localhost:5173
# Optional if you use JWT in auth routes
JWT_SECRET=your_jwt_secret_here
```

Optionally create `brained/.env` (frontend):

```properties
VITE_API_BASE=http://localhost:5001
```

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

- CORS: ensure `CLIENT_URLS` in `server/.env` includes your frontend origin
- API base: set `VITE_API_BASE` if your server isn’t on http://localhost:5001
- Mongo: verify `MONGO_URI` and that MongoDB is running
- Port: server defaults to `5000`; set `PORT=5001` to match examples above

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

## 🧭 Next steps

- Protect ingestion/export endpoints (JWT/API key)
- Add pagination and time-range filters for summaries
- Move large exports to background jobs (queue + object storage)
- Add Docker + docker-compose for local MongoDB
- Add tests (supertest + jest) and CI (GitHub Actions)

If you want, I can add any of the above (auth, Docker, tests) in this repo.

---

## 📄 License

MIT
