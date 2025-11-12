import React, { useEffect, useRef, useState } from 'react';
import * as d3Sankey from 'd3-sankey';
import { select } from 'd3-selection';

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

interface SankeyDiagramProps {
    data: SankeyData;
}

type D3SankeyNode = d3Sankey.SankeyNode<SankeyNode, SankeyLink>;

type D3SankeyLink = d3Sankey.SankeyLink<SankeyNode, SankeyLink>;

// Helper function to detect and remove circular links using DFS
function removeCircularLinks(links: SankeyLink[], nodeCount: number): SankeyLink[] {
    const acyclicLinks: SankeyLink[] = [];
    const adjacencyList: Map<number, number[]> = new Map();

    // Build adjacency list incrementally and check for cycles
    for (const link of links) {
        const { source, target } = link;

        // Create a temporary adjacency list including this link
        const tempAdjList = new Map(adjacencyList);
        if (!tempAdjList.has(source)) {
            tempAdjList.set(source, []);
        }
        tempAdjList.get(source)!.push(target);

        // Check if adding this link creates a cycle
        if (!hasCycle(tempAdjList, nodeCount)) {
            // No cycle, keep this link
            acyclicLinks.push(link);
            if (!adjacencyList.has(source)) {
                adjacencyList.set(source, []);
            }
            adjacencyList.get(source)!.push(target);
        } else {
            console.warn(`Removing circular link: ${source} → ${target}`);
        }
    }

    return acyclicLinks;
}

// DFS-based cycle detection
function hasCycle(adjacencyList: Map<number, number[]>, nodeCount: number): boolean {
    const visited = new Set<number>();
    const recStack = new Set<number>();

    function dfs(node: number): boolean {
        visited.add(node);
        recStack.add(node);

        const neighbors = adjacencyList.get(node) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor)) {
                    return true;
                }
            } else if (recStack.has(neighbor)) {
                // Found a back edge (cycle)
                return true;
            }
        }

        recStack.delete(node);
        return false;
    }

    // Check all nodes
    for (let i = 0; i < nodeCount; i++) {
        if (!visited.has(i) && adjacencyList.has(i)) {
            if (dfs(i)) {
                return true;
            }
        }
    }

    return false;
}

