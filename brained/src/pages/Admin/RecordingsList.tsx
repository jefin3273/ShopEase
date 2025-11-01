import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Play,
  AlertCircle,
  Clock,
  MousePointer2,
  MonitorPlay,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Recording {
  sessionId: string;
  userId?: string;
  startTime: Date;
  duration: number;
  device: {
    type: string;
    browser: string;
    os: string;
  };
  stats: {
    totalEvents: number;
    totalClicks: number;
    totalScrolls: number;
  };
  hasErrors: boolean;
}

const RecordingsList: React.FC = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterErrors, setFilterErrors] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');

  useEffect(() => {
    fetchRecordings();
  }, [filterErrors, searchUserId]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (filterErrors) params.hasErrors = 'true';
      if (searchUserId) params.userId = searchUserId;

      const response = await axios.get(`${API_URL}/api/analytics/recordings`, {
        params,
        withCredentials: true,
      });
      setRecordings(response.data.recordings);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Recordings</h1>
        <p className="text-gray-600">Watch user session replays with cursor movements and interactions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <button
            onClick={() => setFilterErrors(!filterErrors)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterErrors
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Errors Only
          </button>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by User ID..."
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={fetchRecordings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Recordings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <MonitorPlay className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading recordings...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      ) : recordings.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <MonitorPlay className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No recordings found</p>
            <p className="text-sm text-gray-400">Recordings will appear here once users start visiting your site</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((recording) => (
            <div
              key={recording.sessionId}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-blue-300 overflow-hidden group"
              onClick={() => navigate(`/admin/analytics/recordings/${recording.sessionId}`)}
            >
              {/* Preview Area */}
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 aspect-video flex items-center justify-center">
                <MonitorPlay className="w-16 h-16 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-3 right-3">
                  {recording.hasErrors && (
                    <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Errors
                    </div>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 px-3 py-1 rounded-full text-white text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatDuration(recording.duration / 1000)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                      {recording.userId || 'Anonymous User'}
                    </h3>
                    <p className="text-xs text-gray-500">{formatDate(recording.startTime)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/analytics/recordings/${recording.sessionId}`);
                    }}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Events</p>
                    <p className="text-sm font-bold text-gray-900">{recording.stats.totalEvents}</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Clicks</p>
                    <p className="text-sm font-bold text-blue-600">{recording.stats.totalClicks}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Scrolls</p>
                    <p className="text-sm font-bold text-green-600">{recording.stats.totalScrolls}</p>
                  </div>
                </div>

                {/* Device Info */}
                <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <MousePointer2 className="w-4 h-4" />
                  <span>{recording.device.type} • {recording.device.browser} • {recording.device.os}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordingsList;
