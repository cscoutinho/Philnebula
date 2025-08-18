import React, { useRef, useEffect, useState } from 'react';
import type { MapLink, MapNode, RelationshipType, LogicalConstruct, Citation, RelationshipTypeInfo, FloatingTooltipState } from '../../types';
import { calculateLinkPath } from './utils/pathGenerators';
import { getMidpoint } from './utils/calculations';
import { SparkleIcon, MessageSquareQuote, FlaskConicalIcon, QuoteIcon as CitationQuoteIcon } from '../icons';

interface LinkComponentProps {
    link: MapLink;
    nodeMap: Map<string | number, MapNode>;
    relationshipTypes: RelationshipTypeInfo[];
    relationshipColorMap: Record<RelationshipType, string>;
    setFloatingTooltip: (state: FloatingTooltipState | null) => void;
    handleLinkContextMenu: (e: React.MouseEvent, link: MapLink) => void;
    handlePinCitation: (link: MapLink, citation: Citation) => void;
    generateJustification: (link: MapLink) => void;
    handleExploreImplications: (link: MapLink) => void;
    handleFormalizeArgument: (link: MapLink, e: React.MouseEvent) => void;
}

const SecondaryTypeIndicators: React.FC<{ pathData: string; types: RelationshipType[]; relationshipTypes: RelationshipTypeInfo[] }> = ({ pathData, types, relationshipTypes }) => {
    if (!pathData || types.length === 0) return null;
  
    const [points, setPoints] = useState<{ x: number, y: number, color: string }[]>([]);
  
    useEffect(() => {
        const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tempPath.setAttribute("d", pathData);
        if (!tempPath.getTotalLength()) return;

        const totalLength = tempPath.getTotalLength();
        const numSegments = types.length + 1;

        const newPoints = types.map((type, index) => {
            const point = tempPath.getPointAtLength(totalLength * (index + 1) / numSegments);
            const color = relationshipTypes.find(rt => rt.type === type)?.color || '#9ca3af';
            return { x: point.x, y: point.y, color };
        });
        setPoints(newPoints);
    }, [pathData, types, relationshipTypes]);
  
    return (
      <g style={{ pointerEvents: 'none' }}>
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={p.color} stroke="#111827" strokeWidth="1.5" />
        ))}
      </g>
    );
};

const LogicalConstructVisual: React.FC<{ construct: LogicalConstruct; nodeMap: Map<string | number, MapNode>, onHover: (e: React.MouseEvent, construct: LogicalConstruct) => void, onLeave: () => void }> = ({ construct, nodeMap, onHover, onLeave }) => {
    const { premiseNodeIds, conclusionNodeId } = construct;

    const premiseNodes = premiseNodeIds.map(id => nodeMap.get(id)).filter((n): n is MapNode => !!n);
    const conclusionNode = nodeMap.get(conclusionNodeId);

    if (premiseNodes.length === 0 || !conclusionNode) {
        return null;
    }

    const gateX = premiseNodes.reduce((sum, n) => sum + n.x, 0) / premiseNodes.length;
    const gateY = premiseNodes.reduce((sum, n) => sum + n.y, 0) / premiseNodes.length;

    const gateRadius = 16;
    const color = "#2dd4bf"; // teal-400

    return (
        <g 
            className="logical-construct" 
            onMouseEnter={(e) => onHover(e, construct)} 
            onMouseLeave={onLeave}
        >
            {premiseNodes.map(pNode => (
                <path
                    key={`premise-path-${pNode.id}`}
                    d={`M ${pNode.x},${pNode.y} L ${gateX},${gateY}`}
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    fill="none"
                />
            ))}
            <path
                d={`M ${gateX},${gateY} L ${conclusionNode.x},${conclusionNode.y}`}
                stroke={color}
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-logical-construct)"
            />
            <circle cx={gateX} cy={gateY} r={gateRadius} fill="#1f2937" stroke={color} strokeWidth="2" />
            <foreignObject x={gateX - gateRadius} y={gateY - gateRadius} width={gateRadius*2} height={gateRadius*2}>
                <div className="w-full h-full flex items-center justify-center font-mono text-lg font-bold" style={{ color }}>
                    &amp;
                </div>
            </foreignObject>
        </g>
    );
};

const getDashStyle = (type: string): string => {
    switch(type) {
        case 'Indutivamente Sugere':
        case 'É a Melhor Explicação para':
            return '5 5';
        case 'É um Token de':
            return '2 6';
        case 'É uma Propriedade de':
        case 'É um Tipo de':
            return '8 3';
        case 'É uma Distinção entre':
        case 'É Condição Necessária para':
        case 'É Condição Suficiente para':
            return '1 4'; // Dotted style
        case 'Cited':
            return '2 4';
        default:
            return 'none'; // Solid line for strong logical links and critiques
    }
};

