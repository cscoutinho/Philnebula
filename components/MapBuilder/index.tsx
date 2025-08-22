import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { D3Node, Citation, MapLink, MapBuilderProps, FloatingTooltipState, LogicalWorkbenchState, RelationshipTypeInfo, BeliefConfirmationState, KindleNote, DropOnNodeMenuState, ConfirmationRequestHandler, UserNote } from '../../types';

import { useMapUI } from './hooks/useMapUI';
import { useMapAI } from './hooks/useMapAI';

import MapCanvas from './MapCanvas';
import MapToolbar from './MapToolbar';
import DialecticPanel from './Panels/DialecticPanel';
import LogicalWorkbench from './Panels/LogicalWorkbench';
import NodeContextMenu from './ContextMenus/NodeContextMenu';
import LinkContextMenu from './ContextMenus/LinkContextMenu';
import RelationshipMenu from './ContextMenus/RelationshipMenu';
import ColorPicker from './Panels/ColorPicker';
import SearchInput from '../SearchInput';
import SearchResultsDropdown from '../SearchResultsDropdown';
import { useFloatingPosition } from './utils/positioning';
import NodeComponent from './NodeComponent';
import LinkComponent from './LinkComponent';
import DefinitionAnalysisPanel from './Panels/DefinitionAnalysisPanel';
import StudioPanel from './Panels/StudioPanel';
import BeliefConfirmationPanel from './Panels/BeliefConfirmationPanel';
import DropOnNodeMenu from './ContextMenus/DropOnNodeMenu';


import { X, PlusCircle, ExternalLinkIcon } from '../icons';

