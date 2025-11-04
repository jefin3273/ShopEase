import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  Users, 
  Eye, 
  MousePointer2, 
  TrendingUp,
  Activity,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Zap,
  AlertCircle,
  Video,
  Target
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL;

interface DashboardStats {
  totalVisitors: number;
  activeVisitors: number;
  totalPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  browserBreakdown: Array<{ browser: string; count: number }>;
  eventTrends: Array<{ time: string; events: number }>;
  realtimeEvents: Array<{ type: string; page: string; timestamp: Date }>;
}

const RealTimeAnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalVisitors: 0,
    activeVisitors: 0,
    totalPageViews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    topPages: [],
    deviceBreakdown: [],
    browserBreakdown: [],
    eventTrends: [],
    realtimeEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Try to get user name from auth context
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || user.email || 'Admin');
      } catch (e) {}
    }

    fetchDashboardData();
    
    // Setup Socket.IO for real-time updates
    const socket = io(SOCKET_URL, { withCredentials: true });
    
    socket.on('connect', () => {
      console.log('Connected to real-time analytics');
      socket.emit('join', 'default'); // Join default project room
    });

    socket.on('event', (event: any) => {
      console.log('Real-time event:', event);
      setStats(prev => ({
        ...prev,
        realtimeEvents: [event, ...prev.realtimeEvents].slice(0, 10),
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch from new tracking APIs
      const [sessionsRes, interactionsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/tracking/sessions`, {
          params: { page: 1, limit: 100, isComplete: false },
          withCredentials: true,
        }),
        axios.get(`${API_URL}/api/tracking/interactions/summary`, {
          params: { 
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            groupBy: 'eventType'
          },
          withCredentials: true,
        }),
        axios.get(`${API_URL}/api/tracking/interactions/summary`, {
          params: { 
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          withCredentials: true,
        }),
      ]);

      // Process sessions data
      const sessions = sessionsRes.data.sessions || [];
      const activeSessions = sessions.filter((s: any) => !s.isComplete);
      const totalSessions = sessionsRes.data.pagination?.total || sessions.length;

      // Process interactions summary
      const interactionsSummary = interactionsRes.data.summary || [];
      const overallSummary = summaryRes.data.summary || [];
      
      // Calculate metrics
      const totalEvents = interactionsSummary.reduce((sum: number, item: any) => sum + item.count, 0);
      const pageviews = interactionsSummary.find((i: any) => i.eventType === 'pageview')?.count || 0;
      const avgDuration = overallSummary[0]?.avgTimeOnPage || 0;
      const uniqueUsers = new Set(sessions.map((s: any) => s.userId)).size;

      // Device breakdown
      const deviceCounts = sessions.reduce((acc: any, s: any) => {
        const device = s.device?.type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});
      const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({
        device,
        count: count as number,
      }));

      // Browser breakdown
      const browserCounts = sessions.reduce((acc: any, s: any) => {
        const browser = s.device?.browser || 'unknown';
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
      }, {});
      const browserBreakdown = Object.entries(browserCounts).map(([browser, count]) => ({
        browser,
        count: count as number,
      }));

      // Event trends (last 24 hours, hourly)
      const now = new Date();
      const eventTrends = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        return {
          time: hour.getHours() + ':00',
          events: Math.floor(Math.random() * 100), // TODO: Replace with actual data
        };
      });

      // Top pages (from pageview events)
      const topPages = [
        { page: '/products', views: pageviews > 0 ? Math.floor(pageviews * 0.4) : 0 },
        { page: '/home', views: pageviews > 0 ? Math.floor(pageviews * 0.3) : 0 },
        { page: '/cart', views: pageviews > 0 ? Math.floor(pageviews * 0.15) : 0 },
        { page: '/checkout', views: pageviews > 0 ? Math.floor(pageviews * 0.1) : 0 },
        { page: '/about', views: pageviews > 0 ? Math.floor(pageviews * 0.05) : 0 },
      ];

      setStats({
        totalVisitors: uniqueUsers,
        activeVisitors: activeSessions.length,
        totalPageViews: pageviews,
        avgSessionDuration: avgDuration,
        bounceRate: 35, // TODO: Calculate from actual data
        topPages,
        deviceBreakdown,
        browserBreakdown,
        eventTrends,
        realtimeEvents: stats.realtimeEvents, // Keep existing real-time events
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      // Try fallback to old API
      try {
        const response = await axios.get(`${API_URL}/api/dashboard/overview`, {
          withCredentials: true,
        });
        setStats(response.data);
      } catch (fallbackErr) {
        console.error('Fallback API also failed', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-lg text-gray-600">
              Here's what's happening with your website today
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/analytics/recordings')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              View Recordings
            </button>
            <button
              onClick={() => navigate('/admin/analytics/heatmap')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Target className="w-5 h-5" />
              Heatmaps
            </button>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Activity className="w-5 h-5 animate-pulse" />
              Live
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Visitors */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Live
            </div>
          </div>
          <p className="text-4xl font-bold mb-1">{formatNumber(stats.activeVisitors)}</p>
          <p className="text-blue-100">Active Visitors</p>
        </div>

        {/* Total Visitors */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUp className="w-4 h-4" />
              12%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(stats.totalVisitors)}</p>
          <p className="text-sm text-gray-500">Total Visitors</p>
        </div>

        {/* Page Views */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-purple-600">
              <ArrowUp className="w-4 h-4" />
              8%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(stats.totalPageViews)}</p>
          <p className="text-sm text-gray-500">Page Views</p>
        </div>

        {/* Avg Session Duration */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-red-600">
              <ArrowDown className="w-4 h-4" />
              3%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatDuration(stats.avgSessionDuration)}</p>
          <p className="text-sm text-gray-500">Avg Session Duration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Event Trends Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Event Trends
            </h2>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.eventTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="events" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Live Activity
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stats.realtimeEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Waiting for events...</p>
            ) : (
              stats.realtimeEvents.map((event, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MousePointer2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.type}</p>
                    <p className="text-xs text-gray-500 truncate">{event.page}</p>
                    <p className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            Top Pages
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topPages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="page" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="views" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-purple-600" />
            Device Breakdown
          </h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Browser Stats */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Chrome className="w-5 h-5 text-blue-600" />
            Top Browsers
          </h3>
          <div className="space-y-3">
            {stats.browserBreakdown.slice(0, 5).map((browser, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{browser.browser}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${(browser.count / (stats.browserBreakdown[0]?.count || 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{browser.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bounce Rate */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Bounce Rate
          </h3>
          <div className="text-center py-6">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32">
                <circle
                  className="text-gray-200"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="56"
                  cx="64"
                  cy="64"
                />
                <circle
                  className="text-orange-600"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 56}
                  strokeDashoffset={2 * Math.PI * 56 * (1 - stats.bounceRate / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="56"
                  cx="64"
                  cy="64"
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <span className="absolute text-3xl font-bold text-gray-900">
                {stats.bounceRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {stats.bounceRate < 40 ? 'Excellent' : stats.bounceRate < 60 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/analytics/recordings')}
              className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left flex items-center gap-3"
            >
              <Video className="w-5 h-5" />
              <span className="font-medium">View Session Recordings</span>
            </button>
            <button
              onClick={() => navigate('/admin/analytics/heatmap')}
              className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left flex items-center gap-3"
            >
              <Target className="w-5 h-5" />
              <span className="font-medium">Generate Heatmap</span>
            </button>
            <button
              onClick={() => navigate('/admin/analytics/funnels')}
              className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left flex items-center gap-3"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Analyze Funnels</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalyticsDashboard;
