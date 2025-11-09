import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import api from '../../services/api';
import { toast } from '@/components/ui/use-toast';
import {
  Zap,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import FilterBar, { type FilterValues } from '@/components/FilterBar';
import ExportToolbar from '@/components/ExportToolbar';

interface PerformanceMetric {
  pageURL: string;
  TTFB: number;
  LCP: number;
  FCP: number;
  CLS: number;
  jsErrors: any[];
  timestamp: Date;
  deviceInfo: {
    device: string;
    browser: string;
    os: string;
  };
}

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

const PerformanceAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({ dateRange: '24h', device: 'all', page: undefined });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPerformanceData();

    // Setup WebSocket for real-time updates
    const socket = io(API_URL, { withCredentials: true });

    socket.on('connect', () => {
      console.log('[PerformanceAnalytics] Connected to WebSocket');
      socket.emit('join', 'default');
    });

    socket.on('session-recorded', ({ sessionId, pageURL, duration }: any) => {
      console.log('[PerformanceAnalytics] New session recorded:', sessionId);
      toast({
        title: 'New Session Recorded',
        description: `${Math.round((duration || 0) / 1000)}s session on ${pageURL || 'unknown page'}`,
      });
      fetchPerformanceData();
    });

    return () => {
      socket.disconnect();
    };
  }, [filters.dateRange, filters.page, filters.device, filters.cohort, filters.variant]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/analytics/performance', {
        params: {
          range: filters.dateRange,
          page: filters.page,
          device: filters.device === 'all' ? undefined : filters.device,
          cohort: filters.cohort || undefined,
          variant: filters.variant || undefined,
        },
      });
      setMetrics(response.data.metrics || []);
    } catch (err) {
      console.error('Failed to fetch performance data', err);
    } finally {
      setLoading(false);
    }
  };

  const getAverageMetrics = () => {
    if (metrics.length === 0) return { TTFB: 0, LCP: 0, FCP: 0, CLS: 0 };

    return {
      TTFB: metrics.reduce((sum, m) => sum + m.TTFB, 0) / metrics.length,
      LCP: metrics.reduce((sum, m) => sum + m.LCP, 0) / metrics.length,
      FCP: metrics.reduce((sum, m) => sum + m.FCP, 0) / metrics.length,
      CLS: metrics.reduce((sum, m) => sum + m.CLS, 0) / metrics.length,
    };
  };

  const getTotalErrors = () => {
    return metrics.reduce((sum, m) => sum + m.jsErrors.length, 0);
  };

  const getPerformanceScore = (metric: string, value: number): { score: number; rating: string; color: string } => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      TTFB: { good: 200, poor: 600 },
      LCP: { good: 2500, poor: 4000 },
      FCP: { good: 1800, poor: 3000 },
      CLS: { good: 0.1, poor: 0.25 },
    };

    const t = thresholds[metric];
    if (!t) return { score: 0, rating: 'Unknown', color: 'gray' };

    if (value <= t.good) return { score: 90, rating: 'Good', color: 'green' };
    if (value <= t.poor) return { score: 50, rating: 'Needs Improvement', color: 'yellow' };
    return { score: 20, rating: 'Poor', color: 'red' };
  };

  const getChartData = () => {
    // Group by hour or day depending on date range
    const grouped: Record<string, { TTFB: number[]; LCP: number[]; FCP: number[]; CLS: number[] }> = {};

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      const key = filters.dateRange === '24h'
        ? `${date.getHours()}:00`
        : date.toLocaleDateString();

      if (!grouped[key]) {
        grouped[key] = { TTFB: [], LCP: [], FCP: [], CLS: [] };
      }
      grouped[key].TTFB.push(metric.TTFB);
      grouped[key].LCP.push(metric.LCP);
      grouped[key].FCP.push(metric.FCP);
      grouped[key].CLS.push(metric.CLS);
    });

    return Object.entries(grouped).map(([time, values]) => ({
      time,
      TTFB: values.TTFB.reduce((a, b) => a + b, 0) / values.TTFB.length,
      LCP: values.LCP.reduce((a, b) => a + b, 0) / values.LCP.length,
      FCP: values.FCP.reduce((a, b) => a + b, 0) / values.FCP.length,
      CLS: values.CLS.reduce((a, b) => a + b, 0) / values.CLS.length * 1000, // Scale CLS for visibility
    }));
  };

  const uniquePages = Array.from(new Set(metrics.map(m => m.pageURL)));
  const avgMetrics = getAverageMetrics();
  const totalErrors = getTotalErrors();
  const chartData = getChartData();

  // Prepare CSV data for export
  const csvGroups = [
    {
      label: 'Core Web Vitals',
      headers: ['Metric', 'Average Value', 'Rating'],
      rows: [
        ['TTFB', `${avgMetrics.TTFB.toFixed(0)}ms`, getPerformanceScore('TTFB', avgMetrics.TTFB).rating],
        ['LCP', `${(avgMetrics.LCP / 1000).toFixed(2)}s`, getPerformanceScore('LCP', avgMetrics.LCP).rating],
        ['FCP', `${(avgMetrics.FCP / 1000).toFixed(2)}s`, getPerformanceScore('FCP', avgMetrics.FCP).rating],
        ['CLS', avgMetrics.CLS.toFixed(3), getPerformanceScore('CLS', avgMetrics.CLS).rating],
      ],
      filename: `performance-vitals-${filters.dateRange}.csv`
    },
    {
      label: 'All Performance Metrics',
      headers: ['Page URL', 'TTFB (ms)', 'LCP (ms)', 'FCP (ms)', 'CLS', 'JS Errors', 'Device', 'Browser', 'Timestamp'],
      rows: metrics.map(m => [
        m.pageURL,
        m.TTFB.toFixed(0),
        m.LCP.toFixed(0),
        m.FCP.toFixed(0),
        m.CLS.toFixed(3),
        m.jsErrors.length,
        m.deviceInfo.device,
        m.deviceInfo.browser,
        new Date(m.timestamp).toLocaleString()
      ]),
      filename: `performance-detailed-${filters.dateRange}.csv`
    },
    {
      label: 'JavaScript Errors',
      headers: ['Page URL', 'Error Message', 'Device', 'Browser', 'Timestamp'],
      rows: metrics
        .filter(m => m.jsErrors.length > 0)
        .flatMap(m =>
          m.jsErrors.map(error => [
            m.pageURL,
            error.message,
            m.deviceInfo.device,
            m.deviceInfo.browser,
            new Date(m.timestamp).toLocaleString()
          ])
        ),
      filename: `js-errors-${filters.dateRange}.csv`
    }
  ];

  return (
    <div className="p-6" ref={contentRef}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Analytics</h1>
        <p className="text-gray-600">Monitor Core Web Vitals and site performance metrics</p>
      </div>

      {/* Export Toolbar */}
      <div className="mb-6 flex justify-end">
        <ExportToolbar
          targetRef={contentRef as React.RefObject<HTMLElement>}
          pdfFilename={`performance-analytics-${filters.dateRange}.pdf`}
          csvGroups={csvGroups}
          shareUrl={window.location.href}
        />
      </div>

      {/* Unified FilterBar */}
      <FilterBar
        value={filters}
        pages={uniquePages}
        onChange={setFilters}
        onApply={fetchPerformanceData}
        endAdornment={(
          <button
            onClick={fetchPerformanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      />

      {/* Core Web Vitals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* TTFB */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceScore('TTFB', avgMetrics.TTFB).color === 'green'
              ? 'bg-green-100 text-green-700'
              : getPerformanceScore('TTFB', avgMetrics.TTFB).color === 'yellow'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
              }`}>
              {getPerformanceScore('TTFB', avgMetrics.TTFB).rating}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{avgMetrics.TTFB.toFixed(0)}ms</p>
          <p className="text-sm text-gray-500 mb-3">Time to First Byte</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingDown className="w-4 h-4" />
            <span>5% faster</span>
          </div>
        </div>

        {/* LCP */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceScore('LCP', avgMetrics.LCP).color === 'green'
              ? 'bg-green-100 text-green-700'
              : getPerformanceScore('LCP', avgMetrics.LCP).color === 'yellow'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
              }`}>
              {getPerformanceScore('LCP', avgMetrics.LCP).rating}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{(avgMetrics.LCP / 1000).toFixed(2)}s</p>
          <p className="text-sm text-gray-500 mb-3">Largest Contentful Paint</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingDown className="w-4 h-4" />
            <span>3% faster</span>
          </div>
        </div>

        {/* FCP */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceScore('FCP', avgMetrics.FCP).color === 'green'
              ? 'bg-green-100 text-green-700'
              : getPerformanceScore('FCP', avgMetrics.FCP).color === 'yellow'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
              }`}>
              {getPerformanceScore('FCP', avgMetrics.FCP).rating}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{(avgMetrics.FCP / 1000).toFixed(2)}s</p>
          <p className="text-sm text-gray-500 mb-3">First Contentful Paint</p>
          <div className="flex items-center gap-1 text-sm text-red-600">
            <TrendingUp className="w-4 h-4" />
            <span>2% slower</span>
          </div>
        </div>

        {/* CLS */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceScore('CLS', avgMetrics.CLS).color === 'green'
              ? 'bg-green-100 text-green-700'
              : getPerformanceScore('CLS', avgMetrics.CLS).color === 'yellow'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
              }`}>
              {getPerformanceScore('CLS', avgMetrics.CLS).rating}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{avgMetrics.CLS.toFixed(3)}</p>
          <p className="text-sm text-gray-500 mb-3">Cumulative Layout Shift</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingDown className="w-4 h-4" />
            <span>10% better</span>
          </div>
        </div>
      </div>

      {/* Performance Over Time Chart */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Performance Over Time</h2>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="TTFB" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="FCP" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="LCP" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JS Errors */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            JavaScript Errors ({totalErrors})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {metrics.filter(m => m.jsErrors.length > 0).slice(0, 10).map((metric, idx) => (
              <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">{metric.pageURL}</p>
                {metric.jsErrors.map((error, errorIdx) => (
                  <p key={errorIdx} className="text-xs text-red-600 font-mono">{error.message}</p>
                ))}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(metric.timestamp).toLocaleString()} • {metric.deviceInfo.browser} • {metric.deviceInfo.device}
                </p>
              </div>
            ))}
            {totalErrors === 0 && (
              <p className="text-center text-gray-400 py-8">No errors detected 🎉</p>
            )}
          </div>
        </div>

        {/* Performance by Page */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance by Page</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={uniquePages.slice(0, 10).map(page => {
              const pageMetrics = metrics.filter(m => m.pageURL === page);
              const avgLCP = pageMetrics.reduce((sum, m) => sum + m.LCP, 0) / pageMetrics.length;
              return { page: page.split('/').pop() || page, LCP: avgLCP };
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="page" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="LCP" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
