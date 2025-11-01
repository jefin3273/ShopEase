# 🧠 PagePulse — E‑commerce + Analytics (MERN)

Modern React + TypeScript storefront with real-time analytics, a persistent shopping cart, streamlined checkout, and a lightweight Express/MongoDB backend.

<br/>

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=222)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-7.x-646cff?logo=vite&logoColor=fff)
![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=fff)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47a248?logo=mongodb&logoColor=fff)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio)

</div>

## ✨ Highlights

- 🛒 Cart you can actually use: add/update/remove, quantities, persistent in localStorage
- 🔍 Search with filters and sorting (relevance/price/rating)
- 🧾 Polished Cart page and Order Summary with free‑shipping hints
- 💳 Checkout flow with login gate only at payment time (cart is visible without login)
- 📄 Order success page with downloadable HTML receipt
- 🧩 Admin area with analytics (funnels, cohorts, A/B), session recording, heatmaps, performance
- 🔌 Realtime via Socket.IO + custom tracking client

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
  │   │   └── orders.js
  │   ├── scripts/                      # Seed scripts (products, analytics)
  │   └── server.js                     # Express + Socket.IO + MongoDB
  ├── package.json (frontend)
  └── README.md
```

## 🚀 Getting Started

> Requirements
> - Node.js 18+ (recommended)
> - MongoDB URI

### 1) Clone and install

```bash
# from repository root (brained/ is the app folder)
cd brained
npm install

# install server dependencies
cd server
npm install
```

### 2) Configure environment

Create `server/.env`:

```env
MONGO_URI=mongodb://localhost:27017/pagepulse
PORT=5001
# Allow one or many origins (comma separated)
CLIENT_URLS=http://localhost:5173
```

Optionally create `brained/.env` (frontend) if your API runs on a non-default port:

```env
VITE_API_BASE=http://localhost:5001
```

### 3) Run

Open two terminals:

```bash
# Terminal 1 — frontend (Vite)
cd brained
npm run dev

# Terminal 2 — backend (Express)
cd brained/server
npm run dev
```

Frontend will run on http://localhost:5173 and backend on http://localhost:5001 (per `.env`).

## 🧪 Demo Data (optional)

Seed products and analytics definitions for a fuller demo experience:

```bash
cd brained/server

# Products
npm run seed:products
# or reset
npm run seed:products:reset

# Analytics (funnels, cohorts, experiments)
npm run seed:analytics
# with sample events
npm run seed:analytics:with-events
```

## 🧰 Key Features

### 🛒 Cart & Search
- Add to cart from list/detail pages, quantities with +/- controls
- Persistent via localStorage; survives login/logout and refreshes
- Search results page with category filter and sorting

### 💳 Checkout & Orders
- Cart is accessible without login; login required only at checkout
- After payment: navigates to success page and offers receipt download (HTML)
- Orders stored in MongoDB and linked to the authenticated user

API endpoints (secured):

```
POST   /api/orders                 # create order (auth)
GET    /api/orders/my-orders       # user’s orders (auth)
GET    /api/orders/:id             # order details (auth + owner/admin)
GET    /api/orders/admin/all       # admin only
PATCH  /api/orders/:id/status      # admin only
```

### 📊 Analytics & Admin
- Real‑time analytics with Socket.IO
- Funnels, cohorts, A/B testing pages
- Session recordings, heatmaps, performance metrics
- Admin sidebar now includes quick actions (View Store, Profile, Logout)

## ⚙️ Tech Stack

- Frontend: React 19, TypeScript, Vite 7, Tailwind CSS 4, lucide-react
- State: React Context (CartContext)
- Backend: Express, Mongoose (MongoDB), Socket.IO
- Tooling: ESLint 9, TypeScript 5

## 🔐 Auth Flow

- Anonymous users can browse and build a cart
- Login is enforced at the moment of checkout (not for viewing cart)
- After login, you’re sent back to checkout; cart remains intact

## 🧾 Receipts

- After a successful order, you’ll land on the Order Success page (`/order-success`)
- Click “Download Receipt” to save a branded HTML receipt locally

## 🛠️ Troubleshooting

- CORS: ensure `CLIENT_URLS` in `server/.env` includes your frontend origin
- API base: set `VITE_API_BASE` if your server is not on http://localhost:5001
- Mongo connection: verify `MONGO_URI` and that MongoDB is running

## 🧑‍💻 Demo Account

For quick end‑to‑end testing you can use a demo account. If you don’t have one yet, create it via the Login/Signup page.

Suggested test user:

```
Email: demo@shopease.local
Password: demo1234
```

Notes:
- Admin pages require a user with role = `admin`. You can flip this in MongoDB manually on your test user if needed.
- Cart works without login; checkout will prompt for auth and then return you to the flow with your cart intact.

## 🎥 Screenshots & GIFs

Add your media under `public/demo/` (or a `docs/` folder) and update the links below.

| Flow | Preview |
|---|---|
| Home → Product → Add to Cart | ![Add to Cart](public/demo/add-to-cart.gif) |
| Cart → Checkout → Success | ![Checkout Success](public/demo/checkout-success.gif) |
| Admin Analytics Overview | ![Analytics Overview](public/demo/analytics-overview.png) |

---

Made with ❤️ for fast experiments and solid e‑commerce UX.
