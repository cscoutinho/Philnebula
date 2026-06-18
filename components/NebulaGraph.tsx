

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { color } from 'd3-color';
import { drag, type D3DragEvent } from 'd3-drag';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceX, forceY, type Simulation } from 'd3-force';
import { scaleOrdinal, scaleSqrt } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { pointer, select } from 'd3-selection';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import type { D3Node, D3Link } from '../types';

interface NebulaGraphProps {
    nodes: D3Node[];
    hierarchicalLinks: D3Link[];
    crossLinks: D3Link[];
    onNodeSelect: (node: D3Node | null) => void;
    selectedNode: D3Node | null;
    focusedNode: D3Node | null;
    hoveredNode: D3Node | null;
    nodeIdsWithNewPublications: Set<number>;
}

const NebulaGraph: React.FC<NebulaGraphProps> = ({ nodes, hierarchicalLinks, crossLinks, onNodeSelect, selectedNode, focusedNode, hoveredNode, nodeIdsWithNewPublications }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simulationRef = useRef<Simulation<D3Node, D3Link> | null>(null);
    const transformRef = useRef(zoomIdentity);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const colorScale = useRef(scaleOrdinal(schemeCategory10));
    const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);

    const radiusScale = useMemo(() => {
        if (!nodes.length) {
            return () => 3;
        }
        const maxChildren = Math.max(...nodes.map(n => n.children.length));
        // Use a square root scale to make differences more apparent without having gigantic nodes
        return scaleSqrt()
            .domain([0, maxChildren])
            .range([3, 20]); // Min radius 3px, max 20px
    }, [nodes]);

    const selectedNodeRef = useRef(selectedNode);
    useEffect(() => {
        selectedNodeRef.current = selectedNode;
    }, [selectedNode]);

    const crossLinksRef = useRef(crossLinks);
    useEffect(() => {
        crossLinksRef.current = crossLinks;
    }, [crossLinks]);

    const hoveredNodeRef = useRef(hoveredNode);
    useEffect(() => {
        hoveredNodeRef.current = hoveredNode;
    }, [hoveredNode]);

    const nodeIdsWithNewRef = useRef(nodeIdsWithNewPublications);
    useEffect(() => {
        nodeIdsWithNewRef.current = nodeIdsWithNewPublications;
    }, [nodeIdsWithNewPublications]);


    const ticked = useCallback(() => {
        if (!contextRef.current || !canvasRef.current) return;
        const context = contextRef.current;
        const canvas = canvasRef.current;
        const transform = transformRef.current;
        const currentSelectedNode = selectedNodeRef.current;
        const currentCrossLinks = crossLinksRef.current;
        const currentHoveredNode = hoveredNodeRef.current;
        const currentIdsWithNew = nodeIdsWithNewRef.current;
        const time = performance.now();

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(transform.x, transform.y);
        context.scale(transform.k, transform.k);
        
        const animationProgress = (time / 3000) % 1; // 3-second loop

        const parentLinkColor = '#33ff99'; // Green
        const childLinkColor = '#33ccff';   // Blue
        const crossLinkColor = '#e024a7'; // Magenta

        // Draw hierarchical links
        context.setLineDash([]);
        hierarchicalLinks.forEach(d => {
            const source = d.source as D3Node;
            const target = d.target as D3Node;

            // This is a robust check to ensure that the source and target of the link
            // have been resolved to objects by the d3 simulation and that they have
            // coordinates, preventing errors during the initial ticks of the simulation.
            if (
                !source || typeof source !== 'object' || source.x == null || source.y == null ||
                !target || typeof target !== 'object' || target.x == null || target.y == null
            ) {
                return;
            }

            context.beginPath();
            context.moveTo(source.x, source.y);
            context.lineTo(target.x, target.y);
            
            let strokeStyle = 'rgba(255, 255, 255, 0.1)';
            let lineWidth = 1;
            let isAnimated = false;

            if (currentSelectedNode) {
                 if (source.id === currentSelectedNode.id || target.id === currentSelectedNode.id) {
                    lineWidth = 1.5;
                    isAnimated = true;
                    if (source.id === currentSelectedNode.id) { // Child link
                        strokeStyle = childLinkColor;
                    } else if (target.id === currentSelectedNode.id && source.id === currentSelectedNode.parent?.id) { // Parent link
                        strokeStyle = parentLinkColor;
                    } else {
                        // For sibling links, don't animate with trails, just highlight.
                        isAnimated = false;
                        if (currentSelectedNode.parent && source.id === currentSelectedNode.parent.id) {
                             strokeStyle = 'rgba(51, 255, 153, 0.5)'; // Semi-transparent green
                        }
                    }
                }
            }
            
            if (isAnimated) {
                const gradient = context.createLinearGradient(source.x, source.y, target.x, target.y);
                const baseColor = color(strokeStyle)!.rgb();
                const trailPos = animationProgress;
                const trailLength = 0.6;

                gradient.addColorStop(Math.max(0, trailPos - trailLength), `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0)`);
                gradient.addColorStop(trailPos, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.9)`);
                gradient.addColorStop(Math.min(1, trailPos + trailLength), `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0)`);
                
                context.strokeStyle = gradient;
                context.lineWidth = 2.5 / transform.k;
            } else {
                context.strokeStyle = strokeStyle;
                context.lineWidth = lineWidth / transform.k;
            }
            context.stroke();
        });

        // Draw cross-links (AI-generated)
        if (currentCrossLinks.length > 0) {
            context.save();
            context.setLineDash([]); // Solid line for gradient effect
            currentCrossLinks.forEach(link => {
                const sourceNode = nodes.find(n => n.id === link.source);
                const targetNode = nodes.find(n => n.id === link.target);

                if (sourceNode && targetNode && sourceNode.x != null && sourceNode.y != null && targetNode.x != null && targetNode.y != null) {
                    context.beginPath();
                    context.moveTo(sourceNode.x, sourceNode.y);
                    context.lineTo(targetNode.x, targetNode.y);

                    const isHoveredLink = currentHoveredNode && 
                        ((sourceNode.id === currentSelectedNode?.id && targetNode.id === currentHoveredNode.id) || 
                         (targetNode.id === currentSelectedNode?.id && sourceNode.id === currentHoveredNode.id));

                    if (isHoveredLink) {
                        context.strokeStyle = '#00f6ff'; // Bright cyan for hovered link
                        context.lineWidth = 3 / transform.k;

                    } else {
                        const gradient = context.createLinearGradient(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
                        const baseColor = color(crossLinkColor)!.rgb();
                        const trailPos = (animationProgress + 0.5) % 1; // Offset animation
                        const trailLength = 0.6;
        
                        gradient.addColorStop(Math.max(0, trailPos - trailLength), `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0)`);
                        gradient.addColorStop(trailPos, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.9)`);
                        gradient.addColorStop(Math.min(1, trailPos + trailLength), `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0)`);
        
                        context.strokeStyle = gradient;
                        context.lineWidth = 2.5 / transform.k;
                    }
                    context.stroke();
                }
            });
            context.restore();
        }

        const crossLinkedNodeIds = new Set(currentCrossLinks.flatMap(l => [l.source, l.target]));

        const pulseColors = ['#06b6d4', '#d946ef', '#facc15', '#4ade80']; // cyan-500, fuchsia-500, yellow-400, green-400
        const haloTime = time / 2000; // 2-second pulse cycle
        const haloPulse = haloTime % 1; // Progress from 0 to 1 for size/opacity
        const colorIndex = Math.floor(haloTime) % pulseColors.length;
        const cycleColorString = pulseColors[colorIndex];
        const cycleColor = color(cycleColorString)!;

        // Draw "sonar" pulse for nodes with new publications. This is drawn before nodes so it's in the background.
        if (currentIdsWithNew.size > 0) {
            const haloColorRgb = cycleColor.rgb();

            nodes.forEach(d => {
                if (d.x == null || d.y == null) return;

                if (currentIdsWithNew.has(d.id)) {
                    context.beginPath();
                    // Radius expands from 0 to a max screen-space size of 60px
                    const haloRadius = (haloPulse * 60) / transform.k;
                    // Opacity fades out as it expands
                    const haloOpacity = Math.max(0, 0.7 * (1 - haloPulse));

                    context.arc(d.x, d.y, haloRadius, 0, 2 * Math.PI);
                    context.strokeStyle = `rgba(${haloColorRgb.r}, ${haloColorRgb.g}, ${haloColorRgb.b}, ${haloOpacity})`;
                    // Stroke width gets thinner as it expands
                    context.lineWidth = Math.max(0, (4 * (1 - haloPulse))) / transform.k;
                    context.stroke();
                }
            });
        }

        // Draw nodes
        const pulse = (Math.sin(time / 400) + 1) / 2;
        nodes.forEach(d => {
            if (d.x == null || d.y == null) return;
            context.beginPath();
            const radius = radiusScale(d.children.length);
            context.arc(d.x, d.y, radius, 0, 2 * Math.PI);
            
            if (currentIdsWithNew.has(d.id)) {
                 // Use the color from the 2-second cycle, but the brightness from the fast pulse
                context.fillStyle = cycleColor.brighter(pulse).toString();
                context.shadowColor = cycleColor.brighter(pulse).toString();
                context.shadowBlur = 15 + pulse * 20;
            } else if (currentHoveredNode && d.id === currentHoveredNode.id) {
                context.fillStyle = '#00f6ff';
                context.shadowColor = '#00f6ff';
                context.shadowBlur = 20 + pulse * 20;
            } else if (currentSelectedNode && d.id === currentSelectedNode.id) {
                context.fillStyle = 'hsl(55, 100%, 75%)';
                context.shadowColor = 'hsl(55, 100%, 75%)';
                context.shadowBlur = 15 + pulse * 20;
            } else if (crossLinkedNodeIds.has(d.id)) {
                context.fillStyle = crossLinkColor;
                context.shadowColor = crossLinkColor;
                context.shadowBlur = 10 + pulse * 10;
            }
            else {
                context.fillStyle = colorScale.current(d.depth.toString());
                context.shadowColor = colorScale.current(d.depth.toString());
                context.shadowBlur = 12;
            }
            context.fill();
        });
        
        context.shadowBlur = 0;

        // Draw labels for larger nodes
        nodes.forEach(d => {
            if (d.x == null || d.y == null) return;
            const radius = radiusScale(d.children.length);
            if (transform.k * radius > 5 || (currentHoveredNode && d.id === currentHoveredNode.id)) {
                context.fillStyle = '#fff';
                context.font = `${Math.min(12, 10 / transform.k)}px Inter`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(d.name, d.x, d.y - radius - (5 / transform.k));
            }
        });

        context.restore();
    }, [nodes, hierarchicalLinks, radiusScale]);

    // Animation loop
    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            // Only run animations if there's an active state to display
            if (selectedNodeRef.current || hoveredNodeRef.current || nodeIdsWithNewRef.current.size > 0) {
                ticked();
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [ticked]);


    useEffect(() => {
        if (!canvasRef.current || !nodes.length) return;
        const canvas = canvasRef.current;
        contextRef.current = canvas.getContext('2d');
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        const simulation = forceSimulation<D3Node, D3Link>(nodes)
            .force("link", forceLink<D3Node, D3Link>(hierarchicalLinks).id(d => d.id).distance(d => 50 - (d.target as D3Node).depth * 5).strength(0.1))
            .force("charge", forceManyBody<D3Node>().strength(d => -20 * radiusScale(d.children.length)))
            .force("center", forceCenter(width / 2, height / 2))
            .force("x", forceX(width / 2).strength(0.01))
            .force("y", forceY(height / 2).strength(0.01))
            .on('tick', () => {
                // The simulation tick just updates positions.
                // The animation loop handles drawing, unless there's an active state.
                if (!selectedNodeRef.current && !hoveredNodeRef.current && nodeIdsWithNewRef.current.size === 0) {
                    ticked();
                }
            });
        simulationRef.current = simulation;

        const dragSubject = (event: D3DragEvent<HTMLCanvasElement, D3Node, D3Node> | PointerEvent): D3Node | null => {
            const [mx, my] = pointer(event, canvas);
            const transform = transformRef.current;
            const tx = (mx - transform.x) / transform.k;
            const ty = (my - transform.y) / transform.k;
            
            let closestNode: D3Node | null = null;
            let minDistance = Infinity;

            for (const node of nodes) {
                if (node.x == null || node.y == null) continue;
                const dist = Math.hypot(tx - node.x, ty - node.y);
                const radius = radiusScale(node.children.length);
                if (dist < minDistance && dist < radius + 10 / transform.k) {
                    minDistance = dist;
                    closestNode = node;
                }
            }
            return closestNode;
        }

        const dragstarted = (event: D3DragEvent<HTMLCanvasElement, D3Node, D3Node>) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        const dragged = (event: D3DragEvent<HTMLCanvasElement, D3Node, D3Node>) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        const dragended = (event: D3DragEvent<HTMLCanvasElement, D3Node, D3Node>) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        const zoomed = (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
            transformRef.current = event.transform;
            ticked();
        }

        const d3Canvas = select(canvas);

        const dragBehavior = drag<HTMLCanvasElement, D3Node>()
            .container(canvas)
            .subject(dragSubject)
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

        const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([0.02, 8])
            .on("zoom", zoomed);
        
        zoomBehaviorRef.current = zoomBehavior;
        
        d3Canvas.call(dragBehavior).call(zoomBehavior);
        
        d3Canvas.on("click", (event: PointerEvent) => {
            if (event.defaultPrevented) return;
            const subject = dragSubject(event);
            onNodeSelect(subject);
        });

        const handleResize = () => {
            if (!canvasRef.current || !simulationRef.current) return;
            const newWidth = canvasRef.current.offsetWidth;
            const newHeight = canvasRef.current.offsetHeight;
            canvasRef.current.width = newWidth;
            canvasRef.current.height = newHeight;
            simulationRef.current.force("center", forceCenter(newWidth / 2, newHeight / 2));
            simulationRef.current.alpha(1).restart();
            ticked();
        };

        window.addEventListener('resize', handleResize);
        
        ticked(); // Initial draw

        return () => {
            simulation.stop();
            d3Canvas.on(".drag", null);
            d3Canvas.on(".zoom", null);
            d3Canvas.on("click", null);
            window.removeEventListener('resize', handleResize);
        };
    }, [nodes, hierarchicalLinks, onNodeSelect, ticked, radiusScale]);

    useEffect(() => {
        if (focusedNode && simulationRef.current && canvasRef.current && zoomBehaviorRef.current) {
            const canvas = canvasRef.current;
            const k = 2;
            const x = canvas.offsetWidth / 2 - (focusedNode.x || 0) * k;
            const y = canvas.offsetHeight / 2 - (focusedNode.y || 0) * k;
            
            const newTransform = zoomIdentity.translate(x, y).scale(k);

            (select(canvas) as any)
              .transition().duration(750)
              .call(zoomBehaviorRef.current.transform, newTransform);
        }
    }, [focusedNode]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full block absolute top-0 left-0"
            aria-label="Interactive graph of PhilPapers categories"
        />
    );
};

export default NebulaGraph;