const TooltipContent = ({ tooltip, handlePinCitation, setFloatingTooltip }: { 
    tooltip: FloatingTooltipState, 
    handlePinCitation: (link: MapLink, citation: Citation) => void,
    setFloatingTooltip: (state: FloatingTooltipState | null) => void 
}) => {
    if (!tooltip) return null;
    const { type, text, title } = tooltip;

    if (type === 'citation' && Array.isArray(text) && text.length > 0 && typeof text[0] === 'object' && 'citedText' in text[0]) {
        const citations = text as Citation[];
        return (
             <div className="flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    {title && <h4 className="font-bold text-base text-cyan-300">{title}</h4>}
                    <button onClick={() => setFloatingTooltip(null)} className="p-1 -mt-1 -mr-1 text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                <div className='flex flex-col gap-3'>
                    {citations.map((citation, index) => (
                        <div key={index} className="border-b border-gray-700 last:border-b-0 pb-3 last:pb-0">
                            <p className="text-gray-200 italic">"{citation.citedText}"</p>
                            <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
                                <span className="flex-grow pr-2">{citation.source}: {citation.sourceTitle}</span>
                                <div className='flex gap-2 flex-shrink-0'>
                                    <button
                                        onClick={() => handlePinCitation(tooltip.linkForCitation!, citation)}
                                        className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
                                        title="Pin to map"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                    </button>
                                    <a href={citation.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700" title="Open source">
                                        <ExternalLinkIcon className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    if (type === 'source_note' && Array.isArray(text) && text.length > 0 && typeof text[0] === 'object' && 'text' in text[0]) {
        const notes = text as KindleNote[];
        return (
            <div className="flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-base text-cyan-300">Source Note(s)</h4>
                    <button onClick={() => setFloatingTooltip(null)} className="p-1 -mt-1 -mr-1 text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                 <div className='flex flex-col gap-3 max-h-48 overflow-y-auto pr-2'>
                    {notes.map((note, index) => (
                        <div key={index} className="border-b border-gray-700 last:border-b-0 pb-3 last:pb-0">
                            <p className="text-xs text-gray-400 mb-1">{note.heading}</p>
                            <p className="text-gray-200 italic">"{note.text}"</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const renderableText = text as any;
    
    if (type === 'logical_construct' && typeof renderableText === 'object' && 'formalRepresentation' in renderableText) {
        return (
            <div className="space-y-2 text-xs">
                <p className="font-mono text-teal-300 bg-black/30 p-1.5 rounded">{renderableText.formalRepresentation}</p>
                <p><strong className="text-gray-400">System:</strong> {renderableText.suggestedSystem}</p>
                <p><strong className="text-gray-400">Rationale:</strong> {renderableText.rationale}</p>
            </div>
        )
    }

    return (
        <>
            <div className="flex justify-between items-start">
                {title && <h4 className="font-bold text-base mb-2 text-cyan-300 flex-grow">{title}</h4>}
                <button onClick={() => setFloatingTooltip(null)} className="p-1 -mt-2 -mr-2 text-gray-400 hover:text-white flex-shrink-0"><X className="w-4 h-4"/></button>
            </div>
            {typeof renderableText === 'string' && <p className="text-gray-200">{renderableText}</p>}
            {Array.isArray(renderableText) && typeof renderableText[0] === 'string' && (
                <ul className="space-y-2 list-disc list-inside text-gray-200">
                    {renderableText.map((item: string, index: number) => <li key={index}>{item}</li>)}
                </ul>
            )}
             {Array.isArray(renderableText) && renderableText.length > 0 && typeof renderableText[0] === 'object' && ('type' in renderableText[0] || 'name' in renderableText[0]) && (
                <ul className="space-y-2">
                    {renderableText.map((item: RelationshipTypeInfo | { name: string, summary: string }, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                            {'color' in item && item.color && <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: item.color }}></div>}
                            <div>
                                <span className="font-semibold text-white">{'type' in item ? item.type : item.name}</span>
                                {('description' in item ? item.description : ('summary' in item ? item.summary : null)) && <p className="text-xs text-gray-400">{'description' in item ? item.description : ('summary' in item ? item.summary : '')}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
};

const MapBuilder: React.FC<MapBuilderProps> = ({ 
    layout, 
    setLayout, 
    logActivity, 
    relationshipTypes, 
    onExportMapData, 
    allNodes,
    initialWorkbenchData,
    onClearInitialWorkbenchData,
    beliefChallenge,
    setIsChallengeOpen,
    aiAssistanceLevel,
    onAddNoteToMap,
    onAddMultipleNotesToMap,
    onAttachSourceNote,
    onAppendToNodeNotes,
    onRequestConfirmation,
    notesToPlace,
    onClearNotesToPlace,
}) => {
    const { nodes, links } = layout;
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY! }), []);
    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
    
    const [isExportingImg, setIsExportingImg] = useState(false);
    const [isExportingJson, setIsExportingJson] = useState(false);
    const [beliefConfirmationState, setBeliefConfirmationState] = useState<BeliefConfirmationState | null>(null);
    const [dropOnNodeMenu, setDropOnNodeMenu] = useState<DropOnNodeMenuState | null>(null);

    const relationshipColorMap = useMemo(() => {
        return relationshipTypes.reduce((acc, item) => {
            acc[item.type] = item.color;
            return acc;
        }, {} as Record<string, string>);
    }, [relationshipTypes]);

    const ui = useMapUI({ allNodes, layout, setLayout, logActivity, nodeMap, onRequestConfirmation });
    
    const aiHooks = useMapAI({
        ai,
        layout,
        setLayout,
        logActivity,
        nodeMap,
        clearSelections: ui.clearSelections,
        aiAssistanceLevel,
        setEditLinkTypesMenu: ui.setEditLinkTypesMenu,
        allNodes,
    });

    useEffect(() => {
        if (initialWorkbenchData && onClearInitialWorkbenchData) {
            ui.setLogicalWorkbench({ ...initialWorkbenchData, x: window.innerWidth / 2, y: window.innerHeight / 2 });
            onClearInitialWorkbenchData();
        }
    }, [initialWorkbenchData, onClearInitialWorkbenchData, ui.setLogicalWorkbench]);


    const { ref: changingNodeUIRef, style: changingNodeUIStyle } = useFloatingPosition(ui.changingNodeState, { offsetY: 20 });
    const { ref: colorPickerRef, style: colorPickerStyle } = useFloatingPosition(ui.colorPicker);
    const { ref: nodeContextMenuRef, style: nodeContextMenuStyle } = useFloatingPosition(ui.nodeContextMenu);
    const { ref: linkContextMenuRef, style: linkContextMenuStyle } = useFloatingPosition(ui.linkContextMenu);
    const { ref: dropOnNodeMenuRef, style: dropOnNodeMenuStyle } = useFloatingPosition(dropOnNodeMenu);
    const { ref: relationshipMenuRef, style: relationshipMenuStyle } = useFloatingPosition(ui.relationshipMenu, { centered: true });
    const { ref: editLinkTypesMenuRef, style: editLinkTypesMenuStyle } = useFloatingPosition(ui.editLinkTypesMenu, { strategy: 'flip' });
    const { ref: floatingTooltipRef, style: floatingTooltipStyle } = useFloatingPosition(ui.floatingTooltip, { offsetX: 15, offsetY: 10 });
    const { ref: beliefConfirmationRef, style: beliefConfirmationStyle } = useFloatingPosition(beliefConfirmationState, { centered: true });

    const handleImageExport = useCallback(async (format: 'png' | 'jpeg') => {
        if (nodes.length === 0) {
            alert("Cannot export an empty map.");
            return;
        }
        setIsExportingImg(true);

        const padding = 50;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.x - node.width / 2);
            minY = Math.min(minY, node.y - node.height / 2);
            maxX = Math.max(maxX, node.x + node.width / 2);
            maxY = Math.max(maxY, node.y + node.height / 2);
        });

        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;

        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsExportingImg(false);
            return;
        }

        ctx.scale(scale, scale);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);
        ctx.translate(-minX + padding, -minY + padding);
        
        links.forEach(link => {
            const path = new Path2D(LinkComponent.calculateLinkPath(link, nodeMap));
            const color = relationshipColorMap[link.relationshipTypes[0]] || '#9ca3af';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke(path);
        });

        nodes.forEach(node => {
            ctx.fillStyle = NodeComponent.getFill(node, { linkingNodeId: null, selectedNodeId: null, regionSelectedNodeIds: new Set(), dropTargetNodeId: null });
            ctx.strokeStyle = NodeComponent.getStroke(node, { linkingNodeId: null, regionSelectedNodeIds: new Set(), dropTargetNodeId: null });
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (node.shape === 'rect') {
                ctx.roundRect(node.x - node.width / 2, node.y - node.height / 2, node.width, node.height, 8);
            } else {
                ctx.arc(node.x, node.y, node.width / 2, 0, 2 * Math.PI);
            }
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = node.textColor || "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "14px Inter, sans-serif";
            ctx.fillText(node.name, node.x, node.y);
        });

        const imageURL = canvas.toDataURL(`image/${format}`);
        const linkEl = document.createElement('a');
        linkEl.href = imageURL;
        linkEl.download = `conceptual-map.${format}`;
        linkEl.click();
        
        URL.revokeObjectURL(linkEl.href);
        setIsExportingImg(false);
    }, [nodes, links, nodeMap, relationshipColorMap]);
    
    const handleJsonExport = useCallback(async () => {
        setIsExportingJson(true);
        await onExportMapData();
        setIsExportingJson(false);
    }, [onExportMapData]);

    const handleStartChallengeFromMap = useCallback((belief: string, confidence: number) => {
        if (!beliefConfirmationState) return;
        setIsChallengeOpen(true);
        const sourceNodeIds = [beliefConfirmationState.link.source, beliefConfirmationState.link.target];
        beliefChallenge.startChallenge(belief, confidence, sourceNodeIds);
    }, [beliefChallenge, setIsChallengeOpen, beliefConfirmationState]);

    const handleUpdateUserNotes = useCallback((nodeId: string | number, userNotes: UserNote[]) => {
        setLayout(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => {
                if (n.id === nodeId) {
                    const { notes, ...rest } = n as any; 
                    return { ...rest, userNotes };
                }
                return n;
            })
        }));
    }, [setLayout]);

    return (
        <div className="w-full h-full relative">
            <MapCanvas
                allNodes={allNodes}
                layout={layout}
                setLayout={setLayout}
                logActivity={logActivity}
                relationshipTypes={relationshipTypes}
                relationshipColorMap={relationshipColorMap}
                uiState={ui}
                aiState={aiHooks}
                onAddNoteToMap={onAddNoteToMap}
                onAddMultipleNotesToMap={onAddMultipleNotesToMap}
                setDropOnNodeMenu={setDropOnNodeMenu}
                socraticSuggestions={aiHooks.socraticSuggestions}
                onSuggestionClick={(suggestion) => aiHooks.handleSocraticAction(suggestion, suggestion.availableActions[0])}
                notesToPlace={notesToPlace}
                onClearNotesToPlace={onClearNotesToPlace}
            />

            <MapToolbar
                isExportingImg={isExportingImg}
                isExportingJson={isExportingJson}
                onImageExport={handleImageExport}
                onJsonExport={handleJsonExport}
                isLogicVizVisible={ui.isLogicVizVisible}
                setIsLogicVizVisible={ui.setIsLogicVizVisible}
                zoomLevel={ui.zoomLevel}
                setZoomLevel={ui.setZoomLevel}
            />
            
            {ui.nodeContextMenu && <div ref={nodeContextMenuRef} style={nodeContextMenuStyle}><NodeContextMenu nodeContextMenu={ui.nodeContextMenu} node={nodeMap.get(ui.nodeContextMenu.nodeId)} isAnalyzingGenealogy={aiHooks.isAnalyzingGenealogy === ui.nodeContextMenu.nodeId} setLinkingNode={ui.setLinkingNode} setNodeContextMenu={ui.setNodeContextMenu} handleAnalyzeGenealogy={aiHooks.handleAnalyzeGenealogy} setChangingNodeState={ui.setChangingNodeState} setColorPicker={ui.setColorPicker} updateNodeShape={ui.updateNodeShape} deleteNode={ui.deleteNode} onEditNote={(nodeId) => ui.setStudioState({ nodeId, x: ui.nodeContextMenu!.x, y: ui.nodeContextMenu!.y })} /></div>}
            {ui.colorPicker && <div ref={colorPickerRef} style={colorPickerStyle}><ColorPicker colorPicker={ui.colorPicker} textColors={ui.textColors} handleTextColorChange={ui.handleTextColorChange} /></div>}
            {ui.linkContextMenu && <div ref={linkContextMenuRef} style={linkContextMenuStyle}><LinkContextMenu linkContextMenu={ui.linkContextMenu} setLogicalWorkbench={ui.setLogicalWorkbench} handleFormalizeArgument={(state) => aiHooks.handleFormalizeArgument(state)} setLinkContextMenu={ui.setLinkContextMenu} setDialecticAnalysis={ui.setDialecticAnalysis} handleAnalyzeArgument={aiHooks.handleAnalyzeArgument} handleExploreImplications={aiHooks.handleExploreImplications} generateJustification={aiHooks.generateJustification} setEditLinkTypesMenu={ui.setEditLinkTypesMenu} updateLinkPathStyle={ui.updateLinkPathStyle} flipLinkCurve={ui.flipLinkCurve} deleteLink={ui.deleteLink} handleAnalyzeDefinition={aiHooks.handleAnalyzeDefinition} onChallengeBelief={(link, x, y) => setBeliefConfirmationState({ link, x, y })} handleGenerateCounterExample={aiHooks.handleGenerateCounterExample} handleGenerateAlternativeHypothesis={aiHooks.handleGenerateAlternativeHypothesis} /></div>}
            {dropOnNodeMenu && <div ref={dropOnNodeMenuRef} style={dropOnNodeMenuStyle}><DropOnNodeMenu menuState={dropOnNodeMenu} onAttach={onAttachSourceNote} onAppend={onAppendToNodeNotes} onClose={() => setDropOnNodeMenu(null)} onClearNotesToPlace={onClearNotesToPlace} /></div>}
            {ui.editLinkTypesMenu && (
                <div ref={editLinkTypesMenuRef} style={editLinkTypesMenuStyle} className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 text-white text-sm w-64" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-2">
                        <p className="font-bold px-1">Select Types:</p>
                        <button onClick={() => ui.setEditLinkTypesMenu(null)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                        {relationshipTypes.map(relType => (
                            <label key={relType.type} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={ui.editLinkTypesMenu!.link.relationshipTypes.includes(relType.type)} 
                                    onChange={() => ui.updateLinkRelationshipTypes(ui.editLinkTypesMenu!.link, ui.editLinkTypesMenu!.link.relationshipTypes.includes(relType.type) ? ui.editLinkTypesMenu!.link.relationshipTypes.filter(t => t !== relType.type) : [...ui.editLinkTypesMenu!.link.relationshipTypes, relType.type])} 
                                    className="form-checkbox h-4 w-4 rounded bg-gray-900 border-gray-600 text-cyan-500 focus:ring-cyan-500" 
                                />
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: relType.color }}></div>
                                <span>{relType.type}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            {ui.floatingTooltip && (
                <div ref={floatingTooltipRef} style={floatingTooltipStyle} className="fixed bg-gray-900/80 backdrop-blur-md border border-gray-600 rounded-lg shadow-lg p-4 z-50 text-white text-sm max-w-sm" onClick={e => e.stopPropagation()}>
                    <TooltipContent tooltip={ui.floatingTooltip} handlePinCitation={ui.handlePinCitation} setFloatingTooltip={ui.setFloatingTooltip} />
                </div>
            )}
            {ui.relationshipMenu && <div ref={relationshipMenuRef} style={relationshipMenuStyle}><RelationshipMenu relationshipMenu={ui.relationshipMenu} relationshipTypes={relationshipTypes} createLink={ui.createLink} /></div>}
            {ui.changingNodeState && <div ref={changingNodeUIRef} style={changingNodeUIStyle} className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50 w-72" onClick={e => e.stopPropagation()}><h4 className="text-sm font-bold mb-2">Change Concept</h4><div className="relative"><SearchInput value={ui.changeQuery} onChange={ui.handleChangeConceptSearch} placeholder="Search new concept..." />{ui.changeQuery.length > 1 && ui.changeResults.length > 0 && <SearchResultsDropdown results={ui.changeResults} onSelect={ui.handleConceptChangeSelect} />}</div></div>}
            
            <LogicalWorkbench 
                isOpen={!!ui.logicalWorkbench} 
                onClose={ui.clearSelections} 
                initialState={ui.logicalWorkbench}
                onFormalize={() => {
                    if (ui.logicalWorkbench) {
                        aiHooks.handleFormalizeArgument(ui.logicalWorkbench);
                    }
                }}
                isFormalizing={aiHooks.isFormalizing} 
                formalizationResult={aiHooks.formalizationResult} 
                selectedFormalizationIndex={aiHooks.selectedFormalizationIndex} 
                setSelectedFormalizationIndex={aiHooks.setSelectedFormalizationIndex} 
                onConfirm={() => ui.handleCreateLogicalConstruct(aiHooks.formalizationResult, aiHooks.selectedFormalizationIndex)} 
            />
            <DialecticPanel 
                state={ui.dialecticAnalysis} 
                onClose={ui.clearSelections} 
                isAnalyzing={aiHooks.isAnalyzingArgument} 
                analysisResult={aiHooks.analysisResult} 
                onAddNode={(item, type) => {
                    if (ui.dialecticAnalysis) {
                        aiHooks.handleAddDialecticNode(item, type, ui.dialecticAnalysis.link);
                    }
                }}
            />
            <DefinitionAnalysisPanel
                state={aiHooks.definitionAnalysisState}
                onClose={() => aiHooks.setDefinitionAnalysisState(null)}
                onHuntForCounterExamples={aiHooks.handleHuntForCounterExamples}
                onAddCounterExampleNode={aiHooks.handleAddCounterExampleNode}
            />
            {beliefConfirmationState && (
                <div ref={beliefConfirmationRef} style={beliefConfirmationStyle}>
                    <BeliefConfirmationPanel
                        state={beliefConfirmationState}
                        sourceName={nodeMap.get(beliefConfirmationState.link.source)?.name || ''}
                        targetName={nodeMap.get(beliefConfirmationState.link.target)?.name || ''}
                        onClose={() => setBeliefConfirmationState(null)}
                        onStartChallenge={handleStartChallengeFromMap}
                        ai={ai}
                        logActivity={logActivity}
                    />
                </div>
            )}
             {ui.studioState && (
                <StudioPanel
                    analysisMode={false}
                    state={ui.studioState}
                    nodeName={nodeMap.get(ui.studioState.nodeId)?.name || ''}
                    initialUserNotes={nodeMap.get(ui.studioState.nodeId)?.userNotes || []}
                    sourceNotes={nodeMap.get(ui.studioState.nodeId)?.sourceNotes}
                    onClose={() => ui.setStudioState(null)}
                    onUpdateUserNotes={handleUpdateUserNotes}
                    onLogEdit={ui.handleLogNoteEdit}
                    logActivity={logActivity}
                    ai={ai}
                />
            )}
        </div>
    );
};

export default MapBuilder;