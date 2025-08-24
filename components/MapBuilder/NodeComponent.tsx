import React from 'react';
import type { MapNode, ProjectActivityType } from '../../types';
import { SparkleIcon, StickyNoteIcon, BookOpenIcon } from '../icons';

interface NodeComponentProps {
    node: MapNode;
    isLinking: boolean;
    isSelected: boolean;
    isRegionSelected: boolean;
    isAnalyzing: boolean;
    isEditing: boolean;
    isDropTarget: boolean;
    linkingNodeId: string | number | null;
    onContextMenu: (e: React.MouseEvent, nodeId: string | number) => void;
    onDoubleClick: (e: React.MouseEvent, node: MapNode) => void;
    onNameChange: (nodeId: string | number, newName: string) => void;
    setEditingNodeId: (id: string | number | null) => void;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
    onResizeStart: (e: React.PointerEvent, node: MapNode) => void;
}

const NodeComponent: React.FC<NodeComponentProps> & { getFill: (node: MapNode, state: { linkingNodeId: string | number | null; selectedNodeId: string | number | null; regionSelectedNodeIds: Set<string | number>; dropTargetNodeId: string | number | null }) => string; getStroke: (node: MapNode, state: { linkingNodeId: string | number | null; regionSelectedNodeIds: Set<string | number>; dropTargetNodeId: string | number | null }) => string; } = ({
    node,
    isLinking,
    isSelected,
    isRegionSelected,
    isAnalyzing,
    isEditing,
    isDropTarget,
    linkingNodeId,
    onContextMenu,
    onDoubleClick,
    onNameChange,
    setEditingNodeId,
    logActivity,
    onResizeStart,
}) => {
    const fill = NodeComponent.getFill(node, { linkingNodeId, selectedNodeId: isSelected ? node.id : null, regionSelectedNodeIds: isRegionSelected ? new Set([node.id]) : new Set(), dropTargetNodeId: isDropTarget ? node.id : null });
    const stroke = NodeComponent.getStroke(node, { linkingNodeId, regionSelectedNodeIds: isRegionSelected ? new Set([node.id]) : new Set(), dropTargetNodeId: isDropTarget ? node.id : null });
    const hasUserNotes = node.userNotes && node.userNotes.some(n => n.content.trim() !== '' && n.content.trim() !== '<p><br></p>');

    return (
        <g
            ref={el => {
                if (el) {
                    (el as any).__data__ = node;
                }
            }}
            transform={`translate(${node.x}, ${node.y})`}
            className={`map-node cursor-grab active:cursor-grabbing ${isLinking ? 'linking' : ''}`}
            onContextMenu={(e) => onContextMenu(e, node.id)}
            onDoubleClick={(e) => onDoubleClick(e, node)}
        >
            {isDropTarget && (
                <rect
                    x={-node.width / 2 - 10}
                    y={-node.height / 2 - 10}
                    width={node.width + 20}
                    height={node.height + 20}
                    rx="12"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="4"
                    strokeDasharray="8 8"
                    className="animate-[spin_4s_linear_infinite]"
                    style={{ strokeDashoffset: 16 }}
                />
            )}
            {node.shape === 'rect' ? (
                <rect
                    x={-node.width / 2}
                    y={-node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx="8"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={(node.isAiGenerated || node.isDialectic || node.isUserDefined || node.isCitation || isRegionSelected || node.isCounterExample) ? "3" : "2"}
                    strokeDasharray={node.isAiGenerated ? "4 4" : "none"}
                />
            ) : (
                <circle
                    r={node.width / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={(node.isAiGenerated || node.isHistorical || node.isDialectic || node.isUserDefined || node.isCitation || isRegionSelected || node.isCounterExample) ? "3" : "2"}
                    strokeDasharray={node.isAiGenerated ? "4 4" : "none"}
                />
            )}
            {isEditing ? (
                <foreignObject x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height}>
                    <div className="w-full h-full flex items-center justify-center p-1">
                        <input
                            type="text"
                            defaultValue={node.name}
                            className="w-full h-full bg-transparent text-white text-center text-sm outline-none border-none"
                            style={{ color: node.textColor || '#FFFFFF' }}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if(node.name !== e.currentTarget.value) onNameChange(node.id, e.currentTarget.value);
                                    if(node.isUserDefined) logActivity('CREATE_USER_NODE', { conceptName: e.currentTarget.value, conceptId: node.id });
                                    setEditingNodeId(null);
                                } else if (e.key === 'Escape') {
                                    setEditingNodeId(null);
                                }
                            }}
                            onBlur={(e) => {
                                if(node.name !== e.currentTarget.value) {
                                    onNameChange(node.id, e.currentTarget.value);
                                    if(node.isUserDefined) logActivity('CREATE_USER_NODE', { conceptName: e.currentTarget.value, conceptId: node.id });
                                }
                                setEditingNodeId(null);
                            }}
                        />
                    </div>
                </foreignObject>
            ) : (
                <text
                    fill={node.textColor || "white"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="select-none"
                    style={{ pointerEvents: 'none', fontSize: node.isCitation ? '12px' : (node.isHistorical ? '13px' : '14px'), fontStyle: node.isAiGenerated ? 'italic' : 'normal', fontFamily: node.isHistorical ? "'Times New Roman', serif" : "'Inter', sans-serif" }}
                >
                    {node.name}
                </text>
            )}
             {hasUserNotes && (
                <g>
                    <title>Has user notes</title>
                    <foreignObject x={node.width / 2 - 12} y={-node.height / 2 - 12} width="24" height="24" className="overflow-visible pointer-events-none">
                        <StickyNoteIcon className="w-5 h-5 text-yellow-300 opacity-90" />
                    </foreignObject>
                </g>
            )}
            {isAnalyzing && (
                <foreignObject x={node.width / 2 - 12} y={-node.height / 2 - 12} width="24" height="24" className="overflow-visible">
                    <SparkleIcon className="w-6 h-6 text-yellow-400 animate-spin" />
                </foreignObject>
            )}
            {isSelected && !node.isCitation &&
                <rect
                    className="resize-handle"
                    x={node.width / 2 - 6}
                    y={node.height / 2 - 6}
                    width={12} height={12}
                    fill={stroke}
                    stroke="#fff"
                    strokeWidth={2}
                    cursor="nwse-resize"
                    onPointerDown={(e) => onResizeStart(e, node)}
                />
            }
        </g>
    )
};

