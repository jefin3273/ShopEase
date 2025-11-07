import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import io from 'socket.io-client';
import { record, pack } from 'rrweb';
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record';
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
import SessionReplayPlayer from "./pages/Admin/SessionReplayPlayerNew";
import HeatmapVisualization from "./pages/Admin/HeatmapVisualization";
import PerformanceAnalytics from "./pages/Admin/PerformanceAnalyticsDashboard";
import FunnelAnalysis from "./pages/Admin/FunnelAnalysis";
import CohortAnalysis from "./pages/Admin/CohortAnalysis";
import ABTesting from "./pages/Admin/ABTesting";
import FeatureFlags from "./pages/Admin/FeatureFlags";
import SearchResults from "./components/pages/SearchResults";
import OrderSuccess from "./components/pages/OrderSuccess";
import AdminDataManagement from "./pages/AdminDataManagement";
// PostHog-Style Analytics Pages
import ActivityFeed from "./pages/ActivityFeed";
import PeopleTab from "./pages/PeopleTab";
// Analytics Manager for comprehensive tracking
import analyticsManager from "./services/AnalyticsManager";
import trackingClient from "./services/trackingClient";
import { useAuth } from "./context/AuthContext";
import Analytics2 from "./pages/Admin/Analytics2";
import RealTimeAnalyticsDashboard2 from "./pages/Admin/RealTimeAnalyticsDashboards2";
import FunnelAnalysis2 from "./pages/Admin/FunnelAnalysis2";
import HeatmapVisualizationDynamic from "./pages/Admin/HeatmapVisualizationDynamic";
import LiveRecordingDashboard from "./pages/Admin/LiveRecordingDashboard";
import ReportsExport from "./pages/Admin/ReportsExport";
import BehaviorAnalytics from "./pages/Admin/BehaviorAnalytics";
import RageDeadClicks from "./pages/Admin/RageDeadClicks";
import ErrorGroups from "./pages/Admin/ErrorGroups";
import AttentionMap from "./pages/Admin/AttentionMap";
import ConsentBanner from "./components/ConsentBanner";
import { getProjectId } from "./services/config";
import ConsentMaskingManager from "./pages/Admin/ConsentMaskingManager";
import AlertRulesManager from "./pages/Admin/AlertRulesManager";
import InsightsDashboard from "./pages/Admin/InsightsDashboard";
import PathAnalysis from "./pages/Admin/PathAnalysis";
import SeedDataManager from "./pages/Admin/SeedDataManager";
import TrendsDashboard from "./pages/Admin/TrendsDashboard";

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

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

    // Update tracking client with admin status
    trackingClient.updateAdminStatus(!!isAdmin);

    if (!trackingEnabled || hasOptedOut || isAdmin) {
      analyticsManager.destroy();
      trackingClient.stopRecording();
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

    // Do NOT start rrweb session recording by default.
    // Recording only starts when admin clicks "Start Recording" in the Live Recording dashboard.

    // Cleanup on unmount
    return () => {
      // Flush any remaining events before unmount
      analyticsManager.destroy();
      trackingClient.stopRecording();
    };
  }, [auth?.user]);

  // WebSocket connection for admin-triggered live recording (Phase 2)
  useEffect(() => {
    const isAdmin = auth?.user?.role === 'admin';
    const trackingEnabled = localStorage.getItem('tracking_enabled') !== 'false';
    const hasOptedOut = localStorage.getItem('analytics_opt_out') === 'true';

    // Only connect if user is not admin and tracking is enabled
    if (isAdmin || !trackingEnabled || hasOptedOut) {
      return;
    }

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });
    
    let stopRecording: any = null;
    let isRecordingActive = false;
    let eventBatchBuffer: any[] = [];
    let batchTimeoutId: number | null = null;

    // Function to flush buffered events
    const flushEventBatch = () => {
      if (eventBatchBuffer.length > 0 && socket.connected) {
        console.log(`[App] Flushing ${eventBatchBuffer.length} buffered events`);
        
        // Emit all buffered events in one message
        eventBatchBuffer.forEach((data) => {
          socket.emit('recording-event', data);
        });
        
        eventBatchBuffer = [];
      }
      
      batchTimeoutId = null;
    };

    socket.on('connect', () => {
      console.log('[App] WebSocket connected');
      socket.emit('join-project', getProjectId());
      socket.emit('user-joined', {
        userId: auth?.user?.id || 'anonymous',
        metadata: {
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
          url: window.location.href,
        },
        projectId: getProjectId(),
      });

      // If we were recording before disconnect, restart recording
      if (isRecordingActive && !stopRecording) {
        console.log('[App] Reconnected during recording, waiting for recording-start event...');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[App] WebSocket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[App] WebSocket disconnected:', reason);
      
      // If recording was active and we got disconnected, flag it
      if (isRecordingActive && stopRecording) {
        console.log('[App] Disconnected during recording, will attempt reconnect...');
      }
    });

    socket.on('reconnect_failed', () => {
      console.error('[App] WebSocket reconnection failed');
      // Stop recording if we can't reconnect
      if (stopRecording) {
        stopRecording();
        stopRecording = null;
        isRecordingActive = false;
      }
    });

    socket.on('recording-start', ({ recordingId }) => {
      console.log('[App] Starting recording:', recordingId);
      isRecordingActive = true;
      
      stopRecording = record({
        emit(event) {
          if (socket.connected) {
            const eventData = {
              recordingId,
              event: pack(event),
              metadata: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                screen: `${window.screen.width}x${window.screen.height}`,
                userId: auth?.user?.id || 'anonymous',
              },
            };
            
            // Add to batch buffer
            eventBatchBuffer.push(eventData);
            
            // Schedule flush if not already scheduled
            if (!batchTimeoutId) {
              batchTimeoutId = setTimeout(flushEventBatch, 400); // Flush every 400ms
            }
            
            // Also flush immediately if buffer gets too large (safety)
            if (eventBatchBuffer.length >= 50) {
              if (batchTimeoutId) {
                clearTimeout(batchTimeoutId);
              }
              flushEventBatch();
            }
          } else {
            console.warn('[App] Cannot emit event, socket disconnected');
          }
        },
        recordCanvas: true,
        collectFonts: true,
        plugins: [
          getRecordConsolePlugin({
            level: ['log', 'warn', 'error'],
            lengthThreshold: 1000,
          }),
        ],
        sampling: {
          mousemove: true,
          scroll: 150,
        },
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: false,
          tel: false,
        },
        maskTextSelector: '.sensitive',
        inlineStylesheet: true,
        inlineImages: false,
      });
    });

    socket.on('recording-stop', () => {
      console.log('[App] Stopping recording');
      isRecordingActive = false;
      
      // Flush any remaining events before stopping
      if (batchTimeoutId) {
        clearTimeout(batchTimeoutId);
      }
      flushEventBatch();
      
      if (stopRecording) {
        stopRecording();
        stopRecording = null;
      }
    });

    return () => {
      // Flush remaining events on cleanup
      if (batchTimeoutId) {
        clearTimeout(batchTimeoutId);
      }
      flushEventBatch();
      
      if (stopRecording) {
        stopRecording();
      }
      isRecordingActive = false;
      socket.disconnect();
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
            <Route path="/analytics2" element={<Analytics2 />} />
            <Route path="/Overview2" element={<RealTimeAnalyticsDashboard2 />} />
            <Route path="/FunnelAnalysis2" element={<FunnelAnalysis2 />} />
            {/* Analytics pages (top-level paths as requested) */}
            <Route path="/analytics/activity" element={<ActivityFeed />} />
            <Route path="/analytics/people" element={<PeopleTab />} />
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
              <Route path="analytics/heatmap-dynamic" element={<HeatmapVisualizationDynamic />} />
              <Route path="analytics/live-recording" element={<LiveRecordingDashboard />} />
                          <Route path="analytics/reports" element={<ReportsExport />} />
              <Route path="analytics/behavior" element={<BehaviorAnalytics />} />
              <Route path="analytics/quality" element={<RageDeadClicks />} />
              <Route path="analytics/errors" element={<ErrorGroups />} />
              <Route path="analytics/attention" element={<AttentionMap />} />
              <Route path="analytics/performance" element={<PerformanceAnalytics />} />
              <Route path="analytics/funnels" element={<FunnelAnalysis />} />
              <Route path="analytics/paths" element={<PathAnalysis />} />
              <Route path="analytics/cohorts" element={<CohortAnalysis />} />
              <Route path="analytics/trends" element={<TrendsDashboard />} />
              <Route path="analytics/insights" element={<InsightsDashboard />} />
              <Route path="analytics/experiments" element={<ABTesting />} />
              <Route path="analytics/flags" element={<FeatureFlags />} />
              <Route path="analytics/activity" element={<ActivityFeed />} />
              <Route path="analytics/people" element={<PeopleTab />} />
              <Route path="analytics/realtime" element={<RealTimeAnalyticsDashboard />} />
              <Route path="tracking" element={<TrackingSetup />} />
              <Route path="data" element={<AdminDataManagement />} />
              <Route path="data/seeds" element={<SeedDataManager />} />
              <Route path="monitoring/alerts" element={<AlertRulesManager />} />
              <Route path="privacy/consent" element={<ConsentMaskingManager />} />
            </Route>
          </Routes>
        </div>
        <Footer />
        <ConsentBanner />
      </div>
    </CartProvider>
  );
}

export default App;
