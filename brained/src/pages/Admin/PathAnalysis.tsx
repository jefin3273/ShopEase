import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { GitBranch, Search } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import ExportToolbar from '../../components/ExportToolbar';
import { useRef } from 'react';

interface SankeyNode {
  name: string;
  isGoal?: boolean;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const PathAnalysis: React.FC = () => {
  const [data, setData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [goalPath, setGoalPath] = useState('');
  const [maxNodes, setMaxNodes] = useState(50);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPathData();
  }, []);

  const fetchPathData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (goalPath) params.append('goalPath', goalPath);
      params.append('maxNodes', maxNodes.toString());
      
      const response = await api.get(`/api/paths/sankey?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch path analysis:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load path analysis',
        description: 'An error occurred while fetching path data.'
      });
    } finally {
      setLoading(false);  };
  };
  const handleSearch = () => {
    fetchPathData();
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Path Analysis</h1>
          <p className="text-muted-foreground mt-1">Visualize user journey flows</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading path data...
          </CardContent>
        </Card>
      </div>
    );
  }

  const csvGroups = data
    ? [
        {
          label: 'Nodes',
          headers: ['Index', 'Name', 'Is Goal'],
          rows: data.nodes.map((n, i) => [i, n.name, !!n.isGoal]),
          filename: 'paths-nodes.csv',
        },
        {
          label: 'Links',
          headers: ['Source', 'Target', 'Value'],
          rows: data.links.map((l) => [l.source, l.target, l.value]),
          filename: 'paths-links.csv',
        },
      ]
    : [];

  return (
    <div className="space-y-6" ref={containerRef}>
      <div>
        <h1 className="text-3xl font-bold">Path Analysis</h1>
        <p className="text-muted-foreground mt-1">Visualize user journey flows through your site</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
          <CardDescription>Configure path analysis parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="goalPath">Goal Path (optional)</Label>
              <Input
                id="goalPath"
                value={goalPath}
                onChange={(e) => setGoalPath(e.target.value)}
                placeholder="/checkout, /thank-you"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Highlight paths containing this URL
              </p>
            </div>
            <div>
              <Label htmlFor="maxNodes">Max Nodes</Label>
              <Input
                id="maxNodes"
                type="number"
                value={maxNodes}
                onChange={(e) => setMaxNodes(parseInt(e.target.value) || 50)}
                min="10"
                max="200"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Limit visualization complexity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            <ExportToolbar
              targetRef={containerRef as any}
              pdfFilename="paths.pdf"
              csvGroups={csvGroups}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Path Data Table */}
      {data && data.nodes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Pages ({data.nodes.length})
              </CardTitle>
              <CardDescription>Unique pages in user journeys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {data.nodes.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent"
                  >
                    <span className="font-mono text-sm truncate flex-1">{node.name}</span>
                    {node.isGoal && <Badge variant="default">Goal</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transitions ({data.links.length})</CardTitle>
              <CardDescription>Page-to-page navigation flows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {data.links
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 50)
                  .map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          Transition #{idx + 1}
                        </span>
                        <Badge variant="secondary">{link.value} users</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono truncate flex-1">
                          {data.nodes[link.source]?.name || `Node ${link.source}`}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono truncate flex-1">
                          {data.nodes[link.target]?.name || `Node ${link.target}`}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No path data available</h3>
            <p className="text-muted-foreground mb-4">
              Not enough page view data to generate path analysis
            </p>
            <p className="text-sm text-muted-foreground">
              Tip: Use a Sankey diagram library like Recharts or D3.js to visualize this data
            </p>
          </CardContent>
        </Card>
      )}

      {/* Visualization Placeholder */}
      {data && data.nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sankey Diagram Visualization</CardTitle>
            <CardDescription>
              Interactive flow diagram (requires Recharts/D3 integration)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <GitBranch className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sankey Visualization Area</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Integrate a charting library like Recharts Sankey or D3.js Sankey to visualize
                  the {data.nodes.length} nodes and {data.links.length} links above
                </p>
                <div className="mt-4 space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://recharts.org/en-US/examples/SimpleSankey"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Recharts Example
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://d3-graph-gallery.com/sankey.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      D3 Example
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PathAnalysis;