NodeComponent.getFill = (node: MapNode, state: { linkingNodeId: string | number | null; selectedNodeId: string | number | null; regionSelectedNodeIds: Set<string | number>; dropTargetNodeId: string | number | null; }) => {
    if (state.linkingNodeId === node.id) return "#facc15"; // yellow-400
    if (state.selectedNodeId === node.id || state.regionSelectedNodeIds.has(node.id)) return "#283447";
    if (state.dropTargetNodeId === node.id) return "#0e7490"; // cyan-700
    if (node.isDialectic || node.isCounterExample) return "#450a0a"; // red-950
    if (node.isHistorical) return "#451a03"; // yellow-950
    if (node.isUserDefined) return "#262e3d"; // A slightly different dark gray
    if (node.isCitation) return "#374151"; // gray-700
    return "#1f2937"; // gray-800
};

NodeComponent.getStroke = (node: MapNode, state: { linkingNodeId: string | number | null; regionSelectedNodeIds: Set<string | number>; dropTargetNodeId: string | number | null; }) => {
    if (state.linkingNodeId === node.id) return "#facc15"; // yellow-400
    if (state.dropTargetNodeId === node.id) return "#67e8f9"; // cyan-300
    if (state.regionSelectedNodeIds.has(node.id)) return "#fde047"; // yellow-300
    if (node.isUserDefined) return "#ffffff"; // White for user-defined
    if (node.isDialectic || node.isCounterExample) return "#ef4444"; // red-500
    if (node.isHistorical) return "#a16207"; // yellow-700
    if (node.isAiGenerated) return "#a855f7"; // purple-500
    if (node.isCitation) return "#6b7280"; // gray-500
    return "#38bdf8"; // sky-400
};

export default NodeComponent;
