import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Filter,
  Calendar,
  Users,
  BarChart3,
  RefreshCw,
  Download,
  ArrowDownRight,
  Target,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface FunnelStep {
  name: string;
  eventType: string;
  pageURL?: string;
  elementSelector?: string;
}

interface Funnel {
  _id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface FunnelAnalysisData {
  stepName: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeToNext?: number;
}

interface FunnelAnalysisResponse {
  success: boolean;
  analysis: FunnelAnalysisData[];
  baseline?: { entries: number; completed: number; rate: number };
  filtered?: { entries: number; completed: number; rate: number };
  conversionLiftPct?: number;
  filtersApplied?: boolean;
  filterSummary?: Record<string, any> | null;
}

const FunnelAnalysis: React.FC = () => {
  // const navigate = useNavigate();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [analysisData, setAnalysisData] = useState<FunnelAnalysisData[]>([]);
  const [baselineRate, setBaselineRate] = useState<number | null>(null);
  const [filteredRate, setFilteredRate] = useState<number | null>(null);
  const [conversionLift, setConversionLift] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  const [device, setDevice] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [utmSource, setUtmSource] = useState<string>('');
  const [referrerContains, setReferrerContains] = useState<string>('');
  const [pathPrefix, setPathPrefix] = useState<string>('');

  // Create funnel form state
  const [newFunnel, setNewFunnel] = useState({
    name: '',
    description: '',
    steps: [
      { name: 'Step 1', eventType: 'pageview', pageURL: '', elementSelector: '' },
    ],
  });

  useEffect(() => {
    fetchFunnels();
  }, []);

  useEffect(() => {
    if (selectedFunnel) {
      analyzeFunnel(selectedFunnel._id);
    }

  }, [selectedFunnel, dateRange, device, country, utmSource, referrerContains, pathPrefix]);

  // Calculate metrics - must be before any early returns
  const metrics = useMemo(() => {
    if (analysisData.length === 0) return { entries: 0, completed: 0, rate: 0, dropoff: 0 };
    const entries = analysisData[0].users;
    const completed = analysisData[analysisData.length - 1].users;
    const rate = entries > 0 ? ((completed / entries) * 100).toFixed(1) : 0;
    const dropoff = entries - completed;
    return { entries, completed, rate, dropoff };
  }, [analysisData]);

  const fetchFunnels = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/funnels`, {
        withCredentials: true,
      });
      console.log('Fetched funnels:', response.data);
      setFunnels(response.data.funnels || []);
      if (response.data.funnels && response.data.funnels.length > 0) {
        setSelectedFunnel(response.data.funnels[0]);
      } else {
        console.warn('No funnels found. Please seed funnel data from the Seed Data Manager.');
      }
    } catch (err) {
      console.error('Failed to fetch funnels', err);
      alert('Failed to fetch funnels. Please check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeFunnel = async (funnelId: string) => {
    try {
      const params = new URLSearchParams({ dateRange });
      if (device) params.append('device', device);
      if (country) params.append('country', country);
      if (utmSource) params.append('utmSource', utmSource);
      if (referrerContains) params.append('referrerContains', referrerContains);
      if (pathPrefix) params.append('pathPrefix', pathPrefix);
      const url = `${API_URL}/api/funnels/${funnelId}/analyze?${params.toString()}`;
      console.log('Analyzing funnel:', url);
      const response = await axios.get<FunnelAnalysisResponse>(url, { withCredentials: true });
      console.log('Funnel analysis response:', response.data);
      setAnalysisData(response.data.analysis || []);
      setBaselineRate(response.data.baseline?.rate ?? null);
      setFilteredRate(response.data.filtered?.rate ?? null);
      setConversionLift(response.data.conversionLiftPct ?? null);

      if (!response.data.analysis || response.data.analysis.length === 0) {
        console.warn('No analysis data returned. You may need to seed page views and user events.');
      }
    } catch (err) {
      console.error('Failed to analyze funnel', err);
      alert('Failed to analyze funnel. Please ensure you have seeded page views and user events data.');
    }
  };

  const downloadFunnelCSV = async () => {
    if (!selectedFunnel) return;
    try {
      const params = new URLSearchParams({ dateRange });
      if (device) params.append('device', device);
      if (country) params.append('country', country);
      if (utmSource) params.append('utmSource', utmSource);
      if (referrerContains) params.append('referrerContains', referrerContains);
      if (pathPrefix) params.append('pathPrefix', pathPrefix);
      const resp = await axios.get(
        `${API_URL}/api/funnels/${selectedFunnel._id}/export/csv?${params.toString()}`,
        { withCredentials: true, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `funnel-${selectedFunnel.name}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download funnel CSV', err);
    }
  };

  const downloadFunnelPDF = async () => {
    if (!selectedFunnel) return;
    try {
      const params = new URLSearchParams({ dateRange });
      if (device) params.append('device', device);
      if (country) params.append('country', country);
      if (utmSource) params.append('utmSource', utmSource);
      if (referrerContains) params.append('referrerContains', referrerContains);
      if (pathPrefix) params.append('pathPrefix', pathPrefix);
      const resp = await axios.get(
        `${API_URL}/api/funnels/${selectedFunnel._id}/export/pdf?${params.toString()}`,
        { withCredentials: true, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `funnel-${selectedFunnel.name}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download funnel PDF', err);
    }
  };

  const createFunnel = async () => {
    try {
      await axios.post(
        `${API_URL}/api/funnels`,
        { ...newFunnel, projectId: 'default' },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setNewFunnel({
        name: '',
        description: '',
        steps: [{ name: 'Step 1', eventType: 'pageview', pageURL: '', elementSelector: '' }],
      });
      fetchFunnels();
    } catch (err) {
      console.error('Failed to create funnel', err);
    }
  };

  const deleteFunnel = async (funnelId: string) => {
    if (!confirm('Are you sure you want to delete this funnel?')) return;
    try {
      await axios.delete(`${API_URL}/api/funnels/${funnelId}`, {
        withCredentials: true,
      });
      fetchFunnels();
    } catch (err) {
      console.error('Failed to delete funnel', err);
    }
  };

  const addStep = () => {
    setNewFunnel({
      ...newFunnel,
      steps: [
        ...newFunnel.steps,
        { name: `Step ${newFunnel.steps.length + 1}`, eventType: 'pageview', pageURL: '', elementSelector: '' },
      ],
    });
  };

  const removeStep = (index: number) => {
    setNewFunnel({
      ...newFunnel,
      steps: newFunnel.steps.filter((_, i) => i !== index),
    });
  };

  const updateStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...newFunnel.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewFunnel({ ...newFunnel, steps: updatedSteps });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };



  const getBarColor = (conversionRate: number) => {
    if (conversionRate >= 70) return '#10b981'; // green
    if (conversionRate >= 40) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200/50 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Funnel Analysis</h1>
              <p className="text-sm text-slate-600 mt-1">Track user journey through conversion funnels</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Funnel
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={selectedFunnel?._id || ''}
                onChange={(e) => {
                  const funnel = funnels.find((f) => f._id === e.target.value);
                  setSelectedFunnel(funnel || null);
                }}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                {funnels.map((funnel) => (
                  <option key={funnel._id} value={funnel._id}>
                    {funnel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            {/* Segment filters */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="">All devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country (e.g., US)"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="UTM source"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={referrerContains}
              onChange={(e) => setReferrerContains(e.target.value)}
              placeholder="Referrer contains"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={pathPrefix}
              onChange={(e) => setPathPrefix(e.target.value)}
              placeholder="Path prefix (e.g., /docs)"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />

            <button
              onClick={() => selectedFunnel && analyzeFunnel(selectedFunnel._id)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {selectedFunnel && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={downloadFunnelCSV}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={downloadFunnelPDF}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => deleteFunnel(selectedFunnel._id)}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedFunnel && funnels.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Funnels Yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first funnel to start tracking user conversion paths
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Your First Funnel
            </button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Entries</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatNumber(metrics.entries)}</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Users who started the funnel</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Completed</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatNumber(metrics.completed)}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Successful conversions</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Conversion Rate</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{metrics.rate}%</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Overall funnel conversion</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Dropoff</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatNumber(metrics.dropoff)}</p>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Users who left the funnel</p>
              </div>
              {/* Lift card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Conversion Lift</p>
                    <p className={`text-3xl font-bold mt-2 ${conversionLift && conversionLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {conversionLift !== null ? `${conversionLift.toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {baselineRate !== null && filteredRate !== null
                    ? `Baseline: ${baselineRate.toFixed(2)}% → Filtered: ${filteredRate.toFixed(2)}%`
                    : 'Apply segment filters to see lift'}
                </p>
              </div>
            </div>

            {/* Funnel Steps */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Funnel Steps</h2>
              {analysisData.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h3>
                  <p className="text-slate-600 mb-4">
                    This funnel doesn't have any data yet. You need to seed the following data:
                  </p>
                  <div className="inline-block text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-blue-600">→</span> Page Views (for pageview events)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-blue-600">→</span> User Events (for click and custom events)
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Go to <strong>Admin → Seed Data Manager</strong> to seed this data
                  </p>
                  <button
                    onClick={() => window.location.href = '/admin/seed-data'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-medium"
                  >
                    Go to Seed Data Manager
                  </button>
                </div>
              ) : (
                <div className="space-y-4">{analysisData.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{step.stepName}</h3>
                          <p className="text-xs text-slate-500">
                            {formatNumber(step.users)} users
                            {step.avgTimeToNext && index < analysisData.length - 1 && (
                              <span className="ml-2">• Avg time: {formatTime(step.avgTimeToNext)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">{step.conversionRate.toFixed(1)}%</p>
                        {step.dropoffRate > 0 && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {step.dropoffRate.toFixed(1)}% dropoff
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ width: `${step.conversionRate}%` }}
                        ></div>
                      </div>
                    </div>
                    {index < analysisData.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDownRight className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}</div>
              )}
            </div>

            {/* Bar Chart */}
            {analysisData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Step Comparison</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analysisData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="stepName" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="users" radius={[8, 8, 0, 0]}>
                      {analysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.conversionRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Funnel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Create New Funnel</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Funnel Name *
                </label>
                <input
                  type="text"
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                  placeholder="e.g., Checkout Flow"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newFunnel.description}
                  onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Funnel Steps *
                  </label>
                  <button
                    onClick={addStep}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Step
                  </button>
                </div>
                <div className="space-y-3">
                  {newFunnel.steps.map((step, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <h4 className="font-semibold text-slate-900">Step {index + 1}</h4>
                        </div>
                        {newFunnel.steps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          placeholder="Step name"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                        />
                        <select
                          value={step.eventType}
                          onChange={(e) => updateStep(index, 'eventType', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                        >
                          <option value="pageview">Page View</option>
                          <option value="click">Click</option>
                          <option value="submit">Form Submit</option>
                          <option value="custom">Custom Event</option>
                        </select>
                        {step.eventType === 'pageview' && (
                          <input
                            type="text"
                            value={step.pageURL || ''}
                            onChange={(e) => updateStep(index, 'pageURL', e.target.value)}
                            placeholder="Page URL (e.g., /checkout)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                          />
                        )}
                        {(step.eventType === 'click' || step.eventType === 'submit') && (
                          <input
                            type="text"
                            value={step.elementSelector || ''}
                            onChange={(e) => updateStep(index, 'elementSelector', e.target.value)}
                            placeholder="Element selector (e.g., .add-to-cart)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={createFunnel}
                disabled={!newFunnel.name || newFunnel.steps.length === 0}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                Create Funnel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default FunnelAnalysis;
