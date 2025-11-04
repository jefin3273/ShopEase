import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
import OrderSuccess from "./components/pages/OrderSuccess";
// Analytics Manager for comprehensive tracking
import analyticsManager from "./services/AnalyticsManager";
import { useAuth } from "./context/AuthContext";

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Get auth context to determine if user is admin
  let auth: any = null;
  try {
    auth = useAuth();
  } catch (e) {
    auth = null;
  }

  // Initialize analytics tracking on app mount
  useEffect(() => {
    // Check if tracking is enabled (admin can toggle this)
    const trackingEnabled = localStorage.getItem('tracking_enabled') !== 'false';
    
    // Check if user has opted out of tracking
    const hasOptedOut = localStorage.getItem('analytics_opt_out') === 'true';
    
    // Don't track admin users
    const isAdmin = auth?.user?.role === 'admin';
    
    if (!trackingEnabled || hasOptedOut || isAdmin) {
      analyticsManager.destroy();
      return;
    }

    // If user is logged in and not admin, identify them
    if (auth?.user && !isAdmin) {
      analyticsManager.identify(auth.user.id, {
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role || 'customer',
      });
    }

    // Cleanup on unmount
    return () => {
      // Flush any remaining events before unmount
      analyticsManager.destroy();
    };
  }, [auth?.user]);

  // Track page views on route change (but not for admin routes or admin users)
  useEffect(() => {
    const isAdmin = auth?.user?.role === 'admin';
    const trackingEnabled = localStorage.getItem('tracking_enabled') !== 'false';
    
    // Don't track admin pages or admin users
    if (!isAdminRoute && !isAdmin && trackingEnabled) {
      analyticsManager.trackPageView();
    }
  }, [location, isAdminRoute, auth?.user]);

  return (
    <CartProvider>
      <div className="w-full">
        {/* Navbar should appear only once, hide on admin routes */}
        {!isAdminRoute && <Navbar />}

        {/* Add padding to push content below navbar, but not on admin routes */}
        <div className={!isAdminRoute ? "pt-20 w-full" : "w-full"}>
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
            <Route path="/order-success" element={<OrderSuccess />} />
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
