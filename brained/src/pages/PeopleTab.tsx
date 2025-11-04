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
  User,
  Clock,
  Activity,
  Eye,
  MousePointer,
  AlertTriangle,

} from 'lucide-react';
import axios from 'axios';
import SessionReplayPlayerFull from '@/components/SessionReplayPlayerFull';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

interface Person {
  userId: string;
  userName?: string; // Add userName field
  sessionCount: number;
  eventCount: number;
  lastSeen: string;
  firstSeen: string;
  totalErrors: number;
  devices: string[];
  urls: string[];
}

interface PersonActivity {
  sessions: any[];
  events: any[];
  errors: any[];
}

export default function PeopleTab() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personActivity, setPersonActivity] = useState<PersonActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [replayDialogOpen, setReplayDialogOpen] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      setLoading(true);

      // Fetch all sessions and interactions to build people list
      const [sessionsRes, interactionsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/tracking/sessions?limit=1000`),
        axios.get(`${API_BASE}/api/tracking/interactions?limit=5000`)
      ]);

      const sessions = (sessionsRes.data as any)?.sessions ?? sessionsRes.data;
      const interactions = interactionsRes.data;

      // Group by userId
      const peopleMap = new Map<string, Person>();

      sessions.forEach((session: any) => {
        const userId = session.userId || 'anonymous';

        if (!peopleMap.has(userId)) {
          peopleMap.set(userId, {
            userId,
            userName: session.userName, // Capture userName from enriched session data
            sessionCount: 0,
            eventCount: 0,
            lastSeen: session.startTime,
            firstSeen: session.startTime,
            totalErrors: 0,
            devices: [],
            urls: []
          });
        }

        const person = peopleMap.get(userId)!;
        person.sessionCount++;
        person.eventCount += session.events?.length || 0;

        if (new Date(session.startTime) > new Date(person.lastSeen)) {
          person.lastSeen = session.startTime;
        }
        if (new Date(session.startTime) < new Date(person.firstSeen)) {
          person.firstSeen = session.startTime;
        }

        const device = session.device?.type || 'unknown';
        if (!person.devices.includes(device)) {
          person.devices.push(device);
        }

        if (session.entryURL && !person.urls.includes(session.entryURL)) {
          person.urls.push(session.entryURL);
        }
      });

      // Count errors per user from interactions
      interactions
        .filter((i: any) => i.eventName?.includes('error') || i.eventType === 'error')
        .forEach((interaction: any) => {
          const userId = interaction.userId || 'anonymous';
          const person = peopleMap.get(userId);
          if (person) {
            person.totalErrors++;
          }
        });

      setPeople(Array.from(peopleMap.values()).sort((a, b) =>
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      ));
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonActivity = async (userId: string) => {
    try {
      setLoadingActivity(true);

      const [sessionsRes, interactionsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/tracking/sessions?userId=${userId}`),
        axios.get(`${API_BASE}/api/tracking/interactions?userId=${userId}`)
      ]);

      const sessionsRaw = (sessionsRes.data as any)?.sessions ?? sessionsRes.data;
      const sessions = Array.isArray(sessionsRaw)
        ? sessionsRaw
        : (sessionsRaw ? [sessionsRaw] : []);

      const events = interactionsRes.data;
      const errors = events.filter((e: any) =>
        e.eventName?.includes('error') ||
        e.eventType === 'error' ||
        e.eventName === 'network_error' ||
        e.eventName === 'console_error'
      );

      setPersonActivity({
        sessions,
        events: events,
        errors: errors
      });
    } catch (error) {
      console.error('Error fetching person activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handlePersonClick = async (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
    await fetchPersonActivity(person.userId);
  };

  const handleViewSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setReplayDialogOpen(true);
  };

  const filteredPeople = people.filter(person =>
    person.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        <h1 className="text-3xl font-bold">People</h1>
        <p className="text-muted-foreground">Track users and their activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{people.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {people.reduce((sum, p) => sum + p.sessionCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {people.reduce((sum, p) => sum + p.eventCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {people.reduce((sum, p) => sum + p.totalErrors, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user ID or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchPeople} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* People Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredPeople.length})</CardTitle>
          <CardDescription>All users who have interacted with your site</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPeople.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No users found</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeople.map((person) => (
                    <TableRow
                      key={person.userId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handlePersonClick(person)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{person.userName || person.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{person.sessionCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{person.eventCount}</Badge>
                      </TableCell>
                      <TableCell>
                        {person.totalErrors > 0 ? (
                          <Badge variant="destructive">{person.totalErrors}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {person.devices.map((device) => (
                            <Badge key={device} variant="outline" className="text-xs">
                              {device}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTimestamp(person.lastSeen)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Person Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedPerson?.userName || selectedPerson?.userId}
            </DialogTitle>
            <DialogDescription>
              User activity and session history
            </DialogDescription>
          </DialogHeader>

          {selectedPerson && (
            <div className="flex-1 overflow-hidden">
              {loadingActivity ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Tabs defaultValue="overview" className="h-full flex flex-col">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sessions">
                      Sessions ({personActivity?.sessions.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="events">
                      Events ({personActivity?.events.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="errors">
                      Errors ({personActivity?.errors.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="flex-1 overflow-auto">
                    <div className="space-y-6 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Total Sessions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{selectedPerson.sessionCount}</div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Total Events</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{selectedPerson.eventCount}</div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">First Seen</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">{formatTimestamp(selectedPerson.firstSeen)}</div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Last Seen</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">{formatTimestamp(selectedPerson.lastSeen)}</div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Devices Used</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            {selectedPerson.devices.map((device) => (
                              <Badge key={device}>{device}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Pages Visited</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <ul className="space-y-1 text-sm">
                              {selectedPerson.urls.map((url, i) => (
                                <li key={i} className="truncate" title={url}>{url}</li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="sessions" className="flex-1 overflow-auto">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 p-4">
                        {personActivity?.sessions.map((session) => (
                          <Card key={session.sessionId} className="cursor-pointer hover:bg-muted/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">{session.sessionId.slice(0, 8)}...</span>
                                    <Badge variant="outline">{session.events?.length || 0} events</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{session.entryURL}</p>
                                  <p className="text-xs text-muted-foreground">{formatTimestamp(session.startTime)}</p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSession(session.sessionId);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Replay
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="events" className="flex-1 overflow-auto">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 p-4">
                        {personActivity?.events.map((event) => (
                          <div key={event._id} className="p-3 border rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <Badge>{event.eventType}</Badge>
                                <p className="text-sm mt-1">{event.eventName}</p>
                                <p className="text-xs text-muted-foreground mt-1">{event.pageURL}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="errors" className="flex-1 overflow-auto">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 p-4">
                        {personActivity?.errors && personActivity.errors.length > 0 ? (
                          personActivity.errors.map((error) => (
                            <Card key={error._id} className="border-red-200 bg-red-50">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-medium text-red-900">{error.eventName}</p>
                                    <p className="text-sm text-red-700 mt-1">{error.pageURL}</p>
                                    {error.metadata?.message && (
                                      <p className="text-xs text-red-600 mt-2 font-mono">
                                        {error.metadata.message}
                                      </p>
                                    )}
                                    <p className="text-xs text-red-600 mt-2">
                                      {formatTimestamp(error.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-12">No errors found</p>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Replay Dialog */}
      <Dialog open={replayDialogOpen} onOpenChange={setReplayDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>Session Replay</DialogTitle>
            <DialogDescription>RRWeb-based DOM replay of the selected session.</DialogDescription>
          </DialogHeader>
          {selectedSessionId && (
            <div className="overflow-auto">
              <SessionReplayPlayerFull sessionId={selectedSessionId} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