const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: string;
    }>({ visible: false, x: 0, y: 0, content: '' });

    useEffect(() => {
        if (!data || !data.nodes.length || !data.links.length || !svgRef.current || !containerRef.current) {
            return;
        }

        try {
            setError(null);
            const container = containerRef.current;
            const width = container.clientWidth;
            const height = 800;
            const margin = { top: 40, right: 250, bottom: 40, left: 250 };

            // Clear previous content
            const svg = select(svgRef.current);
            svg.selectAll('*').remove();

            // Prepare data - add index to each node for D3 Sankey
            const nodesWithIndex = data.nodes.map((d, i) => ({ ...d, index: i }));

            // Validate links - ensure all source/target indices exist
            const validLinks = data.links.filter(link => {
                const sourceExists = link.source >= 0 && link.source < data.nodes.length;
                const targetExists = link.target >= 0 && link.target < data.nodes.length;
                if (!sourceExists || !targetExists) {
                    console.warn(`Invalid link: source=${link.source}, target=${link.target}, nodes.length=${data.nodes.length}`);
                }
                return sourceExists && targetExists;
            });

            // Remove circular links to create a DAG (Directed Acyclic Graph)
            // D3-Sankey requires no cycles in the graph
            const acyclicLinks = removeCircularLinks(validLinks, data.nodes.length);

            // Create Sankey generator
            const sankeyGenerator = d3Sankey
                .sankey<SankeyNode & { index: number }, SankeyLink>()
                .nodeId((d) => (d as SankeyNode & { index: number }).index)
                .nodeWidth(20)
                .nodePadding(30)
                .extent([
                    [margin.left, margin.top],
                    [width - margin.right, height - margin.bottom],
                ]);

            // Prepare data for D3 Sankey
            const sankeyData = {
                nodes: nodesWithIndex.map((d) => ({ ...d })),
                links: acyclicLinks.map((d) => ({ ...d })),
            };

            // Generate the Sankey diagram layout
            const { nodes, links } = sankeyGenerator(sankeyData as d3Sankey.SankeyGraph<SankeyNode & { index: number }, SankeyLink>);

            // Define gradients for links
            const defs = svg.append('defs');
            links.forEach((link, i: number) => {
                const sourceNode = link.source as D3SankeyNode;
                const targetNode = link.target as D3SankeyNode;

                const gradient = defs
                    .append('linearGradient')
                    .attr('id', `gradient-${i}`)
                    .attr('gradientUnits', 'userSpaceOnUse')
                    .attr('x1', sourceNode.x1 || 0)
                    .attr('x2', targetNode.x0 || 0);

                gradient
                    .append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', (sourceNode as { isGoal?: boolean }).isGoal ? '#10b981' : '#3b82f6')
                    .attr('stop-opacity', 0.4);

                gradient
                    .append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', (targetNode as { isGoal?: boolean }).isGoal ? '#10b981' : '#8b5cf6')
                    .attr('stop-opacity', 0.4);
            });

            // Draw links
            const linkGroup = svg.append('g').attr('class', 'links');

            linkGroup
                .selectAll('path')
                .data(links)
                .enter()
                .append('path')
                .attr('d', d3Sankey.sankeyLinkHorizontal() as unknown as string)
                .attr('stroke', (_d, i: number) => `url(#gradient-${i})`)
                .attr('stroke-width', (d) => Math.max(2, (d as D3SankeyLink).width || 2))
                .attr('fill', 'none')
                .attr('opacity', 0.6)
                .on('mouseenter', function (this: SVGPathElement, event: MouseEvent, d) {
                    select(this).attr('opacity', 0.9).attr('stroke-width', function () {
                        const currentWidth = select(this).attr('stroke-width');
                        return parseFloat(currentWidth) * 1.2;
                    });
                    const link = d as unknown as D3SankeyLink;
                    const sourceNode = (link.source as unknown) as SankeyNode & { name: string };
                    const targetNode = (link.target as unknown) as SankeyNode & { name: string };
                    setTooltip({
                        visible: true,
                        x: event.pageX,
                        y: event.pageY,
                        content: `${sourceNode.name} → ${targetNode.name}\n${link.value} users`,
                    });
                })
                .on('mousemove', (event: MouseEvent) => {
                    setTooltip((prev) => ({ ...prev, x: event.pageX, y: event.pageY }));
                })
                .on('mouseleave', function (this: SVGPathElement, d) {
                    const link = d as unknown as D3SankeyLink;
                    select(this).attr('opacity', 0.6).attr('stroke-width', Math.max(2, (link as D3SankeyLink).width || 2));
                    setTooltip({ visible: false, x: 0, y: 0, content: '' });
                });

            // Draw nodes
            const nodeGroup = svg.append('g').attr('class', 'nodes');

            const node = nodeGroup
                .selectAll('g')
                .data(nodes)
                .enter()
                .append('g')
                .attr('class', 'node');

            node
                .append('rect')
                .attr('x', (d) => (d as D3SankeyNode).x0 || 0)
                .attr('y', (d) => (d as D3SankeyNode).y0 || 0)
                .attr('height', (d) => ((d as D3SankeyNode).y1 || 0) - ((d as D3SankeyNode).y0 || 0))
                .attr('width', (d) => ((d as D3SankeyNode).x1 || 0) - ((d as D3SankeyNode).x0 || 0))
                .attr('fill', (d) => ((d as D3SankeyNode).isGoal ? '#10b981' : '#3b82f6'))
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('opacity', 0.95)
                .attr('rx', 4)
                .attr('ry', 4)
                .on('mouseenter', function (this: SVGRectElement, event: MouseEvent, d) {
                    select(this).attr('opacity', 1);
                    const node = d as D3SankeyNode;
                    setTooltip({
                        visible: true,
                        x: event.pageX,
                        y: event.pageY,
                        content: `${node.name}${node.isGoal ? ' 🎯' : ''}`,
                    });
                })
                .on('mousemove', (event: MouseEvent) => {
                    setTooltip((prev) => ({ ...prev, x: event.pageX, y: event.pageY }));
                })
                .on('mouseleave', function (this: SVGRectElement) {
                    select(this).attr('opacity', 0.9);
                    setTooltip({ visible: false, x: 0, y: 0, content: '' });
                });

            // Add node labels with better positioning and wrapping
            node
                .append('text')
                .attr('x', (d) => {
                    const node = d as D3SankeyNode;
                    return (node.x0 || 0) < width / 2 ? (node.x1 || 0) + 8 : (node.x0 || 0) - 8;
                })
                .attr('y', (d) => {
                    const node = d as D3SankeyNode;
                    return ((node.y1 || 0) + (node.y0 || 0)) / 2;
                })
                .attr('dy', '0.35em')
                .attr('text-anchor', (d) => {
                    const node = d as D3SankeyNode;
                    return (node.x0 || 0) < width / 2 ? 'start' : 'end';
                })
                .attr('font-size', '13px')
                .attr('font-weight', '500')
                .attr('fill', 'currentColor')
                .style('pointer-events', 'none')
                .each(function (d) {
                    const node = d as D3SankeyNode;
                    const text = node.name || '';
                    const textElement = select(this);

                    // Truncate long text
                    if (text.length > 25) {
                        textElement.text(text.substring(0, 22) + '...');
                    } else {
                        textElement.text(text);
                    }
                });
        } catch (err) {
            console.error('Error rendering Sankey diagram:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
    }, [data]);

    if (!data || !data.nodes.length || !data.links.length) {
        return (
            <div className="flex items-center justify-center h-[400px] text-gray-400">
                <p>No data available for visualization</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-red-500">
                <p className="font-semibold mb-2">Error rendering diagram</p>
                <p className="text-sm text-gray-500">{error}</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <svg ref={svgRef} width="100%" height="800" className="overflow-visible" style={{ background: 'transparent' }} />
            {tooltip.visible && (
                <div
                    className="fixed bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border-2 border-blue-200 dark:border-blue-700 pointer-events-none z-50"
                    style={{
                        left: tooltip.x + 10,
                        top: tooltip.y + 10,
                    }}
                >
                    <p className="text-sm font-semibold whitespace-pre-line">{tooltip.content}</p>
                </div>
            )}
        </div>
    );
};

export default SankeyDiagram;