const LinkComponent: React.FC<LinkComponentProps> & { calculateLinkPath: typeof calculateLinkPath, LogicalConstructVisual: typeof LogicalConstructVisual } = ({ 
    link, 
    nodeMap, 
    relationshipTypes,
    relationshipColorMap,
    setFloatingTooltip,
    handleLinkContextMenu,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handlePinCitation,
    generateJustification,
    handleExploreImplications,
    handleFormalizeArgument,
}) => {
    const pathData = calculateLinkPath(link, nodeMap);
    const primaryType = link.relationshipTypes[0];
    const color = relationshipColorMap[primaryType] || '#9ca3af';
    const secondaryTypes = link.relationshipTypes.slice(1);
    
    const midPoint = getMidpoint(link, nodeMap);
    const hasCitations = typeof link.justification === 'object' && link.justification.citations && link.justification.citations.length > 0;
    const statefulIcons = [link.justificationState, link.implicationsState, link.formalizationState].filter(s => s && s !== 'idle');
    const iconsOnLink = statefulIcons.length + (hasCitations ? 1 : 0);
    let iconIndex = 0;

    const renderIcon = (
        state: MapLink['justificationState' | 'implicationsState' | 'formalizationState'],
        IconComponent: React.ElementType,
        hoverText: string,
        hoverType: FloatingTooltipState['type'],
        tooltipText: string | string[] | { text: string; citations: Citation[] } | undefined,
        onClick: (e: React.MouseEvent) => void,
        color: string
    ) => {
        if (!state || state === 'idle') return null;
        const isLoading = state === 'loading';
        const yOffset = (iconIndex - (iconsOnLink - 1) / 2) * 28;
        iconIndex++;
        
        const displayTooltipText = (typeof tooltipText === 'object' && tooltipText !== null && 'text' in tooltipText)
            ? tooltipText.text
            : tooltipText as string | string[] | undefined;
        
        return (
            <foreignObject
                key={`${hoverType}-${link.source}-${link.target}`}
                x={midPoint.x - 12}
                y={midPoint.y - 12 + yOffset}
                width="24" height="24"
                className="cursor-pointer overflow-visible"
                onClick={onClick}
                onMouseEnter={(e) => {
                    if ((state === 'success' || state === 'error') && displayTooltipText) {
                        setFloatingTooltip({ x: e.clientX, y: e.clientY, title: hoverText, text: displayTooltipText, type: hoverType });
                    }
                }}
                onMouseLeave={() => setFloatingTooltip(null)}
            >
                <div className="flex items-center justify-center w-full h-full p-1 rounded-full bg-gray-800/80 backdrop-blur-sm ring-1 ring-black/20">
                    <IconComponent
                        className={`w-4 h-4 text-white transition-colors ${isLoading ? 'animate-spin' : ''}`}
                        style={{ color: isLoading ? '#facc15' : state === 'error' ? '#f87171' : color }}
                    />
                </div>
            </foreignObject>
        );
    };

    return (
        <>
            <g className="cursor-pointer" >
                <path
                    d={pathData}
                    stroke="transparent"
                    strokeWidth="20"
                    fill="none"
                    onClick={(e) => {
                        e.stopPropagation();
                        const relDetails = link.relationshipTypes.map(rt => relationshipTypes.find(def => def.type === rt)).filter((r): r is RelationshipTypeInfo => !!r);
                        setFloatingTooltip({ x: e.clientX, y: e.clientY, title: 'Relationship Types', text: relDetails });
                    }}
                    onContextMenu={(e) => handleLinkContextMenu(e, link)}
                />
                <path
                    d={pathData}
                    stroke={color}
                    strokeWidth={primaryType === 'Synthesizes' ? "3" : "2"}
                    strokeDasharray={getDashStyle(primaryType)}
                    fill="none"
                    markerEnd={`url(#arrow-${primaryType})`}
                    style={{ pointerEvents: 'none' }}
                />
                <SecondaryTypeIndicators pathData={pathData} types={secondaryTypes} relationshipTypes={relationshipTypes} />
            </g>
            <g>
                {renderIcon(link.justificationState, SparkleIcon, 'Justification', 'justification', link.justification, (e) => { e.stopPropagation(); generateJustification(link); }, '#a78bfa')}
                {hasCitations && (() => {
                    const yOffset = (iconIndex - (iconsOnLink - 1) / 2) * 28;
                    iconIndex++;
                    return (
                        <foreignObject
                            key={`citation-${link.source}-${link.target}`}
                            x={midPoint.x - 12} y={midPoint.y - 12 + yOffset}
                            width="24" height="24"
                            className="cursor-pointer overflow-visible"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setFloatingTooltip({ x: e.clientX, y: e.clientY, title: 'Citations', text: (link.justification as any).citations, type: 'citation', linkForCitation: link }); 
                            }}
                        >
                            <div className="flex items-center justify-center w-full h-full p-1 rounded-full bg-gray-800/80 backdrop-blur-sm ring-1 ring-black/20">
                                <CitationQuoteIcon className="w-4 h-4 text-gray-300"/>
                            </div>
                        </foreignObject>
                    );
                })()}
                {renderIcon(link.implicationsState, MessageSquareQuote, 'Potential Implications', 'implications', link.implications, (e) => { e.stopPropagation(); handleExploreImplications(link); }, '#a855f7')}
                {renderIcon(link.formalizationState, FlaskConicalIcon, 'Formal Representation', 'formalism', link.formalRepresentation, (e) => { e.stopPropagation(); handleFormalizeArgument(link, e); }, '#2dd4bf')}
            </g>
        </>
    )
};

LinkComponent.calculateLinkPath = calculateLinkPath;
LinkComponent.LogicalConstructVisual = LogicalConstructVisual;

export default LinkComponent;