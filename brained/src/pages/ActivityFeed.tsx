import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Search,
  MousePointer,
  Eye,
  Scroll,
  Hand,
  FileText,
  Clock,
  User,
  Globe,
  Info,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

interface ActivityEvent {
  _id: string;
  eventType: string;
  eventName: string;
  sessionId: string;
  userId?: string;
  userName?: string; // Add userName field
  pageURL: string;
  metadata: any;
  timestamp: string;
  createdAt: string;
}

const eventIcons: Record<string, any> = {
  click: MousePointer,
  pageview: Eye,
  scroll: Scroll,
  hover: Hand,
  input: FileText,
  submit: FileText,
  custom: Info,
};

const eventColors: Record<string, string> = {
  click: 'bg-blue-100 text-blue-800',
  pageview: 'bg-green-100 text-green-800',
  scroll: 'bg-purple-100 text-purple-800',
  hover: 'bg-yellow-100 text-yellow-800',
  input: 'bg-pink-100 text-pink-800',
  submit: 'bg-orange-100 text-orange-800',
  custom: 'bg-gray-100 text-gray-800',
};

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/tracking/interactions?limit=500`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch =
      event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.pageURL.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.userName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;

    return matchesSearch && matchesType;
  });

  const handleEventClick = (event: ActivityEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const getEventIcon = (eventType: string) => {
    const Icon = eventIcons[eventType] || Info;
    return <Icon className="h-4 w-4" />;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
        <h1 className="text-3xl font-bold">Activity Feed</h1>
        <p className="text-muted-foreground">Real-time events from your users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, URLs, or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="click">Clicks</SelectItem>
                <SelectItem value="pageview">Pageviews</SelectItem>
                <SelectItem value="scroll">Scrolls</SelectItem>
                <SelectItem value="hover">Hovers</SelectItem>
                <SelectItem value="input">Inputs</SelectItem>
                <SelectItem value="submit">Form Submits</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchEvents} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity ({filteredEvents.length})</CardTitle>
          <CardDescription>All tracked user interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No events match your filters
            </p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Event</TableHead>
                    <TableHead className="w-[200px]">Person</TableHead>
                    <TableHead>URL/Screen</TableHead>
                    <TableHead className="w-[150px]">Time</TableHead>
                    <TableHead className="w-[100px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow
                      key={event._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEventClick(event)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${eventColors[event.eventType] || eventColors.custom}`}>
                            {getEventIcon(event.eventType)}
                          </div>
                          <span className="font-medium">{event.eventName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono truncate">
                            {event.userName || event.userId || 'Anonymous'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate" title={event.pageURL}>
                            {event.pageURL}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTimestamp(event.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (
                <>
                  <div className={`p-2 rounded ${eventColors[selectedEvent.eventType] || eventColors.custom}`}>
                    {getEventIcon(selectedEvent.eventType)}
                  </div>
                  {selectedEvent.eventName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Event details and properties
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <Tabs defaultValue="properties" className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="properties" className="flex-1 overflow-auto">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className="font-semibold mb-2">Basic Information</h3>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <dt className="text-muted-foreground">Event Type:</dt>
                        <dd>
                          <Badge className={eventColors[selectedEvent.eventType]}>
                            {selectedEvent.eventType}
                          </Badge>
                        </dd>

                        <dt className="text-muted-foreground">Event Name:</dt>
                        <dd className="font-medium">{selectedEvent.eventName}</dd>

                        <dt className="text-muted-foreground">User:</dt>
                        <dd className="font-mono">{selectedEvent.userName || selectedEvent.userId || 'Anonymous'}</dd>

                        <dt className="text-muted-foreground">Session ID:</dt>
                        <dd className="font-mono text-xs">{selectedEvent.sessionId}</dd>

                        <dt className="text-muted-foreground">Page URL:</dt>
                        <dd className="col-span-1 truncate" title={selectedEvent.pageURL}>
                          {selectedEvent.pageURL}
                        </dd>

                        <dt className="text-muted-foreground">Timestamp:</dt>
                        <dd>{new Date(selectedEvent.timestamp).toLocaleString()}</dd>
                      </dl>
                    </div>

                    {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Event Properties</h3>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          {Object.entries(selectedEvent.metadata).map(([key, value]) => (
                            <div key={key} className="contents">
                              <dt className="text-muted-foreground capitalize">{key}:</dt>
                              <dd className="font-mono text-xs break-all">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="json" className="flex-1 overflow-auto">
                <ScrollArea className="h-[400px]">
                  <pre className="p-4 bg-slate-50 rounded text-xs font-mono">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="flex-1 overflow-auto">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 p-4">
                    {selectedEvent.metadata?.device && (
                      <div>
                        <h3 className="font-semibold mb-2">Device Information</h3>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <dt className="text-muted-foreground">Device Type:</dt>
                          <dd>{selectedEvent.metadata.device}</dd>

                          {selectedEvent.metadata.screenWidth && (
                            <>
                              <dt className="text-muted-foreground">Screen Size:</dt>
                              <dd>{selectedEvent.metadata.screenWidth} × {selectedEvent.metadata.screenHeight}</dd>
                            </>
                          )}

                          {selectedEvent.metadata.viewportWidth && (
                            <>
                              <dt className="text-muted-foreground">Viewport Size:</dt>
                              <dd>{selectedEvent.metadata.viewportWidth} × {selectedEvent.metadata.viewportHeight}</dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}

                    {(selectedEvent.metadata?.x !== undefined || selectedEvent.metadata?.y !== undefined) && (
                      <div>
                        <h3 className="font-semibold mb-2">Position Data</h3>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          {selectedEvent.metadata.x !== undefined && (
                            <>
                              <dt className="text-muted-foreground">Coordinates:</dt>
                              <dd>({selectedEvent.metadata.x}, {selectedEvent.metadata.y})</dd>
                            </>
                          )}

                          {selectedEvent.metadata.vw !== undefined && (
                            <>
                              <dt className="text-muted-foreground">Viewport %:</dt>
                              <dd>{selectedEvent.metadata.vw?.toFixed(1)}vw, {selectedEvent.metadata.vh?.toFixed(1)}vh</dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}

                    {selectedEvent.metadata?.element && (
                      <div>
                        <h3 className="font-semibold mb-2">Element Information</h3>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <dt className="text-muted-foreground">Element:</dt>
                          <dd className="font-mono">{selectedEvent.metadata.element}</dd>

                          {selectedEvent.metadata.elementId && (
                            <>
                              <dt className="text-muted-foreground">Element ID:</dt>
                              <dd className="font-mono">{selectedEvent.metadata.elementId}</dd>
                            </>
                          )}

                          {selectedEvent.metadata.className && (
                            <>
                              <dt className="text-muted-foreground">Class Name:</dt>
                              <dd className="font-mono text-xs break-all">
                                {typeof selectedEvent.metadata.className === 'object'
                                  ? JSON.stringify(selectedEvent.metadata.className)
                                  : selectedEvent.metadata.className
                                }
                              </dd>
                            </>
                          )}

                          {selectedEvent.metadata.text && (
                            <>
                              <dt className="text-muted-foreground">Text Content:</dt>
                              <dd className="col-span-1">{selectedEvent.metadata.text}</dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
