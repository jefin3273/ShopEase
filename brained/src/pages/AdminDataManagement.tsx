import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Database, Activity, MousePointer, Video, HardDrive, Zap, Package, Users } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

interface DataStats {
  sessions: number;
  interactions: number;
  heatmapData: number;
}

interface SeedStats {
  seeded: {
    products: number;
  };
  totals: {
    products: number;
    users: number;
    admins: number;
    orders: number;
  };
  analytics: {
    sessionRecordings: number;
    interactions: number;
    heatmaps: number;
    sessions: number;
    pageViews: number;
    userEvents: number;
    eventAnalytics: number;
    performanceMetrics: number;
    funnels: number;
    experiments: number;
    cohorts: number;
    featureFlags: number;
  };
}

interface Session {
  _id: string;
  sessionId: string;
  userId?: string;
  metadata: {
    url: string;
    title: string;
    device?: {
      type: string;
    };
  };
  startedAt: string;
  completedAt?: string;
  events: any[];
}



export default function AdminDataManagement() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DataStats>({ sessions: 0, interactions: 0, heatmapData: 0 });
  const [seedStats, setSeedStats] = useState<SeedStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Product seeding dialog state
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Electronics', 'Wearables', 'Apparel', 'Footwear']);

  // Analytics detail dialog state
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<any[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryLimit] = useState(50);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [jsonViewMode, setJsonViewMode] = useState<'raw' | 'tree'>('tree');

  const truncate = (val: any, n = 80) => {
    if (val == null) return '—';
    const s = typeof val === 'string' ? val : JSON.stringify(val);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  const getCategoryColumns = (category: string | null) => {
    switch (category) {
      case 'sessions':
        return { col1: 'Session ID', col2: 'User ID', col3: 'Started' };
      case 'sessionRecordings':
        return { col1: 'Session ID', col2: 'Entry URL', col3: 'Started' };
      case 'pageViews':
        return { col1: 'URL', col2: 'Referrer', col3: 'Visited' };
      case 'userEvents':
        return { col1: 'Event Name', col2: 'Properties', col3: 'Timestamp' };
      case 'interactions':
        return { col1: 'Event Type', col2: 'Page URL', col3: 'Timestamp' };
      case 'heatmaps':
        return { col1: 'Page URL', col2: 'Coordinates', col3: 'Timestamp' };
      case 'funnels':
        return { col1: 'Name', col2: 'Steps', col3: 'Created' };
      case 'experiments':
        return { col1: 'Name', col2: 'Variants', col3: 'Status' };
      case 'cohorts':
        return { col1: 'Name', col2: 'Filters', col3: 'Created' };
      case 'featureFlags':
        return { col1: 'Key', col2: 'Enabled', col3: 'Created' };
      default:
        return { col1: 'ID', col2: 'Summary', col3: 'Timestamp' };
    }
  };

  const getCategoryData = (category: string | null, item: any) => {
    switch (category) {
      case 'sessions':
        return {
          col1: truncate(item.sessionId, 30),
          col2: truncate(item.userName || item.userId || 'Anonymous', 30),
          col3: new Date(item.startedAt || item.createdAt || Date.now()).toLocaleString(),
        };
      case 'sessionRecordings':
        return {
          col1: truncate(item.sessionId, 30),
          col2: truncate(item.entryURL || item.metadata?.url || '—', 60),
          col3: new Date(item.startTime || item.createdAt || Date.now()).toLocaleString(),
        };
      case 'pageViews':
        return {
          col1: truncate(item.url || item.pageURL, 60),
          col2: truncate(item.referrer || '—', 40),
          col3: new Date(item.timestamp || item.createdAt || Date.now()).toLocaleString(),
        };
      case 'userEvents':
        return {
          col1: truncate(item.name || item.eventName, 40),
          col2: truncate(item.properties ? JSON.stringify(item.properties) : '—', 50),
          col3: new Date(item.timestamp || item.createdAt || Date.now()).toLocaleString(),
        };
      case 'interactions':
        return {
          col1: truncate(item.eventType, 30),
          col2: truncate(item.pageURL, 60),
          col3: new Date(item.timestamp || Date.now()).toLocaleString(),
        };
      case 'heatmaps':
        return {
          col1: truncate(item.pageURL, 60),
          col2: `(${item.x || '?'}, ${item.y || '?'})`,
          col3: new Date(item.timestamp || item.createdAt || Date.now()).toLocaleString(),
        };
      case 'funnels':
        return {
          col1: truncate(item.name, 40),
          col2: Array.isArray(item.steps) ? `${item.steps.length} steps` : '—',
          col3: new Date(item.createdAt || Date.now()).toLocaleString(),
        };
      case 'experiments':
        return {
          col1: truncate(item.name, 40),
          col2: Array.isArray(item.variants) ? item.variants.map((v: any) => v.name).join(', ') : '—',
          col3: item.status || '—',
        };
      case 'cohorts':
        return {
          col1: truncate(item.name, 40),
          col2: truncate(item.filters ? JSON.stringify(item.filters) : '—', 50),
          col3: new Date(item.createdAt || Date.now()).toLocaleString(),
        };
      case 'featureFlags':
        return {
          col1: truncate(item.key || item.name, 40),
          col2: item.enabled ? 'Enabled' : 'Disabled',
          col3: new Date(item.createdAt || Date.now()).toLocaleString(),
        };
      default:
        return {
          col1: String(item._id || '').slice(0, 8) + '…',
          col2: truncate(item.name || item.title || item.sessionId || item.url || '—', 60),
          col3: new Date(item.timestamp || item.startedAt || item.createdAt || Date.now()).toLocaleString(),
        };
    }
  };

  const renderJsonTree = (obj: any, level = 0): React.ReactElement => {
    if (obj == null) return <span className="text-muted-foreground">null</span>;
    if (typeof obj !== 'object') {
      return <span className="text-green-600 dark:text-green-400">{JSON.stringify(obj)}</span>;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span className="text-muted-foreground">[]</span>;
      return (
        <div className="ml-4">
          {obj.map((val, idx) => (
            <div key={idx}>
              <span className="text-blue-600 dark:text-blue-400">[{idx}]</span>:{' '}
              {renderJsonTree(val, level + 1)}
            </div>
          ))}
        </div>
      );
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;
    return (
      <div className={level > 0 ? 'ml-4' : ''}>
        {keys.map((k) => (
          <div key={k} className="my-0.5">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{k}</span>:{' '}
            {renderJsonTree(obj[k], level + 1)}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchData();
    fetchSeedStats();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch stats
      const statsRes = await axios.get(`${API_BASE}/api/tracking/stats`);
      setStats(statsRes.data);

      // Fetch sessions - normalize response shape
      const sessionsRes = await axios.get(`${API_BASE}/api/tracking/sessions?limit=50`);
      const sessionsRaw = (sessionsRes.data as any)?.sessions ?? sessionsRes.data;
      const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : (sessionsRaw ? [sessionsRaw] : []);
      setSessions(sessions);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCategory = async (category: string, page = 1) => {
    try {
      setSelectedCategory(category);
      setAnalyticsDialogOpen(true);
      setCategoryLoading(true);
      setCategoryPage(page);
      const res = await axios.get(`${API_BASE}/api/analytics/admin/${category}?page=${page}&limit=${categoryLimit}`);
      setCategoryItems(res.data.items || []);
      setCategoryTotal(res.data.total || 0);
    } catch (error: any) {
      console.error('Error loading category:', category, error);
      toast({ title: 'Error', description: `Failed to load ${category} list`, variant: 'destructive' });
    } finally {
      setCategoryLoading(false);
    }
  };

  const loadPage = (direction: 'next' | 'prev') => {
    if (!selectedCategory) return;
    const newPage = direction === 'next' ? categoryPage + 1 : categoryPage - 1;
    openCategory(selectedCategory, newPage);
  };

  const deleteCategoryItem = async (category: string, id: string) => {
    try {
      await axios.delete(`${API_BASE}/api/analytics/admin/${category}/${id}`);
      toast({ title: 'Deleted', description: 'Item deleted' });
      await openCategory(category);
      await fetchSeedStats();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  };

  const deleteCategoryAll = async (category: string) => {
    try {
      await axios.delete(`${API_BASE}/api/analytics/admin/${category}`);
      toast({ title: 'Cleared', description: `All ${category} deleted` });
      await openCategory(category);
      await fetchSeedStats();
    } catch (error: any) {
      console.error('Error clearing category:', error);
      toast({ title: 'Error', description: `Failed to delete ${category}`, variant: 'destructive' });
    }
  };
  const fetchSeedStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/seed/stats`);
      setSeedStats(res.data);
    } catch (error) {
      console.error('Error fetching seed stats:', error);
    }
  };

  const handleSeedProducts = async () => {
    try {
      setSeeding(true);
      const res = await axios.post(`${API_BASE}/api/seed/products`, {
        categories: selectedCategories.length > 0 ? selectedCategories : undefined
      });

      toast({
        title: 'Success',
        description: res.data.message || `Seeded ${res.data.count} products`,
      });

      await fetchSeedStats();
      setSeedDialogOpen(false);
    } catch (error: any) {
      console.error('Error seeding products:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to seed products',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleResetDatabase = async () => {
    try {
      setResetting(true);
      await axios.post(`${API_BASE}/api/seed/reset`);

      toast({
        title: 'Database Reset',
        description: 'All data cleared except admin user',
      });

      // Refresh all data
      await fetchData();
      await fetchSeedStats();
    } catch (error: any) {
      console.error('Error resetting database:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset database',
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleFlushAll = async () => {
    try {
      await axios.delete(`${API_BASE}/api/tracking/flush-all`);

      toast({
        title: 'Success',
        description: 'All analytics data has been deleted',
      });

      // Reset local state
      setStats({ sessions: 0, interactions: 0, heatmapData: 0 });
      setSessions([]);

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error flushing data:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to flush data',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await axios.delete(`${API_BASE}/api/tracking/sessions/${sessionId}`);

      toast({
        title: 'Success',
        description: 'Session deleted successfully',
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete session',
        variant: 'destructive',
      });
    }
  };

  // Note: individual interaction deletion has been removed from this page.

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Management</h1>
        <p className="text-muted-foreground">Manage analytics recordings, captured data, and seeded content</p>
      </div>

      <Tabs defaultValue="recordings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recordings">
            <Video className="h-4 w-4 mr-2" />
            Session Recordings
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Zap className="h-4 w-4 mr-2" />
            Analytics Data
          </TabsTrigger>
          <TabsTrigger value="seeded">
            <HardDrive className="h-4 w-4 mr-2" />
            Seeded Data
          </TabsTrigger>
        </TabsList>

        {/* SESSION RECORDINGS TAB */}
        <TabsContent value="recordings" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Session Recordings</h2>
              <p className="text-sm text-muted-foreground">DOM-based user session replays captured via rrweb</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Recordings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Session Recordings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {stats.sessions} session recordings and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFlushAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Recorded Sessions ({sessions.length})
              </CardTitle>
              <CardDescription>View and manage user session recordings</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No sessions found</p>
                  <p className="text-xs text-muted-foreground mt-1">Session recordings will appear here once users interact with your site</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session._id}>
                        <TableCell className="font-mono text-xs">{session.sessionId.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">{session.userName || session.userId?.slice(0, 8) || 'Anonymous'}</TableCell>
                        <TableCell className="max-w-xs truncate">{session.metadata?.url || 'N/A'}</TableCell>
                        <TableCell>{session.metadata?.device?.type || 'Unknown'}</TableCell>
                        <TableCell className="text-xs">{new Date(session.startedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.events?.length || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.completedAt ? 'secondary' : 'default'}>
                            {session.completedAt ? 'Completed' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this session recording and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSession(session.sessionId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS DATA TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Captured Analytics Data</h2>
              <p className="text-sm text-muted-foreground">All analytics data captured from user activity</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Analytics
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Analytics Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all analytics across all categories. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { await handleFlushAll(); await fetchSeedStats(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="cursor-pointer" onClick={() => openCategory('sessions')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.sessions || 0}</div>
                <p className="text-xs text-muted-foreground">User sessions</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('pageViews')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.pageViews || 0}</div>
                <p className="text-xs text-muted-foreground">Page navigation events</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('userEvents')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Events</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.userEvents || 0}</div>
                <p className="text-xs text-muted-foreground">Custom tracked events</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('interactions')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.interactions || 0}</div>
                <p className="text-xs text-muted-foreground">Clicks, scrolls, inputs</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('heatmaps')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Heatmaps</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.heatmaps || 0}</div>
                <p className="text-xs text-muted-foreground">Movement tracking</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('sessionRecordings')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Session Recordings</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.sessionRecordings || 0}</div>
                <p className="text-xs text-muted-foreground">Replay recordings</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('eventAnalytics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Event Analytics</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.eventAnalytics || 0}</div>
                <p className="text-xs text-muted-foreground">Event aggregations</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('performanceMetrics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.performanceMetrics || 0}</div>
                <p className="text-xs text-muted-foreground">Performance data</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('funnels')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funnels</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.funnels || 0}</div>
                <p className="text-xs text-muted-foreground">Conversion funnels</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('experiments')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A/B Tests</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.experiments || 0}</div>
                <p className="text-xs text-muted-foreground">Active experiments</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('cohorts')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cohorts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.cohorts || 0}</div>
                <p className="text-xs text-muted-foreground">User cohorts</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={() => openCategory('featureFlags')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.analytics.featureFlags || 0}</div>
                <p className="text-xs text-muted-foreground">Feature toggles</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Data Overview</CardTitle>
              <CardDescription>All captured analytics data is shown in the respective analytics pages. Use "Reset All" in the Seeded Data tab to clear everything.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View detailed analytics data in their respective pages:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Activity Feed:</strong> Real-time user interactions and events</li>
                <li><strong>Heatmaps:</strong> Visual click and movement tracking</li>
                <li><strong>Session Recordings:</strong> Full replay of user sessions (Recordings tab)</li>
                <li><strong>Funnel Analysis:</strong> Conversion tracking and drop-off points</li>
                <li><strong>A/B Testing:</strong> Experiment results and variants</li>
                <li><strong>Events & Metrics:</strong> Custom event tracking and performance data</li>
              </ul>
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">⚠️ To delete all analytics data</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Go to the <strong>Seeded Data</strong> tab and click <strong>"Reset All"</strong> to clear all analytics, products, orders, and non-admin users.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Detail Dialog */}
        <AlertDialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
          <AlertDialogContent className="max-w-[min(95vw,1000px)]">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedCategory ? `Manage ${selectedCategory}` : 'Manage Analytics'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedCategory ? `View and delete ${selectedCategory} records.` : 'Select a category to manage.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {categoryTotal} total • Page {categoryPage}
                </p>
                {selectedCategory && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All in {selectedCategory}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete all {selectedCategory}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all items in this category. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => selectedCategory && (await deleteCategoryAll(selectedCategory))} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="border rounded-md overflow-hidden">
                {categoryLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin inline-block" />
                  </div>
                ) : categoryItems.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No items found.</div>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <Table className="table-fixed min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-28">ID</TableHead>
                          <TableHead className="w-[40%]">{getCategoryColumns(selectedCategory).col1}</TableHead>
                          <TableHead className="w-[30%]">{getCategoryColumns(selectedCategory).col2}</TableHead>
                          <TableHead className="w-36">{getCategoryColumns(selectedCategory).col3}</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryItems.map((it: any) => {
                          const data = getCategoryData(selectedCategory, it);
                          return (
                            <TableRow key={it._id}>
                              <TableCell className="font-mono text-xs whitespace-nowrap">{String(it._id).slice(0, 8)}…</TableCell>
                              <TableCell className="text-xs">
                                <div className="max-w-[500px] truncate">{data.col1}</div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="max-w-[350px] truncate">{data.col2}</div>
                              </TableCell>
                              <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {data.col3}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" onClick={() => { setDetailItem(it); setDetailOpen(true); }}>
                                    View
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                                        <AlertDialogDescription>This will remove the selected record.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={async () => selectedCategory && (await deleteCategoryItem(selectedCategory, it._id))} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {!categoryLoading && categoryItems.length > 0 && (
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {((categoryPage - 1) * categoryLimit) + 1}-{Math.min(categoryPage * categoryLimit, categoryTotal)} of {categoryTotal} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadPage('prev')}
                      disabled={categoryPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {categoryPage} of {Math.ceil(categoryTotal / categoryLimit)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadPage('next')}
                      disabled={categoryPage >= Math.ceil(categoryTotal / categoryLimit)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Item Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-[min(95vw,900px)]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Record details</DialogTitle>
                  <DialogDescription>Inspect the full content of this record.</DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setJsonViewMode(jsonViewMode === 'raw' ? 'tree' : 'raw')}
                >
                  {jsonViewMode === 'raw' ? 'Tree View' : 'Raw JSON'}
                </Button>
              </div>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto rounded border bg-muted p-4">
              {jsonViewMode === 'tree' ? (
                <div className="text-sm font-mono leading-relaxed">
                  {detailItem && renderJsonTree(detailItem)}
                </div>
              ) : (
                <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {detailItem ? JSON.stringify(detailItem, null, 2) : ''}
                </pre>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* SEEDED DATA TAB */}
        <TabsContent value="seeded" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Seeded Database Content</h2>
              <p className="text-sm text-muted-foreground">Pre-populate development data with one click</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setSeedDialogOpen(true)} disabled={seeding} variant="default">
                <Package className="mr-2 h-4 w-4" />
                Seed Products
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={resetting}>
                    {resetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reset All
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Entire Database?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <div className="space-y-3">
                          <p className="text-sm">This will permanently delete ALL data except your admin account:</p>

                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Business Data:</p>
                            <ul className="list-disc list-inside text-sm space-y-0.5 ml-2">
                              <li>{seedStats?.totals.products || 0} products (seeded and user-created)</li>
                              <li>{(seedStats?.totals.users || 0) - (seedStats?.totals.admins || 0)} non-admin users</li>
                              <li>{seedStats?.totals.orders || 0} orders</li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Analytics Data:</p>
                            <ul className="list-disc list-inside text-sm space-y-0.5 ml-2">
                              <li>{seedStats?.analytics.sessionRecordings || 0} session recordings</li>
                              <li>{seedStats?.analytics.sessions || 0} sessions</li>
                              <li>{seedStats?.analytics.pageViews || 0} page views</li>
                              <li>{seedStats?.analytics.userEvents || 0} user events</li>
                              <li>{seedStats?.analytics.interactions || 0} interactions</li>
                              <li>{seedStats?.analytics.heatmaps || 0} heatmap points</li>
                              <li>{seedStats?.analytics.eventAnalytics || 0} event analytics</li>
                              <li>{seedStats?.analytics.performanceMetrics || 0} performance metrics</li>
                              <li>{seedStats?.analytics.funnels || 0} funnels</li>
                              <li>{seedStats?.analytics.experiments || 0} A/B tests</li>
                              <li>{seedStats?.analytics.cohorts || 0} cohorts</li>
                              <li>{seedStats?.analytics.featureFlags || 0} feature flags</li>
                            </ul>
                          </div>

                          <p className="font-semibold text-red-600 pt-2">⚠️ This action cannot be undone!</p>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetDatabase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Reset Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Analytics Only
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Analytics Data?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <p className="text-sm mb-2">This will delete analytics data only and keep your products, users, and orders.</p>
                        <div className="space-y-2">
                          <ul className="list-disc list-inside text-sm space-y-0.5 ml-2">
                            <li>{seedStats?.analytics.sessionRecordings || 0} session recordings</li>
                            <li>{seedStats?.analytics.sessions || 0} sessions</li>
                            <li>{seedStats?.analytics.pageViews || 0} page views</li>
                            <li>{seedStats?.analytics.userEvents || 0} user events</li>
                            <li>{seedStats?.analytics.interactions || 0} interactions</li>
                            <li>{seedStats?.analytics.heatmaps || 0} heatmap points</li>
                            <li>{seedStats?.analytics.eventAnalytics || 0} event analytics</li>
                            <li>{seedStats?.analytics.performanceMetrics || 0} performance metrics</li>
                            <li>{seedStats?.analytics.funnels || 0} funnels</li>
                            <li>{seedStats?.analytics.experiments || 0} A/B tests</li>
                            <li>{seedStats?.analytics.cohorts || 0} cohorts</li>
                            <li>{seedStats?.analytics.featureFlags || 0} feature flags</li>
                          </ul>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => { await handleFlushAll(); await fetchSeedStats(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Analytics
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Seeded Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.seeded.products || 0}</div>
                <p className="text-xs text-muted-foreground">Tagged with SEED- prefix</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.totals.products || 0}</div>
                <p className="text-xs text-muted-foreground">All products in database</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seedStats?.totals.users || 0}</div>
                <p className="text-xs text-muted-foreground">{seedStats?.totals.admins || 0} admin(s)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Seeding Instructions
              </CardTitle>
              <CardDescription>One-click database population for development</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Seed Products</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Seed Products" to populate your database with sample products.
                      Each seeded item gets a unique ID starting with <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">SEED-</code>
                      so you can distinguish them from user-created data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-semibold shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Test Your Features</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use the seeded data to test your storefront, cart, checkout, and analytics features without manually creating products.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white text-sm font-semibold shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Reset When Needed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Reset All" to wipe everything except your admin login.
                      Perfect for starting fresh or cleaning up after testing.
                      <strong className="text-red-600"> This deletes ALL data!</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">💡 About Seeded Data</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Seeded products</strong> have a <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">seededId</code> field starting with "SEED-"</li>
                  <li><strong>User-created data</strong> (from your storefront or admin) has normal UUIDs or ObjectIds</li>
                  <li>The "Reset All" button preserves your admin account but removes everything else</li>
                  <li>You can re-seed multiple times—each run replaces old seeded data</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Seed Products Dialog */}
      <Dialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seed Products</DialogTitle>
            <DialogDescription>Select which product categories to seed</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {['Electronics', 'Wearables', 'Apparel', 'Footwear'].map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <Label
                    htmlFor={category}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong>{selectedCategories.length}</strong> {selectedCategories.length === 1 ? 'category' : 'categories'} selected.
                Seeded products will have IDs starting with <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">SEED-</code>
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSeedDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSeedProducts}
              disabled={seeding || selectedCategories.length === 0}
            >
              {seeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Seed Products
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
