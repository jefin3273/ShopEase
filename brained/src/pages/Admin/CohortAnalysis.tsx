import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Plus,
  Trash2,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface CohortCondition {
  field: string;
  operator: string;
  value: string;
}

interface Cohort {
  _id: string;
  name: string;
  description?: string;
  // Backend may return conditions as an array (legacy) OR an object with { events, properties, timeRange }
  // Accept any here and normalize at render-time
  conditions: any;
  projectId: string;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface RetentionData {
  week: string;
  retention: number;
  users: number;
}

interface BehaviorData {
  metric: string;
  value: number;
  trend: number;
}

const CohortAnalysis: React.FC = () => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [behaviorData, setBehaviorData] = useState<BehaviorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  // Create cohort form state
  const [newCohort, setNewCohort] = useState({
    name: '',
    description: '',
    conditions: [{ field: 'device.type', operator: 'equals', value: '' }],
  });

  useEffect(() => {
    fetchCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      analyzeCohort(selectedCohort._id);
    }
  }, [selectedCohort, dateRange]);

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/cohorts`, {
        withCredentials: true,
      });
      setCohorts(response.data.cohorts || []);
      if (response.data.cohorts && response.data.cohorts.length > 0) {
        setSelectedCohort(response.data.cohorts[0]);
      }
    } catch (err) {
      console.error('Failed to fetch cohorts', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCohort = async (cohortId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/cohorts/${cohortId}/analyze?dateRange=${dateRange}`,
        { withCredentials: true }
      );
      setRetentionData(response.data.retention || []);
      setBehaviorData(response.data.behavior || []);
    } catch (err) {
      console.error('Failed to analyze cohort', err);
    }
  };

  const createCohort = async () => {
    try {
      await axios.post(
        `${API_URL}/api/cohorts`,
        { ...newCohort, projectId: 'default' },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setNewCohort({
        name: '',
        description: '',
        conditions: [{ field: 'device.type', operator: 'equals', value: '' }],
      });
      fetchCohorts();
    } catch (err) {
      console.error('Failed to create cohort', err);
    }
  };

  const deleteCohort = async (cohortId: string) => {
    if (!confirm('Are you sure you want to delete this cohort?')) return;
    try {
      await axios.delete(`${API_URL}/api/cohorts/${cohortId}`, {
        withCredentials: true,
      });
      fetchCohorts();
    } catch (err) {
      console.error('Failed to delete cohort', err);
    }
  };

  const addCondition = () => {
    setNewCohort({
      ...newCohort,
      conditions: [...newCohort.conditions, { field: 'device.type', operator: 'equals', value: '' }],
    });
  };

  const removeCondition = (index: number) => {
    setNewCohort({
      ...newCohort,
      conditions: newCohort.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const updatedConditions = [...newCohort.conditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    setNewCohort({ ...newCohort, conditions: updatedConditions });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const exportData = () => {
    const data = {
      cohort: selectedCohort,
      retention: retentionData,
      behavior: behaviorData,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohort-${selectedCohort?.name}-${new Date().toISOString()}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Cohort Analysis</h1>
            <p className="text-lg text-gray-600">
              Segment users and analyze their behavior over time
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Cohort
          </button>
        </div>
      </div>

      {/* Cohort Selector */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={selectedCohort?._id || ''}
            onChange={(e) => {
              const cohort = cohorts.find((c) => c._id === e.target.value);
              setSelectedCohort(cohort || null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {cohorts.map((cohort) => (
              <option key={cohort._id} value={cohort._id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <button
          onClick={() => selectedCohort && analyzeCohort(selectedCohort._id)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        {selectedCohort && (
          <>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => deleteCohort(selectedCohort._id)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete Cohort
            </button>
          </>
        )}
      </div>

      {!selectedCohort && cohorts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cohorts Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first cohort to segment users and analyze their behavior
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Cohort
          </button>
        </div>
      ) : (
        <>
          {/* Cohort Info Card */}
          {selectedCohort && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCohort.name}</h2>
                  {selectedCohort.description && (
                    <p className="text-gray-600 mb-4">{selectedCohort.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const c = selectedCohort.conditions;
                      const chips: string[] = [];
                      if (Array.isArray(c)) {
                        // Legacy shape: array of { field, operator, value }
                        for (const cond of c as CohortCondition[]) {
                          chips.push(`${cond.field} ${cond.operator} "${cond.value}"`);
                        }
                      } else if (c && typeof c === 'object') {
                        // New shape: { properties: [], events: [], timeRange }
                        if (Array.isArray(c.properties)) {
                          for (const p of c.properties) {
                            const key = p.key ?? 'prop';
                            chips.push(`${key} ${p.operator} "${p.value}"`);
                          }
                        }
                        if (Array.isArray(c.events)) {
                          for (const e of c.events) {
                            const evt = `${e.eventType || 'event'}:${e.eventName || ''}`.trim();
                            const val = e.value !== undefined && e.value !== null ? ` "${e.value}"` : '';
                            chips.push(`[${evt}] ${e.operator}${val}`);
                          }
                        }
                        if (c.timeRange) {
                          if (c.timeRange.relative) chips.push(`time ${c.timeRange.relative}`);
                          else if (c.timeRange.from || c.timeRange.to) {
                            const from = c.timeRange.from ? new Date(c.timeRange.from).toLocaleDateString() : '';
                            const to = c.timeRange.to ? new Date(c.timeRange.to).toLocaleDateString() : '';
                            chips.push(`time ${from}${to ? ' → ' + to : ''}`);
                          }
                        }
                      }
                      return chips.length > 0 ? (
                        chips.map((label, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No conditions defined</span>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatNumber(selectedCohort.userCount || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Behavior Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {behaviorData.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm font-medium text-gray-600 mb-2">{metric.metric}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatNumber(metric.value)}
                </p>
                {metric.trend !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      metric.trend > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.trend > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(metric.trend).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Retention Chart */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Retention Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={retentionData}>
                <defs>
                  <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="retention"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRetention)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* User Count Over Time */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Users</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Create Cohort Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Cohort</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cohort Name *
                </label>
                <input
                  type="text"
                  value={newCohort.name}
                  onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })}
                  placeholder="e.g., Mobile Users from US"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newCohort.description}
                  onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Conditions *
                  </label>
                  <button
                    onClick={addCondition}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </button>
                </div>
                <div className="space-y-4">
                  {newCohort.conditions.map((condition, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Condition {index + 1}</h4>
                        {newCohort.conditions.length > 1 && (
                          <button
                            onClick={() => removeCondition(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(index, 'field', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="device.type">Device Type</option>
                          <option value="device.browser">Browser</option>
                          <option value="device.os">Operating System</option>
                          <option value="location.country">Country</option>
                          <option value="location.city">City</option>
                          <option value="referrer">Referrer</option>
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="starts_with">Starts With</option>
                        </select>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCohort}
                disabled={!newCohort.name || newCohort.conditions.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Cohort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CohortAnalysis;
