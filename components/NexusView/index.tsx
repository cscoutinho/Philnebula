import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { select, pointer } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { AppSessionData, UserNote, AppTag } from '../../types';
import { BrainCircuit, LinkIcon, Plus, Edit, Trash2, X, Check, Search, ChevronLeft, ChevronRight } from '../icons';
import ProjectSwitcher from '../ProjectSwitcher';

type NexusNote = UserNote & { mapNodeId: string | number; mapNodeName: string };
type NotePosition = { userNoteId: string; x: number; y: number; width: number; height: number; };

interface NexusViewProps {
    allUserNotes: NexusNote[];
    activeProjectData: AppSessionData;
    updateActiveProjectData: (updater: (d: AppSessionData) => AppSessionData) => void;
    onOpenStudioForNexusNote: (userNoteId: string, x: number, y: number) => void;
    focusNoteId: string | null;
    onClearFocusNote: () => void;
    focusTagId: string | null;
    onClearFocusTag: () => void;
    onUpdateNexusLayout: (updater: (layout: AppSessionData['nexusLayout']) => AppSessionData['nexusLayout']) => void;
    onUpdateTags: (tags: AppTag[]) => void;
    session: any;
    activeProject: any;
    onCreateProject: (name: string) => void;
    onSwitchProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onRequestConfirmation: any;
}

interface NoteCardProps { 
    note: NexusNote;
    position: NotePosition;
    tags: AppTag[];
    onDoubleClick: (e: React.MouseEvent) => void;
    onPointerDown: (e: React.PointerEvent, noteId: string) => void;
    onLinkStart: (e: React.PointerEvent, noteId: string) => void;
    onLinkEnd: (e: React.PointerEvent, noteId: string) => void;
    isLinking: boolean;
    onTagClick: (tagId: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, position, tags, onDoubleClick, onPointerDown, onLinkStart, onLinkEnd, isLinking, onTagClick }) => {
    const noteTags = useMemo(() => {
        const tagMap = new Map(tags.map(t => [t.id, t]));
        return (note.tagIds || []).map(id => tagMap.get(id)).filter((t): t is AppTag => !!t);
    }, [note.tagIds, tags]);

    return (
        <div
            data-note-id={note.id}
            className="absolute bg-gray-800 p-4 rounded-lg border border-gray-600 shadow-lg transition-shadow duration-200 hover:shadow-cyan-500/20 hover:border-cyan-500 cursor-grab active:cursor-grabbing flex flex-col select-none"
            style={{ 
                left: 0, 
                top: 0,
                transform: `translate(${position.x}px, ${position.y}px)`,
                width: position.width,
                height: position.height,
                transformOrigin: 'top left',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                msUserSelect: 'none',
            }}
            onDoubleClick={onDoubleClick}
            onPointerDown={(e) => onPointerDown(e, note.id)}
            onPointerUp={(e) => isLinking && onLinkEnd(e, note.id)}
        >
            <div 
                className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full cursor-crosshair"
                onPointerDown={(e) => { e.stopPropagation(); onLinkStart(e, note.id); }}
            />
            <h4 className="font-bold text-gray-100 truncate flex-shrink-0 pointer-events-none">{note.title}</h4>
            <div 
                className="text-sm text-gray-400 mt-2 flex-grow overflow-hidden pointer-events-none"
                dangerouslySetInnerHTML={{ __html: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '') }} 
            />
            <div className="flex-shrink-0 mt-2">
                <div className="flex flex-wrap gap-1">
                    {noteTags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTagClick(tag.id);
                            }}
                            className="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
                            style={{ backgroundColor: tag.color, color: '#000', '--tw-ring-color': tag.color } as React.CSSProperties}
                            title={`Filter by tag: ${tag.name}`}
                        >
                            {tag.name}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-cyan-400 mt-2 truncate pointer-events-none">From: {note.mapNodeName}</p>
            </div>
        </div>
    );
};

