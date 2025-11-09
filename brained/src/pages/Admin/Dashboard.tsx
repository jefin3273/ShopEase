import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDashboardOverview } from '../../services/dashboard';
import { useAuth } from '../../context/AuthContext';
import ExportToolbar, { type CsvGroup } from '../../components/ExportToolbar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Eye,
  Clock,
  MousePointer,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
} from 'lucide-react';

interface DashboardOverview {
  overview: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalSessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    avgPageViews: number;
    realTimeVisitors: number;
  };
  topPages: Array<{
    url: string;
    views: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
  }>;
  trafficSources: Array<{
    source: string;
    sessions: number;
  }>;
  devices: Array<{
    type: string;
    count: number;
  }>;
  browsers: Array<{
    browser: string;
    count: number;
  }>;
  pageViewTrend: Array<{
    date: string;
    views: number;
  }>;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { accessToken } = useAuth();

  const loadDashboard = async () => {
    try {
      setError('');
      const days = parseInt(dateRange);
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      const response = await getDashboardOverview(undefined, from, to);
      if (response.success) {
        setData(response);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait until we have an access token before attempting any dashboard calls to avoid 401 spam
    if (!accessToken) return;
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, accessToken]);

  // Prepare CSV export groups
  const csvGroups = useMemo<CsvGroup[]>(() => {
    if (!data) return [];
    
    const { overview, topPages, trafficSources, devices, browsers, pageViewTrend } = data;
    
    return [
      {
        label: 'Dashboard Overview',
        filename: `dashboard-overview-${dateRange}.csv`,
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Page Views', overview.totalPageViews],
          ['Unique Visitors', overview.uniqueVisitors],
          ['Total Sessions', overview.totalSessions],
          ['Avg Session Duration (s)', overview.avgSessionDuration],
          ['Bounce Rate (%)', overview.bounceRate],
          ['Avg Page Views', overview.avgPageViews],
          ['Real-time Visitors', overview.realTimeVisitors],
        ],
      },
      {
        label: 'Top Pages',
        filename: `top-pages-${dateRange}.csv`,
        headers: ['URL', 'Views', 'Unique Visitors', 'Avg Time on Page (s)'],
        rows: topPages.map(p => [p.url, p.views, p.uniqueVisitors, p.avgTimeOnPage]),
      },
      {
        label: 'Traffic Sources',
        filename: `traffic-sources-${dateRange}.csv`,
        headers: ['Source', 'Sessions'],
        rows: trafficSources.map(t => [t.source, t.sessions]),
      },
      {
        label: 'Device Breakdown',
        filename: `device-breakdown-${dateRange}.csv`,
        headers: ['Device Type', 'Count'],
        rows: devices.map(d => [d.type, d.count]),
      },
      {
        label: 'Browser Distribution',
        filename: `browser-distribution-${dateRange}.csv`,
        headers: ['Browser', 'Count'],
        rows: browsers.map(b => [b.browser, b.count]),
      },
      {
        label: 'Page View Trend',
        filename: `pageview-trend-${dateRange}.csv`,
        headers: ['Date', 'Views'],
        rows: pageViewTrend.map(p => [p.date, p.views]),
      },
    ];
  }, [data, dateRange]);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    suffix = '',
    trend,
    color = 'blue',
  }: {
    title: string;
    value: number;
    icon: typeof Users;
    suffix?: string;
    trend?: number;
    color?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">
            {value.toLocaleString()}
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </h3>
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  // If we don't yet have a token, show a unified loading state
  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Establishing secure session…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Start tracking your website to see analytics</p>
        </div>
      </div>
    );
  }

  const { overview, topPages, trafficSources, devices, browsers, pageViewTrend } = data;

  const deviceData = devices.map((d) => ({
    name: d.type,
    value: d.count,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-8" ref={containerRef}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time insights into your website performance</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Export Toolbar */}
            <ExportToolbar 
              targetRef={containerRef as React.RefObject<HTMLElement>} 
              pdfFilename={`dashboard-${dateRange}.pdf`}
              csvGroups={csvGroups}
              size="sm"
            />
            
            {/* Real-time visitors badge */}
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="font-semibold">{overview.realTimeVisitors}</span>
              <span className="text-sm">online now</span>
            </div>

            {/* Date range selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Page Views"
          value={overview.totalPageViews}
          icon={Eye}
          color="blue"
        />
        <StatCard
          title="Unique Visitors"
          value={overview.uniqueVisitors}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Avg. Session Duration"
          value={overview.avgSessionDuration}
          suffix="s"
          icon={Clock}
          color="pink"
        />
        <StatCard
          title="Bounce Rate"
          value={overview.bounceRate}
          suffix="%"
          icon={MousePointer}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Page Views Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Views Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pageViewTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {deviceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {deviceData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-4">
            {topPages.slice(0, 8).map((page, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {page.url}
                  </p>
                  <p className="text-xs text-gray-500">
                    {page.uniqueVisitors} visitors • {page.avgTimeOnPage}s avg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600">
                    {page.views.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">views</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trafficSources.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="source" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="sessions" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Browser Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Browser Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {browsers.map((browser, idx) => (
            <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
              <Globe className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">{browser.browser}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {browser.count}
              </p>
              <p className="text-xs text-gray-500">sessions</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
