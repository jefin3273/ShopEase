import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Database,
  Trash2,
  PlusCircle,
  AlertCircle,
  Shield,
  MousePointerClick,
  Activity,
  Video,
  Package,
  Loader2,
  CheckCircle2,
  GitBranch,
  BarChart3,
} from 'lucide-react';
import ExportToolbar from '@/components/ExportToolbar';

interface SeedStatus {
  seeded: number;
  manual: number;
  total: number;
}

interface SeedStatuses {
  alertRules: SeedStatus;
  consentMaskingRules: SeedStatus;
  userEvents: SeedStatus;
  performanceMetrics: SeedStatus;
  sessionRecordings: SeedStatus;
  products: SeedStatus;
  pageViews: SeedStatus;
  funnels: SeedStatus;
}

interface SeedTypeConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultCount?: number;
}

const seedTypes: SeedTypeConfig[] = [
  {
    id: 'alert-rules',
    label: 'Alert Rules',
    description: 'Performance & error monitoring alerts with Slack/webhook delivery',
    icon: AlertCircle,
    color: 'bg-orange-500',
  },
  {
    id: 'consent-masking',
    label: 'Consent & Masking Rules',
    description: 'Privacy rules for masking sensitive fields in session recordings',
    icon: Shield,
    color: 'bg-purple-500',
  },
  {
    id: 'user-events',
    label: 'User Events',
    description: 'Enriched analytics events with location, device, and cohort data',
    icon: MousePointerClick,
    color: 'bg-blue-500',
    defaultCount: 200,
  },
  {
    id: 'performance-metrics',
    label: 'Performance Metrics',
    description: 'Core Web Vitals, JS errors, and API call monitoring data',
    icon: Activity,
    color: 'bg-green-500',
    defaultCount: 300,
  },
  {
    id: 'session-recordings',
    label: 'Session Recordings',
    description: 'Session replay data with errors, rage clicks, and user journeys',
    icon: Video,
    color: 'bg-red-500',
    defaultCount: 50,
  },
  {
    id: 'products',
    label: 'Products',
    description: 'E-commerce product catalog for demo purposes',
    icon: Package,
    color: 'bg-indigo-500',
  },
  {
    id: 'page-views',
    label: 'Page Views',
    description: 'User navigation data for path analysis and user journey tracking',
    icon: GitBranch,
    color: 'bg-cyan-500',
    defaultCount: 500,
  },
  {
    id: 'funnels',
    label: 'Funnels',
    description: 'Conversion funnel configurations with steps and analytics',
    icon: BarChart3,
    color: 'bg-pink-500',
  },
];

