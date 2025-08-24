import React, { useRef, useMemo, useState } from 'react';
import { useMapInteraction } from './hooks/useMapInteraction';
import NodeComponent from './NodeComponent';
import LinkComponent from './LinkComponent';
import { LassoIcon, SparkleIcon, FlaskConicalIcon, HelpCircleIcon, Trash2, BrainCircuit, X } from '../icons';
import { MapBuilderProps, RelationshipTypeInfo, MapNode, KindleNote, SocraticSuggestion } from '../../types';

interface MapCanvasProps extends Pick<MapBuilderProps, 'layout' | 'setLayout' | 'logActivity' | 'relationshipTypes' | 'allNodes' | 'onAddNoteToMap' | 'onAddMultipleNotesToMap' | 'notesToPlace' | 'onClearNotesToPlace' | 'onAppendToNodeNotes'> {
    relationshipColorMap: Record<string, string>;
    uiState: ReturnType<typeof import('./hooks/useMapUI').useMapUI>;
    aiState: ReturnType<typeof import('./hooks/useMapAI').useMapAI>;
    socraticSuggestions: SocraticSuggestion[];
    onSuggestionClick: (suggestion: SocraticSuggestion) => void;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
    layout,
    setLayout,
    logActivity,
    relationshipTypes,
    relationshipColorMap,
    uiState,
    aiState,
    allNodes,
    onAddNoteToMap,
    onAddMultipleNotesToMap,
    onAppendToNodeNotes,
    socraticSuggestions,
    onSuggestionClick,
    notesToPlace,
    onClearNotesToPlace,
}) => {
    const { nodes, links, logicalConstructs } = layout;
    const nodeMap = useMemo(() => new Map<string | number, MapNode>(nodes.map(n => [n.id, n])), [nodes]);
    const [dropTargetNodeId, setDropTargetNodeId] = useState<string | number | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    
    const {
        selectionBox,
        regionSelectedNodeIds,
        linkingNode,
        handlePointerDown,
        handleDrop,
        handleDragOver,
        handleBackgroundClick,
        handleBackgroundDoubleClick,
        handleNodeContextMenu,
        handleNodeDoubleClick,
        handleResizeStart,
        handleOpenCombinedArgumentWorkbench,
    } = useMapInteraction({
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
    });

    const regionActionPos = useMemo(() => {
        if (regionSelectedNodeIds.size < 2) return null;
        let maxX = -Infinity;
        let sumY = 0;
        let count = 0;

        regionSelectedNodeIds.forEach(id => {
            const node = nodeMap.get(id);
            if (node) {
                maxX = Math.max(maxX, node.x + node.width / 2);
                sumY += node.y;
                count++;
            }
        });

        if (count === 0) return null;
        return { x: maxX, y: sumY / count };
    }, [regionSelectedNodeIds, nodeMap]);

    const linksToHide = useMemo(() => {
        const hidden = new Set<string>();
        if (uiState.isLogicVizVisible && logicalConstructs) {
            logicalConstructs.forEach(c => {
                c.premiseNodeIds.forEach(pId => {
                    hidden.add(`${pId}-${c.conclusionNodeId}`);
                });
            });
        }
        return hidden;
    }, [uiState.isLogicVizVisible, logicalConstructs]);
    
    return (
        <>
            <svg
                ref={svgRef}
                className="w-full h-full bg-gray-900"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onPointerDown={handlePointerDown}
                onDoubleClick={handleBackgroundDoubleClick}
            >
                <rect id="map-background" width="100%" height="100%" fill="transparent" onClick={handleBackgroundClick} />
                <defs>
                    {relationshipTypes.map(relType => (
                        <marker key={`arrow-${relType.type}`} id={`arrow-${relType.type}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill={relType.color} />
                        </marker>
                    ))}
                     <marker id="arrow-Contextual" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" /></marker>
                     <marker id="arrow-Synthesizes" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" /></marker>
                    <marker id="arrow-logical-construct" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#2dd4bf" /></marker>
                    <marker id="arrow-Cited" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><circle cx="5" cy="5" r="3" fill="#6b7280" /></marker>
                </defs>
                <g id="map-content-group">
                    {links.filter(l => !linksToHide.has(`${l.source}-${l.target}`)).map((link) => (
                        <LinkComponent
                            key={`${link.source}-${link.target}`}
                            link={link}
                            nodeMap={nodeMap}
                            relationshipTypes={relationshipTypes}
                            relationshipColorMap={relationshipColorMap}
                            setFloatingTooltip={uiState.setFloatingTooltip}
                            handleLinkContextMenu={uiState.handleLinkContextMenu}
                            handlePinCitation={uiState.handlePinCitation}
                            generateJustification={aiState.generateJustification}
                            handleExploreImplications={aiState.handleExploreImplications}
                            handleFormalizeArgument={(link, e) => {
                                const state = { link, x: e.clientX, y: e.clientY };
                                uiState.setLogicalWorkbench(state);
                                aiState.handleFormalizeArgument(state);
                            }}
                        />
                    ))}
                    
                    {uiState.isLogicVizVisible && logicalConstructs?.map(construct => (
                        <LinkComponent.LogicalConstructVisual key={construct.id} construct={construct} nodeMap={nodeMap} onHover={(e, c) => uiState.setFloatingTooltip({x: e.clientX, y: e.clientY, type: 'logical_construct', text: c, title: 'Logical Construct'})} onLeave={() => uiState.setFloatingTooltip(null)} />
                    ))}

                    {nodes.map(node => (
                        <NodeComponent
                            key={node.id}
                            node={node}
                            isLinking={linkingNode !== null}
                            isSelected={uiState.selectedNodeId === node.id}
                            isRegionSelected={regionSelectedNodeIds.has(node.id)}
                            isAnalyzing={aiState.isAnalyzingGenealogy === node.id}
                            isEditing={uiState.editingNodeId === node.id}
                            isDropTarget={dropTargetNodeId === node.id}
                            linkingNodeId={linkingNode}
                            onContextMenu={handleNodeContextMenu}
                            onDoubleClick={handleNodeDoubleClick}
                            onNameChange={uiState.handleNodeNameChange}
                            setEditingNodeId={uiState.setEditingNodeId}
                            logActivity={logActivity}
                            onResizeStart={handleResizeStart}
                        />
                    ))}

                    {socraticSuggestions.map(suggestion => (
                         <foreignObject key={suggestion.id} x={suggestion.position.x - 12} y={suggestion.position.y - 12} width="24" height="24" className="overflow-visible cursor-pointer">
                            <button onClick={() => onSuggestionClick(suggestion)} className="w-full h-full flex items-center justify-center">
                                <HelpCircleIcon className="w-6 h-6 text-purple-400 animate-pulse" />
                            </button>
                        </foreignObject>
                    ))}
                    
                    {selectionBox && (
                        <rect x={Math.min(selectionBox.startX, selectionBox.endX)} y={Math.min(selectionBox.startY, selectionBox.endY)} width={Math.abs(selectionBox.startX - selectionBox.endX)} height={Math.abs(selectionBox.startY - selectionBox.endY)} fill="rgba(56, 189, 248, 0.2)" stroke="rgba(56, 189, 248, 0.8)" strokeWidth="1" strokeDasharray="4 2"/>
                    )}
                    {regionActionPos && (
                        <foreignObject x={regionActionPos.x + 20} y={regionActionPos.y - 24} width="150" height="48" className="overflow-visible">
                            <div className='flex gap-2'>
                                <button onClick={() => aiState.handleSynthesizeRegion(regionSelectedNodeIds)} disabled={aiState.isSynthesizing} className="flex items-center justify-center p-3 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-all disabled:bg-gray-500 w-12 h-12" title="Synthesize Region">
                                    <SparkleIcon className={`w-5 h-5 ${aiState.isSynthesizing ? 'animate-spin' : ''}`} />
                                </button>
                                 <button onClick={handleOpenCombinedArgumentWorkbench} className="flex items-center justify-center p-3 bg-teal-600 text-white rounded-lg shadow-lg hover:bg-teal-700 w-12 h-12" title="Analyze Combined Argument">
                                    <FlaskConicalIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => uiState.deleteSelection(regionSelectedNodeIds)} className="flex items-center justify-center p-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 w-12 h-12" title="Delete Selection">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </foreignObject>
                    )}
                </g>
            </svg>
             {notesToPlace && notesToPlace.length > 0 ? (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm p-3 rounded-lg text-cyan-200 text-base flex items-center gap-3 pointer-events-auto z-10 ring-2 ring-cyan-500 shadow-lg">
                    <BrainCircuit className="w-6 h-6 text-cyan-400"/>
                    <span>Tap on the map or a concept to place {notesToPlace.length} note{notesToPlace.length > 1 ? 's' : ''}.</span>
                     <button onClick={onClearNotesToPlace} className="p-1.5 -my-1 -mr-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-full" aria-label="Cancel note placement">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm p-2 rounded-lg text-gray-300 text-sm flex items-center gap-2 pointer-events-none">
                    <LassoIcon className="w-5 h-5 text-cyan-400" />
                    <span>Hold <kbd className="font-sans text-xs bg-gray-700 px-1.5 py-0.5 rounded">Shift</kbd> and drag to select. Double-click to create a new concept.</span>
                </div>
            )}
        </>
    );
};

export default MapCanvas;
