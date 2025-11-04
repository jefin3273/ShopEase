import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  AlertCircle,
  Clock,
  MousePointer2,
  MonitorPlay,
  ArrowLeft
} from 'lucide-react';

interface RecordingEvent {
  type: 'mousemove' | 'click' | 'scroll' | 'resize' | 'input' | 'pageChange';
  timestamp: number;
  data: any;
}

interface Recording {
  sessionId: string;
  userId?: string;
  userName?: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  device?: {
    type?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
  };
  events: RecordingEvent[];
  snapshots: any[];
  consoleLogs: any[];
  networkRequests: any[];
  errors: any[];
  stats?: {
    totalEvents?: number;
    totalClicks?: number;
    totalScrolls?: number;
    totalMoves?: number;
    avgMouseSpeed?: number;
  };
  hasErrors: boolean;
}

const SessionReplayPlayer: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showCursor, setShowCursor] = useState(true);
  const [showClicks, setShowClicks] = useState(true);
  const [showConsole, setShowConsole] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (sessionId) {
      fetchRecording();
    }
  }, [sessionId]);

  const fetchRecording = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/analytics/recordings/${sessionId}`);
      setRecording(response.data.recording);
      setError(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load recording');
    } finally {
      setLoading(false);
    }
  };

  const getDuration = () => {
    if (!recording || !recording.events || recording.events.length === 0) return 0;
    const firstEvent = recording.events[0];
    const lastEvent = recording.events[recording.events.length - 1];
    return (lastEvent.timestamp - firstEvent.timestamp) / 1000; // seconds
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(currentTime + 5, getDuration()));
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(currentTime - 5, 0));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying || !recording || !recording.events) return;

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastUpdateRef.current) / 1000; // seconds
      lastUpdateRef.current = now;

      setCurrentTime((prev) => {
        const newTime = prev + delta * playbackSpeed;
        if (newTime >= getDuration()) {
          setIsPlaying(false);
          return getDuration();
        }
        return newTime;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastUpdateRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, recording]);

  // Update cursor position based on current time
  useEffect(() => {
    if (!recording || !recording.events || !showCursor) return;

    const firstTimestamp = recording.events[0]?.timestamp || 0;
    const targetTimestamp = firstTimestamp + currentTime * 1000;

    // Find the most recent mousemove event
    const mouseMoveEvents = recording.events.filter(e => e.type === 'mousemove');
    let currentEvent = null;

    for (let i = mouseMoveEvents.length - 1; i >= 0; i--) {
      if (mouseMoveEvents[i].timestamp <= targetTimestamp) {
        currentEvent = mouseMoveEvents[i];
        break;
      }
    }

    if (currentEvent && cursorRef.current) {
      const { x, y } = currentEvent.data;
      cursorRef.current.style.left = `${x}px`;
      cursorRef.current.style.top = `${y}px`;
    }
  }, [currentTime, recording, showCursor]);

  const getCurrentEvents = () => {
    if (!recording || !recording.events) return [];

    const firstTimestamp = recording.events[0]?.timestamp || 0;
    const targetTimestamp = firstTimestamp + currentTime * 1000;

    return recording.events.filter(
      e => e.timestamp <= targetTimestamp && e.timestamp >= targetTimestamp - 1000
    );
  };

  const getConsoleLogs = () => {
    if (!recording || !recording.consoleLogs || !showConsole) return [];

    const firstTimestamp = recording.events[0]?.timestamp || 0;
    const targetTimestamp = firstTimestamp + currentTime * 1000;

    return recording.consoleLogs.filter(
      log => log.timestamp <= targetTimestamp
    ).slice(-10); // Last 10 logs
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <MonitorPlay className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading recording...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Recording not found'}</p>
          <button
            onClick={() => navigate('/admin/analytics/recordings')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Recordings
          </button>
        </div>
      </div>
    );
  }

  const duration = getDuration();
  const currentEvents = getCurrentEvents();
  const consoleLogs = getConsoleLogs();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/analytics/recordings')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Replay</h1>
            <p className="text-sm text-gray-500">Session ID: {recording.sessionId}</p>
          </div>
        </div>

        {recording.hasErrors && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">
              {recording.errors?.length || 0} Errors Detected
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Canvas */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div
              ref={canvasRef}
              className="relative bg-gray-900 aspect-video"
              style={{ minHeight: '500px' }}
            >
              {/* Cursor */}
              {showCursor && (
                <div
                  ref={cursorRef}
                  className="absolute w-6 h-6 pointer-events-none transition-all duration-75"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <MousePointer2 className="w-6 h-6 text-red-500 drop-shadow-lg" fill="white" />
                </div>
              )}

              {/* Click Indicators */}
              {showClicks && currentEvents
                .filter(e => e.type === 'click')
                .map((event, idx) => (
                  <div
                    key={idx}
                    className="absolute w-12 h-12 rounded-full bg-red-500 opacity-50 animate-ping pointer-events-none"
                    style={{
                      left: `${event.data.x}px`,
                      top: `${event.data.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}

              {/* Placeholder Screen */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MonitorPlay className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Session Recording Playback</p>
                  <p className="text-sm mt-2">
                    Device: {recording.device?.type || 'Unknown'} • {recording.device?.browser || 'Unknown'} • {recording.device?.os || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-4">
              {/* Timeline */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSkipBack}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={handleSkipForward}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRestart}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-2">
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${playbackSpeed === speed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Options */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCursor(!showCursor)}
                    className={`p-2 rounded-lg transition-colors ${showCursor ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    title="Toggle cursor"
                  >
                    <MousePointer2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowClicks(!showClicks)}
                    className={`p-2 rounded-lg transition-colors ${showClicks ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    title="Toggle click indicators"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-1">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{recording.stats?.totalEvents || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-1">Clicks</p>
              <p className="text-2xl font-bold text-blue-600">{recording.stats?.totalClicks || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-1">Scrolls</p>
              <p className="text-2xl font-bold text-green-600">{recording.stats?.totalScrolls || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-1">Duration</p>
              <p className="text-2xl font-bold text-purple-600">{formatTime(duration)}</p>
            </div>
          </div>
        </div>

        {/* Sidebar - Events & Console */}
        <div className="space-y-4">
          {/* Session Info */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Session Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">User:</span>
                <span className="font-medium">{recording.userName || recording.userId || 'Anonymous'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Device:</span>
                <span className="font-medium">{recording.device?.type || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Browser:</span>
                <span className="font-medium">{recording.device?.browser || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">OS:</span>
                <span className="font-medium">{recording.device?.os || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Resolution:</span>
                <span className="font-medium">{recording.device?.screenResolution || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Started:</span>
                <span className="font-medium">
                  {new Date(recording.startTime).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Console Logs */}
          {showConsole && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Console Logs</h3>
                <button
                  onClick={() => setShowConsole(!showConsole)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {consoleLogs.length === 0 ? (
                  <p className="text-sm text-gray-400">No console logs</p>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-xs font-mono ${log.level === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : log.level === 'warn'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs text-gray-500 mb-1">
                            {formatTime((log.timestamp - recording.events[0]?.timestamp) / 1000)}
                          </p>
                          <p className="break-words">{log.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {recording.hasErrors && recording.errors && recording.errors.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Errors ({recording.errors.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recording.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs"
                  >
                    <p className="font-semibold text-red-700 mb-1">{error.message}</p>
                    {error.stack && (
                      <pre className="text-red-600 overflow-x-auto whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionReplayPlayer;
