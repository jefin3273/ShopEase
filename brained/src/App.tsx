import { Routes, Route } from "react-router-dom";
import HomePage from "./components/pages/HomePage";
// import LandingPage from "./pages/LandingPage";
import LoginPage from "./login/page";
import ProductDetail from "./components/pages/ProductDetail";
import AboutPage from "./components/pages/AboutPage";
import "./App.css";
import AdminLayout from "./pages/Admin/Layout";
import RequireAdmin from "./components/RequireAdmin";
import AdminProducts from "./pages/Admin/Products";
import AdminAnalytics from "./pages/Admin/Analytics";
// import AdminDashboard from "./pages/Admin/Dashboard";
import TrackingSetup from "./pages/Admin/TrackingSetup";
import Profile from "./pages/Profile";
import Navbar from "./components/pages/Navbar";
import ProductList from "./components/pages/ProductList";
import Category from "./components/pages/Categories";
import Cart from "./components/pages/Cart";
import Footer from "./components/pages/Footer";
import Checkout from "./components/pages/Checkout";
import { CartProvider } from "./context/CartContext";
// New Analytics Pages
import RealTimeAnalyticsDashboard from "./pages/Admin/RealTimeAnalyticsDashboard";
import RecordingsList from "./pages/Admin/RecordingsList";
import SessionReplayPlayer from "./pages/Admin/SessionReplayPlayer";
import HeatmapVisualization from "./pages/Admin/HeatmapVisualization";
import PerformanceAnalytics from "./pages/Admin/PerformanceAnalytics";
import FunnelAnalysis from "./pages/Admin/FunnelAnalysis";
import CohortAnalysis from "./pages/Admin/CohortAnalysis";
import ABTesting from "./pages/Admin/ABTesting";
import SearchResults from "./components/pages/SearchResults";

function App() {
  return (
    <CartProvider>
    <div className="w-full">
      {/* Navbar should appear only once */}
      <Navbar />

      {/* Add padding to push content below navbar */}
      <div className="pt-20 w-full">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          {/* <Route path="/" element={<LandingPage />} /> */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/categories" element={<Category />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<RealTimeAnalyticsDashboard />} />
            <Route path="dashboard" element={<RealTimeAnalyticsDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="analytics/overview" element={<RealTimeAnalyticsDashboard />} />
            <Route path="analytics/recordings" element={<RecordingsList />} />
            <Route path="analytics/recordings/:sessionId" element={<SessionReplayPlayer />} />
            <Route path="analytics/heatmap" element={<HeatmapVisualization />} />
            <Route path="analytics/performance" element={<PerformanceAnalytics />} />
            <Route path="analytics/funnels" element={<FunnelAnalysis />} />
            <Route path="analytics/cohorts" element={<CohortAnalysis />} />
            <Route path="analytics/experiments" element={<ABTesting />} />
            <Route path="tracking" element={<TrackingSetup />} />
          </Route>
        </Routes>
      </div>
      <Footer />
    </div>
    </CartProvider>
  );
}

export default App;
