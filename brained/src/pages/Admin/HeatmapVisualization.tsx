import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  MousePointer2,
  ScrollText,
  Activity,
  RefreshCw,
  Download,
  Eye,
  Filter
} from 'lucide-react';

interface HeatmapPoint {
  x: number;
  y: number;
  vw: number;
  vh: number;
  intensity: number;
}

type HeatmapType = 'click' | 'scroll' | 'hover';

const HeatmapVisualization: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageURL, setPageURL] = useState('');
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('click');
  const [showOverlay, setShowOverlay] = useState(true);
  const [intensity, setIntensity] = useState(0.6);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heatmapData.length > 0) {
      drawHeatmap();
    }
  }, [heatmapData, intensity, showOverlay]);

  const fetchHeatmapData = async () => {
    if (!pageURL) {
      alert('Please enter a page URL');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/analytics/heatmap', {
        params: {
          projectId: 'default',
          pageURL,
          eventType: heatmapType,
        },
      });

      setHeatmapData(response.data.heatmapData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Failed to fetch heatmap data', err);
      alert(error.response?.data?.message || 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = () => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container size
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay || heatmapData.length === 0) return;

    // Find max intensity for normalization
    const maxIntensity = Math.max(...heatmapData.map(p => p.intensity || 1));

    // Draw each point
    heatmapData.forEach(point => {
      // Convert viewport percentage to canvas pixels
      const x = (point.vw / 100) * canvas.width;
      const y = (point.vh / 100) * canvas.height;

      // Normalize intensity
      const normalizedIntensity = (point.intensity || 1) / maxIntensity;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);

      // Color based on intensity and heatmap type
      const alpha = normalizedIntensity * intensity;
      if (heatmapType === 'click') {
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
      } else if (heatmapType === 'scroll') {
        gradient.addColorStop(0, `rgba(0, 100, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(0, 200, 255, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(100, 255, 255, 0)');
      } else {
        gradient.addColorStop(0, `rgba(100, 0, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(200, 100, 255, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 200, 255, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 50, y - 50, 100, 100);
    });
  };

  const exportHeatmap = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `heatmap-${heatmapType}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const getHeatmapIcon = () => {
    switch (heatmapType) {
      case 'click':
        return <MousePointer2 className="w-5 h-5" />;
      case 'scroll':
        return <ScrollText className="w-5 h-5" />;
      case 'hover':
        return <Activity className="w-5 h-5" />;
    }
  };

  const getHeatmapColor = () => {
    switch (heatmapType) {
      case 'click':
        return 'from-red-500 to-orange-500';
      case 'scroll':
        return 'from-blue-500 to-cyan-500';
      case 'hover':
        return 'from-purple-500 to-pink-500';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Heatmap Visualization</h1>
        <p className="text-gray-600">Visualize user interactions with click, scroll, and hover heatmaps</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pageURL}
                onChange={(e) => setPageURL(e.target.value)}
                placeholder="e.g., /products or https://example.com/products"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={fetchHeatmapData}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Heatmap Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heatmap Type
            </label>
            <div className="flex gap-2">
              {(['click', 'scroll', 'hover'] as HeatmapType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setHeatmapType(type)}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${heatmapType === type
                      ? `bg-gradient-to-r ${getHeatmapColor()} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type === 'click' && <MousePointer2 className="w-5 h-5" />}
                  {type === 'scroll' && <ScrollText className="w-5 h-5" />}
                  {type === 'hover' && <Activity className="w-5 h-5" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)} Heatmap
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={(e) => setShowOverlay(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Show Overlay</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Intensity:</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-gray-600">{(intensity * 100).toFixed(0)}%</span>
              </div>
            </div>

            {heatmapData.length > 0 && (
              <button
                onClick={exportHeatmap}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PNG
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {heatmapData.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className={`w-12 h-12 bg-gradient-to-r ${getHeatmapColor()} rounded-lg flex items-center justify-center mb-3`}>
              {getHeatmapIcon()}
            </div>
            <p className="text-sm text-gray-500 mb-1">Total {heatmapType} Events</p>
            <p className="text-2xl font-bold text-gray-900">{heatmapData.reduce((sum, p) => sum + (p.intensity || 1), 0)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Unique Points</p>
            <p className="text-2xl font-bold text-blue-600">{heatmapData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Peak Intensity</p>
            <p className="text-2xl font-bold text-orange-600">
              {Math.max(...heatmapData.map(p => p.intensity || 1))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Avg Intensity</p>
            <p className="text-2xl font-bold text-green-600">
              {(heatmapData.reduce((sum, p) => sum + (p.intensity || 1), 0) / heatmapData.length).toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Heatmap Canvas */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {getHeatmapIcon()}
            <span className="font-medium">
              {heatmapType.charAt(0).toUpperCase() + heatmapType.slice(1)} Heatmap
              {pageURL && ` - ${pageURL}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Filter className="w-4 h-4" />
              <span>
                {heatmapData.length} point{heatmapData.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative bg-gray-100"
          style={{ minHeight: '600px' }}
        >
          {/* Canvas for heatmap overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Placeholder content */}
          {heatmapData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`w-20 h-20 bg-gradient-to-r ${getHeatmapColor()} rounded-full flex items-center justify-center mx-auto mb-4 opacity-20`}>
                  {getHeatmapIcon()}
                </div>
                <p className="text-gray-400 text-lg mb-2">No heatmap data</p>
                <p className="text-sm text-gray-400">Enter a page URL and click Generate to visualize user interactions</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm p-8 border-2 border-dashed border-gray-300">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Page Content Preview</h3>
                <p className="text-gray-500 mb-4">
                  This is where your actual page content would be displayed. The heatmap overlay shows where users {heatmapType} most frequently.
                </p>
                <div className="space-y-4">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-100 rounded"></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-48 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {heatmapData.length > 0 && showOverlay && (
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Intensity:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Low</span>
                  <div className={`w-32 h-4 rounded bg-gradient-to-r ${getHeatmapColor()}`}></div>
                  <span className="text-xs text-gray-500">High</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Warmer colors indicate higher user activity
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapVisualization;