const SidePanel: React.FC<{ 
    tags: AppTag[];
    onUpdateTags: (tags: AppTag[]) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    selectedTagIds: Set<string>;
    setSelectedTagIds: (ids: Set<string>) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    session: any;
    activeProject: any;
    onCreateProject: (name: string) => void;
    onSwitchProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onRequestConfirmation: any;
}> = ({ tags, onUpdateTags, searchQuery, setSearchQuery, selectedTagIds, setSelectedTagIds, isCollapsed, onToggleCollapse, session, activeProject, onCreateProject, onSwitchProject, onDeleteProject, onRenameProject, onRequestConfirmation }) => {
    const [editingTag, setEditingTag] = useState<AppTag | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#6366f1');

    const handleAddTag = () => {
        if (!newTagName.trim()) return;
        const newTag: AppTag = {
            id: `tag_${Date.now()}`,
            name: newTagName.trim(),
            color: newTagColor,
        };
        onUpdateTags([...tags, newTag]);
        setNewTagName('');
    };

    const handleUpdateTag = () => {
        if (!editingTag || !editingTag.name.trim()) return;
        onUpdateTags(tags.map(t => t.id === editingTag.id ? editingTag : t));
        setEditingTag(null);
    };
    
    const handleDeleteTag = (tagId: string) => {
        onUpdateTags(tags.filter(t => t.id !== tagId));
    };

    const toggleTagFilter = (tagId: string) => {
        const newSet = new Set(selectedTagIds);
        if (newSet.has(tagId)) {
            newSet.delete(tagId);
        } else {
            newSet.add(tagId);
        }
        setSelectedTagIds(newSet);
    };

    return (
        <aside className={`${isCollapsed ? 'w-12' : 'w-80'} h-full bg-black/30 border-r border-gray-700 flex-shrink-0 flex flex-col transition-all duration-300`}>
            {/* Toggle button - always visible */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center p-2 border-b border-gray-700`}>
                {!isCollapsed && <h2 className="text-xl font-bold text-cyan-300">Note Nexus</h2>}
                <button 
                    onClick={onToggleCollapse}
                    className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-md transition-colors"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>
            
            {!isCollapsed && (
                <>
                    <div className="p-4 flex-shrink-0 space-y-4">
                        {/* Project Switcher */}
                        <ProjectSwitcher
                            projects={session.projects}
                            activeProject={activeProject}
                            onCreateProject={onCreateProject}
                            onSwitchProject={onSwitchProject}
                            onDeleteProject={onDeleteProject}
                            onRenameProject={onRenameProject}
                            onRequestConfirmation={onRequestConfirmation}
                        />
                        
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search notes..."
                                className="w-full p-2 pl-8 bg-gray-800 border border-gray-600 rounded-md text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto px-4">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Tags</h3>
                        <ul className="space-y-1.5">
                            {tags.map(tag => (
                                <li key={tag.id} className="group flex items-center justify-between text-sm">
                                    {editingTag?.id === tag.id ? (
                                        <div className="flex items-center gap-1 w-full">
                                            <input type="color" value={editingTag.color} onChange={e => setEditingTag({...editingTag, color: e.target.value})} className="w-6 h-6 p-0.5 bg-transparent border-none rounded"/>
                                            <input type="text" value={editingTag.name} onChange={e => setEditingTag({...editingTag, name: e.target.value})} className="flex-grow bg-gray-700 rounded px-1.5 py-0.5 text-xs"/>
                                            <button onClick={handleUpdateTag} className="p-1 text-green-400"><Check className="w-4 h-4"/></button>
                                            <button onClick={() => setEditingTag(null)} className="p-1 text-red-400"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => toggleTagFilter(tag.id)} className={`flex items-center gap-2 flex-grow text-left p-1 rounded ${selectedTagIds.has(tag.id) ? 'bg-cyan-800/80' : ''}`}>
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                                <span>{tag.name}</span>
                                            </button>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingTag(tag)} className="p-1 text-gray-400 hover:text-cyan-400"><Edit className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteTag(tag.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-shrink-0 p-4 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                            <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="w-8 h-8 p-1 bg-gray-800 border border-gray-600 rounded-md"/>
                            <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="New tag name..." className="flex-grow p-1.5 bg-gray-800 border border-gray-600 rounded-md text-sm"/>
                            <button onClick={handleAddTag} className="p-2 bg-cyan-600 rounded-md"><Plus className="w-4 h-4"/></button>
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
};


const NexusView: React.FC<NexusViewProps> = ({ 
    allUserNotes, activeProjectData, updateActiveProjectData, onOpenStudioForNexusNote, 
    focusNoteId, onClearFocusNote, focusTagId, onClearFocusTag, onUpdateNexusLayout, onUpdateTags,
    session, activeProject, onCreateProject, onSwitchProject, onDeleteProject, onRenameProject, onRequestConfirmation
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [zoomTransform, setZoomTransform] = useState({ x: 0, y: 0, k: 1 });
    
    const canvasRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const transformRef = useRef(zoomIdentity);
    
    const [linkingState, setLinkingState] = useState<{ fromId: string, fromPos: {x:number, y:number}, toPos: {x: number, y:number} } | null>(null);
    const [draggedNotePosition, setDraggedNotePosition] = useState<{ noteId: string; x: number; y: number } | null>(null);
    
    const dragInfo = useRef<{
        noteId: string;
        offsetX: number;
        offsetY: number;
        thresholdPassed: boolean;
    } | null>(null);

    useEffect(() => {
        if (focusTagId) {
            setSelectedTagIds(new Set([focusTagId]));
            onClearFocusTag(); // Clear after using it
        }
    }, [focusTagId, onClearFocusTag]);

    const notePositions = useMemo(() => {
        const posMap = new Map<string, NotePosition>((activeProjectData.nexusLayout?.notePositions || []).map(p => [p.userNoteId, p]));
        const updatedPositions: NotePosition[] = [];
        allUserNotes.forEach((note, index) => {
            if (!posMap.has(note.id)) {
                updatedPositions.push({
                    userNoteId: note.id,
                    x: (index % 5) * 320 + 20,
                    y: Math.floor(index / 5) * 240 + 20,
                    width: 300,
                    height: 220,
                });
            }
        });
        if (updatedPositions.length > 0) {
            onUpdateNexusLayout(layout => ({
                links: layout?.links || [],
                notePositions: [...(layout?.notePositions || []), ...updatedPositions]
            }));
        }
        return new Map<string, NotePosition>((activeProjectData.nexusLayout?.notePositions || []).map(p => [p.userNoteId, p]));
    }, [allUserNotes, activeProjectData.nexusLayout, onUpdateNexusLayout]);
    

    const filteredNotes = useMemo(() => {
        return allUserNotes.filter(note => {
            const searchMatch = searchQuery === '' || 
                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                note.content.toLowerCase().includes(searchQuery.toLowerCase());

            const tagMatch = selectedTagIds.size === 0 || 
                (note.tagIds || []).some(tagId => selectedTagIds.has(tagId));
                
            return searchMatch && tagMatch;
        });
    }, [allUserNotes, searchQuery, selectedTagIds]);

    // Setup zoom behavior
    useEffect(() => {
        if (!svgRef.current || !canvasRef.current) return;
        const svg = select(svgRef.current);
        
        if (!zoomBehaviorRef.current) {
            const zoomBehavior = zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .filter(event => !event.shiftKey && !event.ctrlKey && !event.metaKey)
                .on('zoom', (event) => {
                    transformRef.current = event.transform;
                    // Apply zoom to SVG content (links)
                    select('#nexus-content-group').attr('transform', event.transform.toString());
                    // Update state for notes container
                    setZoomTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
                    setZoomLevel(event.transform.k);
                });
            zoomBehaviorRef.current = zoomBehavior;
            svg.call(zoomBehavior).on("dblclick.zoom", null);
        }
    }, []);

    // Helper function to get world coordinates
    const getPointInWorldSpace = useCallback((event: React.MouseEvent | React.PointerEvent | PointerEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const [mx, my] = pointer(event, svgRef.current);
        const [worldX, worldY] = transformRef.current.invert([mx, my]);
        return { x: worldX, y: worldY };
    }, []);

    // This useEffect is ONLY for linking.
    useEffect(() => {
        if (!linkingState || !canvasRef.current) return;

        const handleLinkPointerMove = (e: PointerEvent) => {
            const worldCoords = getPointInWorldSpace(e);
            setLinkingState(prev => prev ? {...prev, toPos: { x: worldCoords.x, y: worldCoords.y }} : null);
        };

        const handleLinkPointerUp = () => {
            // The link end logic is handled by onPointerUp on the target NoteCard,
            // so this just cleans up the visual line if dropped on the background.
            setLinkingState(null);
        };
        
        window.addEventListener('pointermove', handleLinkPointerMove);
        window.addEventListener('pointerup', handleLinkPointerUp, { once: true });

        return () => {
            window.removeEventListener('pointermove', handleLinkPointerMove);
            window.removeEventListener('pointerup', handleLinkPointerUp);
        };
    }, [linkingState, getPointInWorldSpace]);

    const handleNotePointerDown = (e: React.PointerEvent, noteId: string) => {
        // Prevent starting a drag if a link is being created or it's not a primary click
        if (e.button !== 0 || linkingState) return;
        
        const noteCardElement = e.currentTarget as HTMLElement;
        const position = notePositions.get(noteId);
        if (!position) return;
        
        // Capture pointer events to the card
        noteCardElement.setPointerCapture(e.pointerId);

        // Get world coordinates (accounting for zoom)
        const worldCoords = getPointInWorldSpace(e);
        const startX = worldCoords.x;
        const startY = worldCoords.y;
        const offsetX = startX - position.x;
        const offsetY = startY - position.y;
        
        const handlePointerMove = (moveEvent: PointerEvent) => {
            // On the first move after a threshold, register as a drag
            if (!dragInfo.current) {
                const worldMoveCoords = getPointInWorldSpace(moveEvent);
                const dx = worldMoveCoords.x - startX;
                const dy = worldMoveCoords.y - startY;

                if (Math.sqrt(dx * dx + dy * dy) > 5) {
                    dragInfo.current = { noteId, offsetX, offsetY, thresholdPassed: true };
                    noteCardElement.classList.add('active:cursor-grabbing');
                }
            }

            // If dragging, update position via transform for performance and update links
            if (dragInfo.current?.thresholdPassed) {
                const worldMoveCoords = getPointInWorldSpace(moveEvent);
                const newX = worldMoveCoords.x - dragInfo.current.offsetX;
                const newY = worldMoveCoords.y - dragInfo.current.offsetY;
                noteCardElement.style.transform = `translate(${newX}px, ${newY}px)`;
                
                // Update draggedNotePosition to make links follow in real-time
                setDraggedNotePosition({ noteId, x: newX, y: newY });
            }
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            // Always clean up listeners and pointer capture
            window.removeEventListener('pointermove', handlePointerMove);
            noteCardElement.releasePointerCapture(e.pointerId);

            // If a drag occurred, update the state
            if (dragInfo.current?.thresholdPassed) {
                const currentDragInfo = dragInfo.current;
                const worldUpCoords = getPointInWorldSpace(upEvent);
                const newX = worldUpCoords.x - currentDragInfo.offsetX;
                const newY = worldUpCoords.y - currentDragInfo.offsetY;

                onUpdateNexusLayout(layout => ({
                    links: layout?.links || [],
                    notePositions: (layout?.notePositions || []).map(p =>
                        p.userNoteId === currentDragInfo.noteId ? { ...p, x: newX, y: newY } : p
                    ),
                }));
                
                noteCardElement.classList.remove('active:cursor-grabbing');
            }

            // Reset drag info and clear live position for the next interaction
            dragInfo.current = null;
            setDraggedNotePosition(null);
        };
        
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });
    };

    const handleLinkStart = (e: React.PointerEvent, noteId: string) => {
        if (!canvasRef.current) return;
        // Get world coordinates (accounting for zoom and transform)
        const worldCoords = getPointInWorldSpace(e);
        setLinkingState({
            fromId: noteId,
            fromPos: { x: worldCoords.x, y: worldCoords.y },
            toPos: { x: worldCoords.x, y: worldCoords.y },
        });
    };
    
    const handleLinkEnd = (e: React.PointerEvent, noteId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (linkingState && linkingState.fromId !== noteId) {
            onUpdateNexusLayout(layout => {
                const newLink = { sourceNoteId: linkingState.fromId, targetNoteId: noteId };
                const links = layout?.links || [];
                const linkExists = links.some(l => 
                    (l.sourceNoteId === newLink.sourceNoteId && l.targetNoteId === newLink.targetNoteId) ||
                    (l.sourceNoteId === newLink.targetNoteId && l.targetNoteId === newLink.sourceNoteId)
                );
                if (!linkExists) {
                    return { 
                        notePositions: layout?.notePositions || [], 
                        links: [...links, newLink] 
                    };
                }
                return layout || { notePositions: [], links: [] };
            });
        }
        setLinkingState(null);
    };

    const handleNoteCardTagClick = (tagId: string) => {
        setSelectedTagIds(new Set([tagId]));
    };

    return (
        <div className="w-full h-full bg-gray-900 text-white flex">
            <SidePanel 
                tags={activeProjectData.tags || []}
                onUpdateTags={onUpdateTags}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedTagIds={selectedTagIds}
                setSelectedTagIds={setSelectedTagIds}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                session={session}
                activeProject={activeProject}
                onCreateProject={onCreateProject}
                onSwitchProject={onSwitchProject}
                onDeleteProject={onDeleteProject}
                onRenameProject={onRenameProject}
                onRequestConfirmation={onRequestConfirmation}
            />
            
            <main ref={canvasRef} className="flex-grow h-full relative overflow-hidden">
                <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full pointer-events-all">
                    <g id="nexus-content-group">
                        {activeProjectData.nexusLayout?.links.map((link, i) => {
                            const sourcePos = notePositions.get(link.sourceNoteId);
                            const targetPos = notePositions.get(link.targetNoteId);
                            if (!sourcePos || !targetPos) return null;
                            
                            // Use live position during drag for smooth link updates
                            const actualSourcePos = draggedNotePosition?.noteId === link.sourceNoteId 
                                ? { ...sourcePos, x: draggedNotePosition.x, y: draggedNotePosition.y }
                                : sourcePos;
                            const actualTargetPos = draggedNotePosition?.noteId === link.targetNoteId 
                                ? { ...targetPos, x: draggedNotePosition.x, y: draggedNotePosition.y }
                                : targetPos;
                            
                            return (
                                <line 
                                    key={i}
                                    x1={actualSourcePos.x + actualSourcePos.width / 2} 
                                    y1={actualSourcePos.y + actualSourcePos.height / 2}
                                    x2={actualTargetPos.x + actualTargetPos.width / 2}
                                    y2={actualTargetPos.y + actualTargetPos.height / 2}
                                    stroke="rgba(107, 114, 128, 0.5)"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                />
                            )
                        })}
                        {linkingState && (
                            <line 
                                x1={linkingState.fromPos.x} 
                                y1={linkingState.fromPos.y}
                                x2={linkingState.toPos.x}
                                y2={linkingState.toPos.y}
                                stroke="#38bdf8"
                                strokeWidth="2"
                            />
                        )}
                    </g>
                </svg>

                <div 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none notes-container"
                    style={{
                        transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.k})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {filteredNotes.length > 0 ? (
                        filteredNotes.map(note => {
                            const position = notePositions.get(note.id);
                            if (!position) return null;
                            return (
                                <div key={note.id} className="pointer-events-auto">
                                    <NoteCard
                                        note={note}
                                        position={position}
                                        tags={activeProjectData.tags || []}
                                        onDoubleClick={(e) => onOpenStudioForNexusNote(note.id, e.clientX, e.clientY)}
                                        onPointerDown={handleNotePointerDown}
                                        onLinkStart={handleLinkStart}
                                        onLinkEnd={handleLinkEnd}
                                        isLinking={!!linkingState}
                                        onTagClick={handleNoteCardTagClick}
                                    />
                                </div>
                            )
                        })
                    ) : (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-gray-400 pointer-events-none z-0">
                            <BrainCircuit className="w-24 h-24 mx-auto text-gray-600"/>
                            <h2 className="text-2xl mt-4 font-bold">Note Nexus</h2>
                            <p className="mt-2 max-w-md">
                                Create notes on your conceptual map, and they will all appear here, ready to be connected.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default NexusView;