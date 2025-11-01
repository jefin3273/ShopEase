import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import trackingClient from '../../services/trackingClient';
import api from '../../services/api';

const AdminLayout: React.FC = () => {
  // local recording control component placed here so it has access to UI state
  const RecordingControl: React.FC = () => {
    const [isRec, setIsRec] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    // load current server flag
    React.useEffect(() => {
      api.get('/api/analytics/recording')
        .then((r) => setIsRec(!!r.data.enabled))
        .catch(() => { });
    }, []);

    const toggle = async () => {
      setLoading(true);
      try {
        const res = await api.post('/api/analytics/recording', { enabled: !isRec });
        setIsRec(!!res.data.enabled);
        if (res.data.enabled) trackingClient.startRecording(); else trackingClient.stopRecording();
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    return (
      <div className="flex items-center gap-2">
        <button disabled={loading} onClick={toggle} className={`px-3 py-1 rounded ${isRec ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} disabled:opacity-60`}>
          {isRec ? 'Stop Recording' : 'Start Recording'}
        </button>
        <span className="text-xs text-gray-500">{isRec ? 'Recording active (global)' : 'Recorder idle'}</span>
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-4 gap-6">
        <aside className="col-span-1 bg-white rounded-lg p-4 shadow">
          <h3 className="font-semibold text-lg mb-4 text-gray-900">Admin Panel</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/admin/dashboard" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium">
                📊 Dashboard
              </Link>
            </li>
            <li className="pt-3 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase px-3">Analytics</p>
            </li>
            <li>
              <Link to="/admin/analytics/overview" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                📈 Overview
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics/recordings" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                🎬 Session Recordings
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics/heatmap" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                🎯 Heatmaps
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics/performance" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                ⚡ Performance
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics/funnels" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                🔄 Funnel Analysis
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics/cohorts" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                👥 Cohort Analysis
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics/experiments" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                🧪 A/B Testing
              </Link>
            </li>
            <li>
              <Link to="/admin/analytics" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                📊 Events & Metrics
              </Link>
            </li>
            <li className="pt-3 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase px-3">Management</p>
            </li>
            <li>
              <Link to="/admin/products" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                � Products
              </Link>
            </li>
            <li>
              <Link to="/admin/tracking" className="block p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                🔗 Tracking Setup
              </Link>
            </li>
            <li className="pt-4">
              <div className="border-t pt-4">
                <RecordingControl />
              </div>
            </li>
          </ul>
        </aside>
        <main className="col-span-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
