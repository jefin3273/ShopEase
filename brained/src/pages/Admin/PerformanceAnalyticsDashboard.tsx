import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
    Zap,
    Activity,
    AlertTriangle,
    Clock,
    TrendingUp,
    RefreshCw,
    Monitor,
    Smartphone,
    CheckCircle,
    XCircle,
    Info
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import ExportToolbar from '@/components/ExportToolbar';

interface TimeSeriesItem {
    _id: {
        year: number;
        month: number;
        day: number;
        hour: number;
    };
    avgTTFB: number;
    avgLCP: number;
    avgFCP: number;
    avgCLS: number;
    avgINP: number;
    count: number;
}

interface DetailedStats {
    avgTTFB: number;
    avgLCP: number;
    avgFCP: number;
    avgCLS: number;
    avgINP: number;
    avgFID: number;
    avgLoadTime: number;
    avgDomReadyTime: number;
    avgDnsTime: number;
    p50TTFB: number[];
    p75TTFB: number[];
    p95TTFB: number[];
    p50LCP: number[];
    p75LCP: number[];
    p95LCP: number[];
    p50FCP: number[];
    p75FCP: number[];
    p95FCP: number[];
    totalJsErrors: number;
    totalApiCalls: number;
    totalSamples: number;
}

interface ErrorDetail {
    _id: string;
    count: number;
    lastSeen: string;
}

interface APIStats {
    _id: string;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    count: number;
    errorCount: number;
}

interface DeviceBreakdown {
    _id: string;
    avgLCP: number;
    avgFCP: number;
    avgTTFB: number;
    count: number;
}

const PerformanceAnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<DetailedStats | null>(null);
    const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
    const [apiStats, setApiStats] = useState<APIStats[]>([]);
    const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');
    const [selectedPage] = useState<string>('all');
    const contentRef = useRef<HTMLDivElement>(null);

    const fetchDetailedAnalytics = async () => {
        try {
            setLoading(true);

            const params: Record<string, string> = {};
            if (selectedPage !== 'all') params.pageURL = selectedPage;

            // Calculate date range
            const now = new Date();
            const fromDate = new Date();
            if (dateRange === '24h') {
                fromDate.setHours(now.getHours() - 24);
            } else if (dateRange === '7d') {
                fromDate.setDate(now.getDate() - 7);
            } else {
                fromDate.setDate(now.getDate() - 30);
            }

            params.from = fromDate.toISOString();
            params.to = now.toISOString();

            const response = await api.get('/api/analytics/performance/detailed', { params });

            setStats(response.data.stats || {});
            setErrorDetails(response.data.errorDetails || []);
            setApiStats(response.data.apiStats || []);
            setDeviceBreakdown(response.data.deviceBreakdown || []);
            setTimeSeriesData(response.data.timeSeriesData || []);
        } catch (err) {
            console.error('Failed to fetch performance analytics', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetailedAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, selectedPage]);

    const getPerformanceScore = (metric: string, value: number): { rating: string; color: string; bgColor: string } => {
        const thresholds: Record<string, { good: number; poor: number }> = {
            TTFB: { good: 200, poor: 600 },
            LCP: { good: 2500, poor: 4000 },
            FCP: { good: 1800, poor: 3000 },
            CLS: { good: 0.1, poor: 0.25 },
            INP: { good: 200, poor: 500 },
            FID: { good: 100, poor: 300 },
        };

        const t = thresholds[metric];
        if (!t || !value) return { rating: 'N/A', color: 'text-gray-500', bgColor: 'bg-gray-100' };

        if (value <= t.good) return { rating: 'Good', color: 'text-green-700', bgColor: 'bg-green-100' };
        if (value <= t.poor) return { rating: 'Needs Improvement', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
        return { rating: 'Poor', color: 'text-red-700', bgColor: 'bg-red-100' };
    };

    const formatMetricValue = (metric: string, value: number | undefined): string => {
        // Show N/A only if value is undefined or null, not if it's 0
        if (value === undefined || value === null) return 'N/A';

        if (metric === 'CLS') {
            return value.toFixed(3);
        }

        if (value < 1000) {
            return `${Math.round(value)}ms`;
        }

        return `${(value / 1000).toFixed(2)}s`;
    }; const MetricCard: React.FC<{
        title: string;
        value: number | undefined;
        metricKey: string;
        icon: React.ReactNode;
        description: string;
        percentileData?: { p50: number; p75: number; p95: number };
    }> = ({ title, value, metricKey, icon, description, percentileData }) => {
        const score = getPerformanceScore(metricKey, value || 0);

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-lg">
                            {icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-600 mt-0.5">{description}</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${score.rating === 'Good' ? 'bg-green-50 text-green-700 border-green-200' :
                            score.rating === 'Needs Improvement' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                score.rating === 'Poor' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                        {score.rating}
                    </div>
                </div>

                <div className="mb-3">
                    <p className="text-3xl font-bold text-slate-900">{formatMetricValue(metricKey, value)}</p>
                </div>

                {percentileData && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
                        <div>
                            <p className="text-xs text-slate-500 font-medium">P50</p>
                            <p className="text-sm font-semibold text-slate-900">{formatMetricValue(metricKey, percentileData.p50)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">P75</p>
                            <p className="text-sm font-semibold text-slate-900">{formatMetricValue(metricKey, percentileData.p75)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">P95</p>
                            <p className="text-sm font-semibold text-slate-900">{formatMetricValue(metricKey, percentileData.p95)}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const prepareTimeSeriesChartData = () => {
        return timeSeriesData.map((item) => ({
            time: `${item._id.month}/${item._id.day} ${item._id.hour}:00`,
            TTFB: Math.round(item.avgTTFB || 0),
            LCP: Math.round(item.avgLCP || 0),
            FCP: Math.round(item.avgFCP || 0),
            INP: Math.round(item.avgINP || 0),
            CLS: (item.avgCLS || 0) * 1000, // Scale for visibility
        }));
    };

    const prepareDeviceChartData = () => {
        const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
        return deviceBreakdown.map((item, index) => ({
            name: item._id || 'Unknown',
            value: item.count,
            avgLCP: Math.round(item.avgLCP || 0),
            fill: COLORS[index % COLORS.length]
        }));
    };

    // Prepare CSV data for export
    const csvGroups = [
        {
            label: 'Core Web Vitals Summary',
            headers: ['Metric', 'Average', 'P50', 'P75', 'P95', 'Rating'],
            rows: [
                ['TTFB', `${stats?.avgTTFB?.toFixed(0) || 0}ms`, `${stats?.p50TTFB?.[0]?.toFixed(0) || 0}ms`, `${stats?.p75TTFB?.[0]?.toFixed(0) || 0}ms`, `${stats?.p95TTFB?.[0]?.toFixed(0) || 0}ms`, getPerformanceScore('TTFB', stats?.avgTTFB || 0).rating],
                ['FCP', `${stats?.avgFCP?.toFixed(0) || 0}ms`, `${stats?.p50FCP?.[0]?.toFixed(0) || 0}ms`, `${stats?.p75FCP?.[0]?.toFixed(0) || 0}ms`, `${stats?.p95FCP?.[0]?.toFixed(0) || 0}ms`, getPerformanceScore('FCP', stats?.avgFCP || 0).rating],
                ['LCP', `${stats?.avgLCP?.toFixed(0) || 0}ms`, `${stats?.p50LCP?.[0]?.toFixed(0) || 0}ms`, `${stats?.p75LCP?.[0]?.toFixed(0) || 0}ms`, `${stats?.p95LCP?.[0]?.toFixed(0) || 0}ms`, getPerformanceScore('LCP', stats?.avgLCP || 0).rating],
                ['CLS', stats?.avgCLS?.toFixed(3) || '0.000', '', '', '', getPerformanceScore('CLS', stats?.avgCLS || 0).rating],
                ['INP', `${stats?.avgINP?.toFixed(0) || 0}ms`, '', '', '', getPerformanceScore('INP', stats?.avgINP || 0).rating],
                ['FID', `${stats?.avgFID?.toFixed(0) || 0}ms`, '', '', '', getPerformanceScore('FID', stats?.avgFID || 0).rating],
            ],
            filename: `performance-vitals-${dateRange}.csv`
        },
        {
            label: 'Device Performance',
            headers: ['Device', 'Sample Count', 'Avg LCP (ms)', 'Avg FCP (ms)', 'Avg TTFB (ms)'],
            rows: deviceBreakdown.map(d => [
                d._id || 'Unknown',
                d.count,
                d.avgLCP?.toFixed(0) || 0,
                d.avgFCP?.toFixed(0) || 0,
                d.avgTTFB?.toFixed(0) || 0
            ]),
            filename: `device-performance-${dateRange}.csv`
        },
        {
            label: 'JavaScript Errors',
            headers: ['Error Message', 'Occurrence Count', 'Last Seen'],
            rows: errorDetails.map(e => [
                e._id,
                e.count,
                new Date(e.lastSeen).toLocaleString()
            ]),
            filename: `js-errors-${dateRange}.csv`
        },
        {
            label: 'API Performance',
            headers: ['Endpoint', 'Avg Duration (ms)', 'Min (ms)', 'Max (ms)', 'Call Count', 'Error Count'],
            rows: apiStats.map(a => [
                a._id,
                a.avgDuration?.toFixed(0) || 0,
                a.minDuration?.toFixed(0) || 0,
                a.maxDuration?.toFixed(0) || 0,
                a.count,
                a.errorCount
            ]),
            filename: `api-performance-${dateRange}.csv`
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-lg text-slate-700">Loading performance data...</span>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200/50 bg-white sticky top-0 z-10 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Performance Analytics</h1>
                            <p className="text-sm text-slate-600 mt-1">
                                Monitor Core Web Vitals, API performance, and user experience metrics
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <ExportToolbar
                                targetRef={contentRef as React.RefObject<HTMLElement>}
                                pdfFilename={`performance-dashboard-${dateRange}.pdf`}
                                csvGroups={csvGroups}
                                shareUrl={window.location.href}
                                size="sm"
                            />
                            <button
                                onClick={fetchDetailedAnalytics}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Time Range:</span>
                        </div>
                        <div className="flex gap-2">
                            {(['24h', '7d', '30d'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dateRange === range
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8" ref={contentRef}>

                {/* Summary Stats */}
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Samples</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalSamples?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">JS Errors</p>
                            <p className="text-2xl font-bold text-red-600">{stats?.totalJsErrors?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">API Calls Tracked</p>
                            <p className="text-2xl font-bold text-green-600">{stats?.totalApiCalls?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Avg Load Time</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {stats?.avgLoadTime ? `${(stats.avgLoadTime / 1000).toFixed(2)}s` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Core Web Vitals */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="w-6 h-6 text-blue-600" />
                        Core Web Vitals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <MetricCard
                            title="TTFB"
                            value={stats?.avgTTFB}
                            metricKey="TTFB"
                            icon={<Clock className="w-5 h-5 text-blue-600" />}
                            description="Time to First Byte - Server response time"
                            percentileData={{
                                p50: stats?.p50TTFB?.[0] || 0,
                                p75: stats?.p75TTFB?.[0] || 0,
                                p95: stats?.p95TTFB?.[0] || 0
                            }}
                        />

                        <MetricCard
                            title="FCP"
                            value={stats?.avgFCP}
                            metricKey="FCP"
                            icon={<Activity className="w-5 h-5 text-green-600" />}
                            description="First Contentful Paint - First visible element"
                            percentileData={{
                                p50: stats?.p50FCP?.[0] || 0,
                                p75: stats?.p75FCP?.[0] || 0,
                                p95: stats?.p95FCP?.[0] || 0
                            }}
                        />

                        <MetricCard
                            title="LCP"
                            value={stats?.avgLCP}
                            metricKey="LCP"
                            icon={<Monitor className="w-5 h-5 text-purple-600" />}
                            description="Largest Contentful Paint - Main content load"
                            percentileData={{
                                p50: stats?.p50LCP?.[0] || 0,
                                p75: stats?.p75LCP?.[0] || 0,
                                p95: stats?.p95LCP?.[0] || 0
                            }}
                        />

                        <MetricCard
                            title="CLS"
                            value={stats?.avgCLS}
                            metricKey="CLS"
                            icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
                            description="Cumulative Layout Shift - Visual stability"
                        />

                        <MetricCard
                            title="INP"
                            value={stats?.avgINP}
                            metricKey="INP"
                            icon={<Smartphone className="w-5 h-5 text-indigo-600" />}
                            description="Interaction to Next Paint - Responsiveness (Modern)"
                        />

                        <MetricCard
                            title="FID"
                            value={stats?.avgFID}
                            metricKey="FID"
                            icon={<Activity className="w-5 h-5 text-pink-600" />}
                            description="First Input Delay - Interactivity (Fallback)"
                        />
                    </div>
                </div>

                {/* Performance Over Time */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Performance Trends
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={prepareTimeSeriesChartData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="TTFB" stroke="#3b82f6" name="TTFB (ms)" strokeWidth={2} />
                            <Line type="monotone" dataKey="FCP" stroke="#10b981" name="FCP (ms)" strokeWidth={2} />
                            <Line type="monotone" dataKey="LCP" stroke="#8b5cf6" name="LCP (ms)" strokeWidth={2} />
                            <Line type="monotone" dataKey="INP" stroke="#6366f1" name="INP (ms)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Device Performance & Error Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Device Breakdown */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-blue-600" />
                            Performance by Device
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={prepareDeviceChartData()}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                >
                                    {prepareDeviceChartData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                            {deviceBreakdown.map((device, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{device._id || 'Unknown'}</span>
                                    <span className="text-sm text-gray-600">
                                        Avg LCP: {Math.round(device.avgLCP)}ms
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* JS Errors */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            Top JavaScript Errors
                        </h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {errorDetails.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                                    <p>No errors detected! 🎉</p>
                                </div>
                            ) : (
                                errorDetails.map((error, index) => (
                                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-medium text-red-900 flex-1">{error._id}</p>
                                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                                {error.count}x
                                            </span>
                                        </div>
                                        <p className="text-xs text-red-600">
                                            Last seen: {new Date(error.lastSeen).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* API Performance */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        API Performance & Response Codes
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Endpoint</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Calls</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Duration</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Min</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Max</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Errors</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No API calls tracked yet
                                        </td>
                                    </tr>
                                ) : (
                                    apiStats.map((api, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm font-mono">{api._id}</td>
                                            <td className="py-3 px-4 text-sm text-right">{api.count}</td>
                                            <td className="py-3 px-4 text-sm text-right font-medium">
                                                {Math.round(api.avgDuration)}ms
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right text-green-600">
                                                {Math.round(api.minDuration)}ms
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right text-red-600">
                                                {Math.round(api.maxDuration)}ms
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right">
                                                {api.errorCount > 0 ? (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                                        {api.errorCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">0</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {api.errorCount > 0 ? (
                                                    <XCircle className="w-5 h-5 text-red-500 inline" />
                                                ) : (
                                                    <CheckCircle className="w-5 h-5 text-green-500 inline" />
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-1">Understanding Core Web Vitals</h3>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• <strong>TTFB:</strong> Good: &lt;200ms | Poor: &gt;600ms</li>
                                <li>• <strong>FCP:</strong> Good: &lt;1.8s | Poor: &gt;3.0s</li>
                                <li>• <strong>LCP:</strong> Good: &lt;2.5s | Poor: &gt;4.0s</li>
                                <li>• <strong>CLS:</strong> Good: &lt;0.1 | Poor: &gt;0.25</li>
                                <li>• <strong>INP:</strong> Good: &lt;200ms | Poor: &gt;500ms (Modern browsers)</li>
                                <li>• <strong>FID:</strong> Good: &lt;100ms | Poor: &gt;300ms (Fallback for older browsers)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default PerformanceAnalyticsDashboard;