export default function SeedDataManager() {
  const { toast } = useToast();
  // Use Vite-provided API base or fallback to empty string (will cause relative requests)
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';
  const [statuses, setStatuses] = useState<SeedStatuses | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'seed' | 'clear';
    seedType: string;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/seed/status`);
      // Read body as text first so we can surface HTML/error pages and avoid
      // "body stream already read" when attempting both json() and text().
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${text.slice(0, 200)}`);
      }
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
      }
      // Basic shape validation
      if (data && typeof data === 'object') {
        setStatuses(data as SeedStatuses);
      } else {
        throw new Error('Unexpected seed status payload');
      }
    } catch (error) {
      console.error('Error fetching seed status:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch seed data status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSeed = async (seedType: string, count?: number) => {
    setActionLoading(seedType);
    try {
      await seedOne(seedType, count);
      toast({ title: 'Success', description: `Seeded ${seedType.replace('-', ' ')} successfully` });
      await fetchStatus();
    } catch (error: any) {
      console.error(`Error seeding ${seedType}:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to seed ${seedType}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  // Helper to perform the fetch and return parsed JSON or throw with a readable message
  const seedOne = async (seedType: string, count?: number) => {
    const endpoint = seedType === 'products' ? `${API_BASE}/api/seed/products` : `${API_BASE}/api/seed/data/${seedType}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${text.slice(0, 200)}`);
    }
    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
    }
  };

  const handleSeedAll = async () => {
    // Seed all configured types sequentially so the server isn't overwhelmed and to show progress
    setActionLoading('all');
    const errors: string[] = [];
    for (const t of seedTypes) {
      try {
        await seedOne(t.id, t.defaultCount);
        // small delay so the server has time to process heavy seeders (optional)
        await new Promise((r) => setTimeout(r, 200));
      } catch (err: any) {
        console.error(`Seed all: failed to seed ${t.id}:`, err);
        errors.push(`${t.id}: ${err?.message || String(err)}`);
      }
    }
    await fetchStatus();
    if (errors.length > 0) {
      toast({ title: 'Seed All Completed with errors', description: errors.join('; '), variant: 'destructive' });
    } else {
      toast({ title: 'Seed All Completed', description: 'All selected seeders ran successfully' });
    }
    setActionLoading(null);
  };

  const handleClear = async (seedType: string) => {
    setActionLoading(seedType);
    try {
      const endpoint = `${API_BASE}/api/seed/data/${seedType}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${text.slice(0, 200)}`);
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
      }

      if (data && (data.success || response.ok)) {
        toast({
          title: 'Success',
          description: `Cleared ${data.deletedCount || 0} seeded ${seedType.replace('-', ' ')}`,
        });
        await fetchStatus();
      } else {
        throw new Error((data && (data.message || data.error)) || 'Clearing failed');
      }
    } catch (error: any) {
      console.error(`Error clearing ${seedType}:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to clear ${seedType}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  const getStatusForType = (typeId: string): SeedStatus => {
    if (!statuses) return { seeded: 0, manual: 0, total: 0 };

    const statusKey = typeId === 'alert-rules'
      ? 'alertRules'
      : typeId === 'consent-masking'
        ? 'consentMaskingRules'
        : typeId === 'user-events'
          ? 'userEvents'
          : typeId === 'performance-metrics'
            ? 'performanceMetrics'
            : typeId === 'session-recordings'
              ? 'sessionRecordings'
              : typeId === 'page-views'
                ? 'pageViews'
                : typeId === 'funnels'
                  ? 'funnels'
                  : 'products';

    return statuses[statusKey as keyof SeedStatuses] || { seeded: 0, manual: 0, total: 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seed Data Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage test data for development and testing. Seed data is marked separately from manual entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportToolbar />
          <Button
            onClick={() => {
              // Ask for confirmation before seeding everything
              setConfirmDialog({ open: true, type: 'seed', seedType: 'all' });
            }}
            disabled={!!actionLoading}
            size="sm"
          >
            {actionLoading === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PlusCircle className="h-4 w-4 mr-2" />
            )}
            Seed All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {seedTypes.map((type) => {
          const status = getStatusForType(type.id);
          const Icon = type.icon;
          const isLoading = actionLoading === type.id;
          const hasSeeded = status.seeded > 0;
          const hasManual = status.manual > 0;

          return (
            <Card key={type.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${type.color}`} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type.color} bg-opacity-10`}>
                      <Icon className={`h-5 w-5 text-${type.color.replace('bg-', '')}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.label}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {status.total} Total
                        </Badge>
                        {hasSeeded && (
                          <Badge variant="secondary" className="text-xs">
                            {status.seeded} Seeded
                          </Badge>
                        )}
                        {hasManual && (
                          <Badge variant="default" className="text-xs">
                            {status.manual} Manual
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status indicators */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-muted rounded p-2">
                      <div className="font-semibold text-lg">{status.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded p-2">
                      <div className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                        {status.seeded}
                      </div>
                      <div className="text-xs text-muted-foreground">Seeded</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 rounded p-2">
                      <div className="font-semibold text-lg text-green-600 dark:text-green-400">
                        {status.manual}
                      </div>
                      <div className="text-xs text-muted-foreground">Manual</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        setConfirmDialog({ open: true, type: 'seed', seedType: type.id })
                      }
                      disabled={isLoading}
                      className="flex-1"
                      size="sm"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlusCircle className="h-4 w-4 mr-2" />
                      )}
                      Seed
                    </Button>
                    <Button
                      onClick={() =>
                        setConfirmDialog({ open: true, type: 'clear', seedType: type.id })
                      }
                      disabled={isLoading || status.seeded === 0}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <CheckCircle2 className="h-5 w-5" />
              Seeded Data
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200">
            <p>
              Seeded data is automatically generated test data marked with <code>isSeeded: true</code>.
              It can be safely cleared without affecting manually created entries.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <Database className="h-5 w-5" />
              Manual Data
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-800 dark:text-green-200">
            <p>
              Manual data is created through the UI or API without the seed flag.
              It remains untouched when clearing seeded data.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog?.open || false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'seed' ? 'Seed Data?' : 'Clear Seeded Data?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'seed' ? (
                confirmDialog.seedType === 'all' ? (
                  <>
                    This will run all configured seeders (one after another). It may take a few
                    moments depending on the dataset sizes.
                  </>
                ) : (
                  <>
                    This will generate new test data for{' '}
                    <strong>{confirmDialog.seedType.replace('-', ' ')}</strong>.
                    {seedTypes.find((t) => t.id === confirmDialog.seedType)?.defaultCount && (
                      <span className="block mt-2 text-sm">
                        Default count:{' '}
                        {seedTypes.find((t) => t.id === confirmDialog.seedType)?.defaultCount} items
                      </span>
                    )}
                  </>
                )
              ) : (
                <>
                  This will permanently delete all seeded{' '}
                  <strong>{confirmDialog?.seedType.replace('-', ' ')}</strong>.
                  Manual entries will not be affected.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog?.type === 'seed') {
                  if (confirmDialog.seedType === 'all') {
                    handleSeedAll();
                  } else {
                    const config = seedTypes.find((t) => t.id === confirmDialog.seedType);
                    handleSeed(confirmDialog.seedType, config?.defaultCount);
                  }
                } else if (confirmDialog?.type === 'clear') {
                  handleClear(confirmDialog.seedType);
                }
              }}
            >
              {confirmDialog?.type === 'seed' ? (confirmDialog.seedType === 'all' ? 'Seed All' : 'Seed') : 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
