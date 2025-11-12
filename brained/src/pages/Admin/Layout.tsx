import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Video,
  Target,
  Zap,
  GitBranch,
  Users,
  FlaskConical,
  Package,
  Settings,
  Circle,
  ChevronRight,
  LogOut,
  Store,
  User,
  Activity,
  Database,
  Shield,
  Bell,
  Lightbulb,
  BarChart2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '../../components/ui/sidebar';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import trackingClient from '../../services/trackingClient';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  let auth: any = null;
  try { auth = useAuth(); } catch (e) { auth = null; }

  // Recording control component
  const RecordingControl: React.FC = () => {
    const [isRec, setIsRec] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
      api
        .get('/api/analytics/recording')
        .then((r) => setIsRec(!!r.data.enabled))
        .catch(() => { });
    }, []);

    const toggle = async () => {
      setLoading(true);
      try {
        const res = await api.post('/api/analytics/recording', { enabled: !isRec });
        setIsRec(!!res.data.enabled);
        if (res.data.enabled) {
          // Force recording start even for admins (testing purposes)
          trackingClient.startRecording(true);
          console.log('[Admin] Recording started manually');
        } else {
          trackingClient.stopRecording();
          console.log('[Admin] Recording stopped');
        }
      } catch (e) {
        console.error('[Admin] Failed to toggle recording:', e);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <Button
          disabled={loading}
          onClick={toggle}
          className={`w-full ${isRec
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-60`}
          size="sm"
        >
          <Circle className={`w-3 h-3 mr-2 ${isRec ? 'fill-white' : ''}`} />
          {isRec ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <span className="text-xs text-muted-foreground text-center">
          {isRec ? 'Recording active' : 'Recorder idle'}
        </span>
      </div>
    );
  };

  const menuItems = [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: LayoutDashboard,
    },
  ];

  const analyticsItems = [
    // {
    //   title: 'Overview',
    //   url: '/admin/analytics/overview',
    //   icon: TrendingUp,
    // },
    // {
    //   title: 'Real-Time Dashboard',
    //   url: '/admin/analytics/realtime',
    //   icon: Activity,
    // },
    {
      title: 'Session Recordings',
      url: '/admin/analytics/recordings',
      icon: Video,
    },
    {
      title: 'Live Recording',
      url: '/admin/analytics/live-recording',
      icon: Video,
    },
    {
      title: 'Heatmaps',
      url: '/admin/analytics/heatmap',
      icon: Target,
    },
    {
      title: 'Performance',
      url: '/admin/analytics/performance',
      icon: Zap,
    },
    {
      title: 'Funnel Analysis',
      url: '/admin/analytics/funnels',
      icon: GitBranch,
    },
    {
      title: 'Path Analysis',
      url: '/admin/analytics/paths',
      icon: GitBranch,
    },
    {
      title: 'Cohort Analysis',
      url: '/admin/analytics/cohorts',
      icon: Users,
    },
    {
      title: 'Trends',
      url: '/admin/analytics/trends',
      icon: BarChart2,
    },
    {
      title: 'Auto-Insights',
      url: '/admin/analytics/insights',
      icon: Lightbulb,
    },
    {
      title: 'A/B Testing',
      url: '/admin/analytics/experiments',
      icon: FlaskConical,
    },
    {
      title: 'Feature Flags',
      url: '/admin/analytics/flags',
      icon: Settings,
    },
  ];

  const managementItems = [
    {
      title: 'Products',
      url: '/admin/products',
      icon: Package,
    },
    {
      title: 'Data Management',
      url: '/admin/data',
      icon: Database,
    },
    {
      title: 'Seed Data',
      url: '/admin/data/seeds',
      icon: Database,
    },
    {
      title: 'Tracking Setup',
      url: '/admin/tracking',
      icon: Settings,
    },
    {
      title: 'Alert Rules',
      url: '/admin/monitoring/alerts',
      icon: Bell,
    },
    {
      title: 'Consent & Masking',
      url: '/admin/privacy/consent',
      icon: Shield,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg">
              P
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm">PagePulse</span>
              <span className="text-xs text-muted-foreground">Admin Panel</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analyticsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        {location.pathname === item.url && (
                          <ChevronRight className="ml-auto w-4 h-4" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        {location.pathname === item.url && (
                          <ChevronRight className="ml-auto w-4 h-4" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="p-2 space-y-2">
            {/* Quick Actions */}
            <div className="group-data-[collapsible=icon]:hidden space-y-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                asChild
              >
                <Link to="/">
                  <Store className="w-4 h-4 mr-2" />
                  View Store
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                asChild
              >
                <Link to="/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={async () => {
                  if (auth && auth.logout) {
                    await auth.logout();
                    navigate('/login');
                  }
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            <Separator className="my-2" />
            <RecordingControl />

            {/* User info when collapsed */}
            <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <Link to="/">
                  <Store className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <Link to="/profile">
                  <User className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700"
                onClick={async () => {
                  if (auth && auth.logout) {
                    await auth.logout();
                    navigate('/login');
                  }
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 shadow-sm">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center justify-between flex-1 gap-2">
            <span className="font-semibold text-lg truncate">
              {analyticsItems.find((item) => item.url === location.pathname)?.title ||
                managementItems.find((item) => item.url === location.pathname)?.title ||
                menuItems.find((item) => item.url === location.pathname)?.title ||
                'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
