import { useState, useRef, useEffect, useCallback } from 'react';
import { select, pointer } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import type { MapNode, MapLink, MapBuilderProps, LogicalWorkbenchState, KindleNote } from '../../../types';

interface useMapInteractionProps extends Pick<MapBuilderProps, 'layout' | 'setLayout' | 'logActivity' | 'onAddNoteToMap' | 'onAddMultipleNotesToMap' | 'notesToPlace' | 'onClearNotesToPlace' | 'onAppendToNodeNotes'> {
    svgRef: React.RefObject<SVGSVGElement>;
    uiState: ReturnType<typeof import('./useMapUI').useMapUI>;
    aiState: ReturnType<typeof import('./useMapAI').useMapAI>;
    nodeMap: Map<string | number, MapNode>;
    dropTargetNodeId: string | number | null;
    setDropTargetNodeId: (id: string | number | null) => void;
}

export const useMapInteraction = ({
    svgRef,
    layout,
    setLayout,
    logActivity,
    uiState,
    aiState,
    nodeMap,
    onAddNoteToMap,
    onAddMultipleNotesToMap,
    onAppendToNodeNotes,
    dropTargetNodeId,
    setDropTargetNodeId,
    notesToPlace,
    onClearNotesToPlace,
}: useMapInteractionProps) => {
    const {
        clearSelections,
        setFloatingTooltip,
        editingNodeId,
        setEditingNodeId,
        linkingNode,
        setLinkingNode,
        relationshipMenu,
        setRelationshipMenu,
        selectedNodeId,
        setSelectedNodeId,
        regionSelectedNodeIds,
        setRegionSelectedNodeIds,
        setNodeContextMenu,
    } = uiState;
    const { nodes, links } = layout;

    const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const transformRef = useRef(zoomIdentity);
    const isDraggingSelection = useRef(false);
    const dragOccurred = useRef(false);
    const dragStartPositions = useRef<Map<string | number, { x: number; y: number }>>(new Map());


    const [resizingState, setResizingState] = useState<{ nodeId: number | string, initialWidth: number, initialHeight: number, startX: number, startY: number, shape: 'rect' | 'circle' } | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);
    
    const getPointInWorldSpace = useCallback((event: React.MouseEvent | React.PointerEvent | PointerEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const [mx, my] = pointer(event, svgRef.current);
        const [worldX, worldY] = transformRef.current.invert([mx, my]);
        return { x: worldX, y: worldY };
    }, [svgRef]);

    const updateNodePosition = useCallback((nodeId: number | string, x: number, y: number) => {
        setLayout(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n)
        }));
    }, [setLayout]);

    const handleNodeTap = (e: React.MouseEvent | PointerEvent, node: MapNode) => {
        if (notesToPlace && notesToPlace.length > 0) {
            onAppendToNodeNotes(node.id, notesToPlace);
            onClearNotesToPlace();
            setDropTargetNodeId(null);
            return;
        }
        
        setFloatingTooltip(null);
        setEditingNodeId(null);
    
        const sourceNotes = node.userNotes?.filter(n => n.title.startsWith("From: "));
    
        if (sourceNotes && sourceNotes.length > 0) {
            const kindleLikeNotes: KindleNote[] = sourceNotes.map(un => ({
                id: un.id,
                heading: un.title.replace(/^From: /, ''),
                text: un.content.replace(/<p><br\s*\/?>\s*<\/p>$/, '').replace(/<[^>]+>/g, ' ').trim(),
                page: null,
                type: 'note',
                sourceId: 'unknown',
            }));
            setFloatingTooltip({ x: e.clientX, y: e.clientY, title: `Source Note${sourceNotes.length > 1 ? 's' : ''}`, text: kindleLikeNotes, type: 'source_note' });
        } else if ((node.isAiGenerated || node.isDialectic || node.isHistorical) && node.synthesisInfo) {
             setFloatingTooltip({ x: e.clientX, y: e.clientY, title: node.name, text: node.synthesisInfo.synthesis, type: 'synthesis' });
        }
         if (node.isCitation && node.citationData) {
            setFloatingTooltip({ x: e.clientX, y: e.clientY, title: 'Citation Details', text: [node.citationData], type: 'citation' });
        }
    
        if (linkingNode !== null) {
            if (linkingNode !== node.id) {
                const existingLink = links.find(l => (l.source === linkingNode && l.target === node.id) || (l.source === node.id && l.target === linkingNode));
                if (!existingLink) {
                    const sourceNode = nodeMap.get(linkingNode);
                    if (sourceNode) {
                        const midPoint = {
                            x: (sourceNode.x + node.x) / 2,
                            y: (sourceNode.y + node.y) / 2,
                        };
                        const [screenX, screenY] = transformRef.current.apply([midPoint.x, midPoint.y]);
                        setRelationshipMenu({
                            sourceId: linkingNode,
                            targetId: node.id,
                            x: screenX,
                            y: screenY,
                        });
                    }
                }
            }
            setLinkingNode(null);
        } else {
            setSelectedNodeId(node.id);
            setRegionSelectedNodeIds(new Set());
        }
    };
    
    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (notesToPlace && notesToPlace.length > 0) {
            const { x, y } = getPointInWorldSpace(e);
            if (notesToPlace.length === 1) {
                onAddNoteToMap(notesToPlace[0], { x, y });
            } else {
                onAddMultipleNotesToMap(notesToPlace, { x, y });
            }
            onClearNotesToPlace();
            return;
        }

        if (!isDraggingSelection.current) {
            clearSelections();
            aiState.setDefinitionAnalysisState(null);
        }
        if (editingNodeId) {
            const node = nodeMap.get(editingNodeId);
            if (node?.isUserDefined && node.name === "New Concept") {
                 logActivity('CREATE_USER_NODE', { conceptName: node.name, conceptId: node.id });
            }
            setEditingNodeId(null);
        }
    };

    const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
        if ((e.target as SVGElement).id !== 'map-background') return;
        
        const { x, y } = getPointInWorldSpace(e);
        const newId = `user_${Date.now()}`;
        const newNode: MapNode = {
            id: newId,
            name: "New Concept",
            x,
            y,
            shape: 'rect',
            width: 150,
            height: 40,
            isUserDefined: true,
        };
        setLayout(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
        setEditingNodeId(newId);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        isDraggingSelection.current = false;
        if ((e.target as SVGElement).id === 'map-background' && e.button === 0 && e.shiftKey) {
            e.stopPropagation(); 
            clearSelections();
            const { x, y } = getPointInWorldSpace(e);
            setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }
    };

    useEffect(() => {
        const handlePointerMoveEvent = (e: PointerEvent) => {
            e.preventDefault();
            isDraggingSelection.current = true;
            
            const { x: endX, y: endY } = getPointInWorldSpace(e);

            setSelectionBox(prevBox => {
                if (!prevBox) return null;
                const newSelectionBox = { ...prevBox, endX, endY };
                
                const xMin = Math.min(newSelectionBox.startX, newSelectionBox.endX);
                const xMax = Math.max(newSelectionBox.startX, newSelectionBox.endX);
                const yMin = Math.min(newSelectionBox.startY, newSelectionBox.endY);
                const yMax = Math.max(newSelectionBox.startY, newSelectionBox.endY);

                const selectedIds = new Set<number|string>();
                nodes.forEach(node => {
                    if (node.x >= xMin && node.x <= xMax && node.y >= yMin && node.y <= yMax) {
                        selectedIds.add(node.id);
                    }
                });
                setRegionSelectedNodeIds(selectedIds);
                return newSelectionBox;
            });
        };

        const handlePointerUpEvent = () => {
            setSelectionBox(null);
        };

        if (selectionBox) {
            window.addEventListener('pointermove', handlePointerMoveEvent);
            window.addEventListener('pointerup', handlePointerUpEvent, { once: true });
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMoveEvent);
            window.removeEventListener('pointerup', handlePointerUpEvent);
        };
    }, [selectionBox, getPointInWorldSpace, nodes, setRegionSelectedNodeIds]);

    const handleResizeStart = (e: React.PointerEvent, node: MapNode) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingState({
            nodeId: node.id,
            initialWidth: node.width,
            initialHeight: node.height,
            startX: e.clientX,
            startY: e.clientY,
            shape: node.shape,
        });
    };

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!resizingState) return;
            const dx = (e.clientX - resizingState.startX) / transformRef.current.k;
            const dy = (e.clientY - resizingState.startY) / transformRef.current.k;
            
            let newWidth = resizingState.initialWidth + dx;
            let newHeight = resizingState.initialHeight + dy;
            
            if (resizingState.shape === 'circle') {
                const newDiameter = Math.max(newWidth, newHeight);
                newWidth = newDiameter;
                newHeight = newDiameter;
            }

            setLayout(prev => ({
                ...prev,
                nodes: prev.nodes.map(n =>
                    n.id === resizingState.nodeId ? { ...n, width: Math.max(40, newWidth), height: Math.max(40, newHeight) } : n
                )
            }));
        };

        const handlePointerUp = () => setResizingState(null);

        if (resizingState) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [resizingState, setLayout]);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        
        if (!zoomBehaviorRef.current) {
             const zoomBehavior = zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .filter(event => !event.shiftKey)
                .on('zoom', (event) => {
                    if (resizingState) return;
                    transformRef.current = event.transform;
                    select('#map-content-group').attr('transform', event.transform.toString());
                    uiState.setZoomLevel(event.transform.k);
                });
            zoomBehaviorRef.current = zoomBehavior;
            svg.call(zoomBehavior).on("dblclick.zoom", null);
        }

        const handlePointerMoveEvent = (e: PointerEvent) => {
            if (notesToPlace && notesToPlace.length > 0) {
                const targetElement = e.target as SVGElement;
                const nodeG = targetElement.closest('g.map-node');
                if (nodeG && (nodeG as any).__data__) {
                    const nodeData = (nodeG as any).__data__ as MapNode;
                    setDropTargetNodeId(nodeData.id);
                } else {
                    setDropTargetNodeId(null);
                }
            }
        };
        
        svgRef.current.addEventListener('pointermove', handlePointerMoveEvent);

        const dragBehavior = drag<SVGGElement, MapNode>()
            .filter(event => {
                const target = event.target as SVGElement;
                return !resizingState && event.button === 0 && !target.classList.contains('resize-handle') && target.closest('foreignObject') === null;
            })
            .on('start', (event, d) => {
                dragOccurred.current = false;
                select(event.sourceEvent.target.closest('g')).raise();
                 if (!regionSelectedNodeIds.has(d.id)) {
                    setSelectedNodeId(d.id);
                    setRegionSelectedNodeIds(new Set());
                }
                dragStartPositions.current.clear();
                nodes.forEach(n => {
                    if (regionSelectedNodeIds.has(n.id)) {
                        dragStartPositions.current.set(n.id, { x: n.x, y: n.y });
                    }
                });
            })
            .on('drag', (event, d) => {
                if (event.dx !== 0 || event.dy !== 0) {
                    dragOccurred.current = true;
                }
                 if (regionSelectedNodeIds.has(d.id)) {
                    // Multi-node drag
                    setLayout(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n => 
                            regionSelectedNodeIds.has(n.id) ? { ...n, x: n.x + event.dx, y: n.y + event.dy } : n
                        )
                    }));
                } else {
                    // Single-node drag
                    updateNodePosition(d.id, event.x, event.y);
                }
            })
            .on('end', (event, d) => {
                if (dragOccurred.current) {
                    event.sourceEvent.preventDefault();
                    event.sourceEvent.stopPropagation();
                } else {
                    handleNodeTap(event.sourceEvent, d);
                }
                dragStartPositions.current.clear();
            });
        
        svg.select<SVGGElement>('#map-content-group')
            .selectAll<SVGGElement, MapNode>('g.map-node')
            .call(dragBehavior);
        
        const svgEl = svgRef.current;
        return () => {
             if (svgEl) {
                svgEl.removeEventListener('pointermove', handlePointerMoveEvent);
            }
        }
        
    }, [nodes, resizingState, regionSelectedNodeIds, setLayout, setRegionSelectedNodeIds, setSelectedNodeId, uiState, updateNodePosition, svgRef, notesToPlace, setDropTargetNodeId, handleNodeTap]);

    const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        const trayNodeData = e.dataTransfer.getData('application/json');
        const kindleNoteData = e.dataTransfer.getData('application/x-kindle-note');
        const multipleKindleNotesData = e.dataTransfer.getData('application/x-kindle-notes-multiple');
        
        setDropTargetNodeId(null); // Reset drop target on drop

        if (dropTargetNodeId && (kindleNoteData || multipleKindleNotesData)) {
            const notes = kindleNoteData ? [JSON.parse(kindleNoteData)] : JSON.parse(multipleKindleNotesData);
            onAppendToNodeNotes(dropTargetNodeId, notes);
            onClearNotesToPlace();
            return;
        }

        if (kindleNoteData) {
            const droppedNote: KindleNote = JSON.parse(kindleNoteData);
            const { x, y } = getPointInWorldSpace(e);
            onAddNoteToMap(droppedNote, { x, y });
        } else if (multipleKindleNotesData) {
            const notes: KindleNote[] = JSON.parse(multipleKindleNotesData);
            const { x, y } = getPointInWorldSpace(e);
            onAddMultipleNotesToMap(notes, { x, y });
        } else if (trayNodeData) {
            const droppedNode: { id: number; name: string; } = JSON.parse(trayNodeData);
            if (nodes.find(n => n.id === droppedNode.id)) return;
            const { x, y } = getPointInWorldSpace(e);
            setLayout(prev => ({ ...prev, nodes: [...prev.nodes, { id: droppedNode.id, name: droppedNode.name, x, y, shape: 'rect', width: 150, height: 40 }] }));
        }
    };

    const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
        e.preventDefault();
        const isNoteDrag = e.dataTransfer.types.includes('application/x-kindle-note') || e.dataTransfer.types.includes('application/x-kindle-notes-multiple');
        
        if (isNoteDrag) {
            const targetElement = e.target as SVGElement;
            const nodeG = targetElement.closest('g.map-node');
            if (nodeG && (nodeG as any).__data__) {
                const nodeData = (nodeG as any).__data__ as MapNode;
                setDropTargetNodeId(nodeData.id);
            } else {
                setDropTargetNodeId(null);
            }
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'move';
        }
    };

    const handleNodeContextMenu = (e: React.MouseEvent, nodeId: number | string) => {
        e.preventDefault();
        e.stopPropagation();
        clearSelections();
        setSelectedNodeId(nodeId);
        setNodeContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    };
    
    const handleNodeDoubleClick = (e: React.MouseEvent, node: MapNode) => {
        e.stopPropagation();
        if (node.isUserDefined) {
            setEditingNodeId(node.id);
        }
    };
    
    const handleOpenCombinedArgumentWorkbench = (e: React.MouseEvent) => {
        const selectedNodes = Array.from(uiState.regionSelectedNodeIds).map(id => nodeMap.get(id)).filter((n): n is MapNode => !!n);
        const internalLinks = links.filter(l => uiState.regionSelectedNodeIds.has(l.source) && uiState.regionSelectedNodeIds.has(l.target));
    
        const sourceIds = new Set(internalLinks.map(l => l.source));
        const targetIds = new Set(internalLinks.map(l => l.target));
    
        const conclusionNodes = selectedNodes.filter(n => targetIds.has(n.id) && !sourceIds.has(n.id));
        
        if (conclusionNodes.length !== 1) {
            alert("Invalid argument structure. Please select a group of nodes with exactly one final conclusion (a node that does not lead to any other selected node).");
            return;
        }
        
        const conclusion = conclusionNodes[0];
        const premises = selectedNodes.filter(n => n.id !== conclusion.id);
    
        if (premises.length === 0) {
            alert("Invalid argument structure. At least one premise is required.");
            return;
        }
    
        const workbenchState: LogicalWorkbenchState = {
            combinedArgument: { premises, conclusion },
            x: e.clientX,
            y: e.clientY
        };
        uiState.setLogicalWorkbench(workbenchState);
        aiState.handleFormalizeArgument(workbenchState);
    };

    return {
        zoomBehaviorRef,
        selectionBox,
        regionSelectedNodeIds: uiState.regionSelectedNodeIds,
        linkingNode,
        resizingState,
        handlePointerDown,
        handleDrop,
        handleDragOver,
        handleBackgroundClick,
        handleBackgroundDoubleClick,
        handleNodeContextMenu,
        handleNodeDoubleClick,
        handleResizeStart,
        updateNodePosition,
        handleOpenCombinedArgumentWorkbench,
    };
};
