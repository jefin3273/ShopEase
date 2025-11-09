import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Replayer, unpack } from 'rrweb';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  MousePointer2,
  ScrollText,
  Activity,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  Download,
  Share2,
  Filter,
  Search,
  Eye,
  EyeOff,
  BarChart3,
  FileDown,
  Link2,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  timestamp?: Date;
}

interface AvailablePage {
  pageURL: string;
  sessionCount: number;
  heatmapTypes: Record<string, number>;
  hasData: boolean;
}

interface HeatmapMetadata {
  totalInteractions: number;
  uniqueUsers: number;
  avgTimeOnPage?: number;
  sessionCount: number;
  lastUpdated?: Date;
  viewport?: {
    width: number;
    height: number;
  };
}

type HeatmapType = 'click' | 'scroll' | 'hover' | 'move';
type DeviceType = 'all' | 'desktop' | 'mobile' | 'tablet';

const HeatmapAnalytics: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
  const [pageURL, setPageURL] = useState('');
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('click');
  const [deviceType, setDeviceType] = useState<DeviceType>('all');
  const [showOverlay, setShowOverlay] = useState(true);
  const [intensity, setIntensity] = useState([70]);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [metadata, setMetadata] = useState<HeatmapMetadata | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedPageSearch, setSelectedPageSearch] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayerContainerRef = useRef<HTMLDivElement>(null);
  const heatmapWrapperRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);

  useEffect(() => {
    fetchAvailablePages();
  }, []);

  useEffect(() => {
    if (pageURL) {
      fetchHeatmapData();
    }
  }, [heatmapType, deviceType, pageURL, dateRange]);

  useEffect(() => {
    if (snapshotReady && heatmapData.length > 0 && showOverlay) {
      drawHeatmap();
    }
  }, [heatmapData, intensity, showOverlay, snapshotReady]);

  useEffect(() => {
    if (snapshotReady) {
      const handleResize = () => requestAnimationFrame(() => drawHeatmap());
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [snapshotReady, heatmapData, intensity, showOverlay]);

  const fetchAvailablePages = async () => {
    try {
      setLoadingPages(true);
      const res = await api.get('/api/tracking/sessions/pages/available');
      const pages = res.data.pages || [];
      setAvailablePages(pages);
      
      // Set first page with data as default
      const pageWithData = pages.find((p: AvailablePage) => p.hasData);
      if (pageWithData && !pageURL) {
        setPageURL(pageWithData.pageURL);
      }
    } catch (error: any) {
      console.error('Error fetching available pages:', error);
      toast.error('Failed to load available pages');
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchHeatmapData = async () => {
    if (!pageURL) return;

    try {
      setLoading(true);
      const params: any = {
        pageURL,
        type: heatmapType,
        startDate: dateRange.start,
        endDate: dateRange.end,
      };

      if (deviceType !== 'all') {
        params.device = deviceType;
      }

      const res = await api.get('/api/tracking/heatmap', { params });
      const points = res.data.heatmapData || [];
      const meta = res.data.metadata || {};

      setHeatmapData(points);
      setMetadata(meta);

      // Fetch and render page snapshot
      await fetchPageSnapshot();

      toast.success(`Loaded ${points.length} data points`);
    } catch (error: any) {
      console.error('Error fetching heatmap data:', error);
      toast.error('Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPageSnapshot = async () => {
    try {
      // Get session recordings for this page
      const sessionParams: any = {
        urlContains: pageURL,
        limit: 1,
        isComplete: 'true',
      };

      const response = await api.get('/api/tracking/sessions', { params: sessionParams });
      const sessions = response.data.sessions || [];

      if (sessions.length === 0) {
        // No session recording, but we can still show heatmap on a blank canvas
        toast.info('Loading page snapshot...');
        setSnapshotReady(true);
        setTimeout(async () => {
          await drawHeatmapWithoutSnapshot(pageURL);
        }, 100);
        return;
      }

      const session = sessions[0];
      if (!session.events || session.events.length === 0) {
        toast.info('Loading page snapshot...');
        setSnapshotReady(true);
        setTimeout(async () => {
          await drawHeatmapWithoutSnapshot(pageURL);
        }, 100);
        return;
      }

      // Unpack and prepare events for rrweb
      const events: any[] = [];
      session.events.forEach((raw: any) => {
        try {
          if (typeof raw === 'string') {
            const unpacked = unpack(raw);
            if (Array.isArray(unpacked)) {
              events.push(...unpacked);
            } else if (unpacked && typeof unpacked === 'object') {
              Object.keys(unpacked)
                .filter((k) => !isNaN(Number(k)))
                .forEach((k) => events.push((unpacked as any)[k]));
            }
          } else if (raw && typeof raw === 'object') {
            if (raw.type !== undefined) {
              events.push(raw);
            } else {
              Object.keys(raw)
                .filter((k) => !isNaN(Number(k)))
                .forEach((k) => events.push(raw[k]));
            }
          }
        } catch (e) {
          console.warn('Failed to unpack event:', e);
        }
      });

      events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      if (events.length === 0) {
        setSnapshotReady(false);
        return;
      }

      // Initialize rrweb replayer
      if (replayerContainerRef.current) {
        if (replayerRef.current) {
          try {
            replayerRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying previous replayer:', e);
          }
        }

        replayerRef.current = new Replayer(events, {
          root: replayerContainerRef.current,
          mouseTail: false,
          speed: 1,
          skipInactive: false,
          showWarning: false,
          showDebug: false,
        });

        replayerRef.current.pause(0);

        setTimeout(() => {
          setSnapshotReady(true);
          drawHeatmap();
        }, 200);
      }
    } catch (error: any) {
      console.error('Error fetching page snapshot:', error);
      setSnapshotReady(false);
    }
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    const container = replayerContainerRef.current;

    if (!canvas || !container || !heatmapData.length) return;

    const wrapper = container.querySelector('.replayer-wrapper') as HTMLElement;
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    if (!wrapper) return;

    // Get natural dimensions from iframe
    let naturalW = 0;
    let naturalH = 0;

    if (iframe) {
      naturalW = parseInt(iframe.getAttribute('width') || '0');
      naturalH = parseInt(iframe.getAttribute('height') || '0');

      if (!naturalW || !naturalH) {
        try {
          const doc = iframe.contentWindow?.document;
          if (doc) {
            naturalW = doc.documentElement.scrollWidth || doc.documentElement.clientWidth;
            naturalH = doc.documentElement.scrollHeight || doc.documentElement.clientHeight;
          }
        } catch (e) {
          // Cross-origin or not ready
        }
      }
    }

    // Use metadata viewport if available
    if (metadata?.viewport) {
      naturalW = metadata.viewport.width || naturalW;
      naturalH = metadata.viewport.height || naturalH;
    }

    // Fallback to reasonable defaults
    if (!naturalW) naturalW = 1280;
    if (!naturalH) naturalH = 800;

    const displayRect = wrapper.getBoundingClientRect();
    canvas.width = displayRect.width;
    canvas.height = displayRect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay) return;

    const scaleX = displayRect.width / naturalW;
    const scaleY = displayRect.height / naturalH;

    const maxVal = Math.max(...heatmapData.map((p) => p.value || 1), 1);
    const intensityValue = intensity[0] / 100;

    // Draw heatmap points
    for (const point of heatmapData) {
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      const normalized = (point.value || 1) / maxVal;
      const radius = 40 + normalized * 30;
      const alpha = normalized * intensityValue;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // Color scheme based on heatmap type
      switch (heatmapType) {
        case 'click':
          gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
          break;
        case 'scroll':
          gradient.addColorStop(0, `rgba(0, 100, 255, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(0, 200, 255, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(100, 255, 255, 0)');
          break;
        case 'hover':
        case 'move':
          gradient.addColorStop(0, `rgba(100, 0, 255, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(200, 100, 255, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 200, 255, 0)');
          break;
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  };

  const drawHeatmapWithoutSnapshot = async (pageUrl: string) => {
    const canvas = canvasRef.current;
    const container = replayerContainerRef.current;

    if (!canvas || !container || !heatmapData.length) {
      console.log('❌ Canvas check:', { 
        canvas: !!canvas, 
        container: !!container, 
        dataLength: heatmapData.length 
      });
      return;
    }

    // Use viewport from metadata or default
    const viewportWidth = metadata?.viewport?.width || 1280;
    const viewportHeight = metadata?.viewport?.height || 800;

    // Set canvas size
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;

    // Position canvas
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.maxWidth = '100%';
    canvas.style.objectFit = 'contain';

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Could not get canvas context');
      return;
    }

    console.log('🎨 Drawing heatmap for:', pageUrl);
    console.log('� Data points:', heatmapData.length);
    console.log('📐 Canvas size:', viewportWidth, 'x', viewportHeight);

    // Draw a clean white background with subtle page representation
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a subtle browser chrome at the top
    ctx.fillStyle = '#f1f3f4';
    ctx.fillRect(0, 0, canvas.width, 50);
    
    // Draw address bar
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(60, 15, canvas.width - 120, 20, 10);
    ctx.fill();
    
    // Draw URL in address bar
    ctx.fillStyle = '#5f6368';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(pageUrl, 70, 30);

    // Draw page content area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 50, canvas.width, canvas.height - 50);

    // Draw subtle grid to show page structure
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 100;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 50; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw dimension labels
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${viewportWidth}px`, canvas.width - 10, canvas.height - 10);
    ctx.textAlign = 'left';
    ctx.fillText(`${viewportHeight}px`, 10, canvas.height - 10);

    // Draw info text
    ctx.fillStyle = '#dadce0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Heatmap Overlay - No Session Recording Available', canvas.width / 2, canvas.height / 2);

    console.log('✅ Background rendered');

    if (!showOverlay) {
      console.log('⚠️ Overlay hidden by user');
      return;
    }

    console.log('🎯 Drawing heatmap points...');

    // No scaling needed - canvas matches viewport dimensions
    const maxVal = Math.max(...heatmapData.map((p) => p.value || 1), 1);
    const intensityValue = intensity[0] / 100;

    console.log('📊 Max value:', maxVal, 'Intensity:', intensityValue);

    // Draw heatmap points
    let pointsDrawn = 0;
    for (const point of heatmapData) {
      const x = point.x;
      const y = point.y;
      const normalized = (point.value || 1) / maxVal;
      const radius = 40 + normalized * 30;
      const alpha = normalized * intensityValue;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // Color scheme based on heatmap type
      switch (heatmapType) {
        case 'click':
          gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
          break;
        case 'scroll':
          gradient.addColorStop(0, `rgba(0, 100, 255, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(0, 200, 255, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(100, 255, 255, 0)');
          break;
        case 'hover':
        case 'move':
          gradient.addColorStop(0, `rgba(100, 0, 255, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(200, 100, 255, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 200, 255, 0)');
          break;
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      pointsDrawn++;
    }
    
    console.log(`✅ Drew ${pointsDrawn} heatmap points`);
  };

  const handleRegenerate = async () => {
    if (!pageURL) return;

    try {
      setLoading(true);
      const params: any = {
        pageURL,
        type: heatmapType,
        startDate: dateRange.start,
        endDate: dateRange.end,
        regenerate: 'true',
      };

      if (deviceType !== 'all') {
        params.device = deviceType;
      }

      const res = await api.get('/api/tracking/heatmap', { params });
      const points = res.data.heatmapData || [];
      const meta = res.data.metadata || {};

      setHeatmapData(points);
      setMetadata(meta);

      if (snapshotReady) {
        drawHeatmap();
      }

      toast.success('Heatmap regenerated successfully');
    } catch (error: any) {
      console.error('Error regenerating heatmap:', error);
      toast.error('Failed to regenerate heatmap');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!heatmapWrapperRef.current) return;

    try {
      setExporting(true);
      toast.info('Generating PDF...');

      const element = heatmapWrapperRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      const fileName = `heatmap-${heatmapType}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success('PDF exported successfully');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToImage = async () => {
    if (!heatmapWrapperRef.current) return;

    try {
      setExporting(true);
      toast.info('Generating image...');

      const element = heatmapWrapperRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `heatmap-${heatmapType}-${new Date().toISOString().split('T')[0]}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Image exported successfully');
        }
      });
    } catch (error: any) {
      console.error('Error exporting image:', error);
      toast.error('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    try {
      if (!heatmapData.length) {
        toast.error('No data to export');
        return;
      }

      const headers = ['X', 'Y', 'Value', 'Timestamp'];
      const rows = heatmapData.map((point) => [
        point.x,
        point.y,
        point.value,
        point.timestamp ? new Date(point.timestamp).toISOString() : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heatmap-data-${heatmapType}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const generateShareLink = () => {
    const params = new URLSearchParams({
      page: pageURL,
      type: heatmapType,
      device: deviceType,
      start: dateRange.start,
      end: dateRange.end,
    });

    const link = `${window.location.origin}/admin/analytics/heatmap?${params.toString()}`;
    setShareLink(link);
    setShareDialogOpen(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard');
  };

  const filteredPages = availablePages.filter((page) =>
    page.pageURL.toLowerCase().includes(selectedPageSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Heatmap Analytics</h1>
            <p className="text-sm text-slate-600 mt-1">
              Visualize user interactions with click, scroll, hover, and move heatmaps
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={generateShareLink}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Heatmap</DialogTitle>
                  <DialogDescription>
                    Choose an export format for your heatmap visualization
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <Button
                    onClick={exportToPDF}
                    disabled={exporting || !snapshotReady}
                    className="justify-start"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export as PDF
                  </Button>
                  <Button
                    onClick={exportToImage}
                    disabled={exporting || !snapshotReady}
                    className="justify-start"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Export as PNG Image
                  </Button>
                  <Button
                    onClick={exportToCSV}
                    disabled={!heatmapData.length}
                    className="justify-start"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export Data as CSV
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Metadata Stats */}
        {metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{metadata.totalInteractions.toLocaleString()}</div>
                <p className="text-xs text-slate-600">Total Interactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{metadata.uniqueUsers}</div>
                <p className="text-xs text-slate-600">Unique Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{metadata.sessionCount}</div>
                <p className="text-xs text-slate-600">Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{heatmapData.length}</div>
                <p className="text-xs text-slate-600">Data Points</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls Sidebar */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Page Selection */}
              <div>
                <Label>Page URL</Label>
                <div className="space-y-2 mt-2">
                  <Input
                    placeholder="Search pages..."
                    value={selectedPageSearch}
                    onChange={(e) => setSelectedPageSearch(e.target.value)}
                    className="w-full"
                  />
                  <Select value={pageURL} onValueChange={setPageURL}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a page..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPages ? (
                        <SelectItem value="loading" disabled>
                          Loading pages...
                        </SelectItem>
                      ) : filteredPages.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No pages found
                        </SelectItem>
                      ) : (
                        filteredPages.map((page) => (
                          <SelectItem key={page.pageURL} value={page.pageURL}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate max-w-[300px]">{page.pageURL}</span>
                              <Badge variant="secondary" className="ml-2">
                                {page.sessionCount}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Heatmap Type */}
              <div>
                <Label>Heatmap Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['click', 'scroll', 'hover', 'move'] as HeatmapType[]).map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={heatmapType === type ? 'default' : 'outline'}
                      onClick={() => setHeatmapType(type)}
                      className="capitalize"
                    >
                      {type === 'click' && <MousePointer2 className="w-3 h-3 mr-1" />}
                      {type === 'scroll' && <ScrollText className="w-3 h-3 mr-1" />}
                      {type === 'hover' && <Activity className="w-3 h-3 mr-1" />}
                      {type === 'move' && <Activity className="w-3 h-3 mr-1" />}
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Device Type */}
              <div>
                <Label>Device</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['all', 'desktop', 'mobile', 'tablet'] as DeviceType[]).map((device) => (
                    <Button
                      key={device}
                      size="sm"
                      variant={deviceType === device ? 'default' : 'outline'}
                      onClick={() => setDeviceType(device)}
                      className="capitalize"
                    >
                      {device === 'desktop' && <Monitor className="w-3 h-3 mr-1" />}
                      {device === 'mobile' && <Smartphone className="w-3 h-3 mr-1" />}
                      {device === 'tablet' && <Tablet className="w-3 h-3 mr-1" />}
                      {device}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <Label>Date Range</Label>
                <div className="space-y-2 mt-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>

              {/* Intensity */}
              <div>
                <Label>Intensity ({intensity[0]}%)</Label>
                <Slider
                  value={intensity}
                  onValueChange={setIntensity}
                  min={10}
                  max={100}
                  step={10}
                  className="mt-2"
                />
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <Button onClick={handleRegenerate} className="w-full" disabled={loading || !pageURL}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  onClick={() => setShowOverlay(!showOverlay)}
                  variant="outline"
                  className="w-full"
                >
                  {showOverlay ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Overlay
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show Overlay
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Color Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Intensity</div>
                  <div className="h-4 rounded bg-gradient-to-r from-blue-200 via-yellow-300 to-red-600" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {heatmapType === 'click' && 'Red areas show where users clicked most'}
                  {heatmapType === 'scroll' && 'Blue areas show scroll activity'}
                  {heatmapType === 'hover' && 'Purple areas show hover patterns'}
                  {heatmapType === 'move' && 'Purple areas show mouse movement'}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Heatmap Display */}
        <main className="col-span-12 lg:col-span-9">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Heatmap Visualization</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {pageURL || 'Select a page to view heatmap'}
                  </CardDescription>
                </div>
                {metadata?.lastUpdated && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Updated {new Date(metadata.lastUpdated).toLocaleString()}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={heatmapWrapperRef}
                className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 overflow-hidden"
                style={{ minHeight: '600px' }}
              >
                {/* Replayer Container */}
                <div ref={replayerContainerRef} className="absolute inset-0" />

                {/* Heatmap Canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ mixBlendMode: 'multiply' }}
                />

                {/* Loading State */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-600">Loading heatmap data...</p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !pageURL && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Page</h3>
                      <p className="text-sm text-slate-600">
                        Choose a page from the sidebar to view its heatmap
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Points Summary */}
              {heatmapData.length > 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">
                        {heatmapData.length.toLocaleString()} data points
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Peak intensity: {Math.max(...heatmapData.map((p) => p.value))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Heatmap</DialogTitle>
            <DialogDescription>
              Copy this link to share the current heatmap view with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button onClick={copyShareLink}>
                <Link2 className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Anyone with this link can view the heatmap with the current settings
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HeatmapAnalytics;
