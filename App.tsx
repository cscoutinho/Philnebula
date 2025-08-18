import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { parseMarkdown, flattenData } from './services/dataParser';
import { D3Node, D3Link, Publication, CustomRelationshipType, MapNode, KindleNote, ImportedNoteSource, ConfirmationRequestHandler } from './types';
import NebulaGraph from './components/NebulaGraph';
import InfoPanel from './components/InfoPanel';
import SearchInput from './components/SearchInput';
import SearchResultsDropdown from './components/SearchResultsDropdown';
import ViewSwitcher from './components/ViewSwitcher';
import MapBuilder from './components/MapBuilder/index';
import MapTray from './components/MapTray';
import FeedPage from './components/FeedPage';
import SettingsModal from './components/SettingsModal';
import ProjectSwitcher from './components/ProjectSwitcher';
import ProjectDiaryPanel from './components/ProjectDiaryPanel';
import BeliefFlipChallenge from './components/BeliefFlipChallenge';
import ConfirmDialog from './components/ConfirmDialog';
import { BrainCircuit, SettingsIcon, DiaryIcon, FlaskConicalIcon, LightbulbIcon, BookOpenIcon } from './components/icons';
import { useSessionManager } from './hooks/useSessionManager';
import { useFeedManager } from './hooks/useFeedManager';
import { useNebula } from './hooks/useNebula';
import { useBeliefFlipChallenge } from './hooks/useBeliefFlipChallenge';
import StudioPanel from './components/MapBuilder/Panels/StudioPanel';
import NotesInbox from './components/NotesInbox';
import * as mapBuilderService from './services/mapBuilderService';

// I. Relações de Inferência e Fundamentação (Greens/Blues)
const inferenceAndFoundation = [
    { type: 'Dedutivamente Implica', color: '#22c55e', description: 'Se A é verdadeiro, B deve ser verdadeiro. A mais forte ligação lógica.' }, // green-500
    { type: 'Indutivamente Sugere', color: '#16a34a', description: 'A é observado, então B é provavelmente verdadeiro. Baseado em probabilidade.' }, // green-600
    { type: 'É a Melhor Explicação para', color: '#3b82f6', description: 'A é a teoria mais simples e abrangente que explica o fenômeno B.' }, // blue-500
    { type: 'É um Axioma para', color: '#06b6d4', description: 'A é uma premissa fundamental não provada sobre a qual o sistema B é construído.' }, // cyan-500
];

// II. Relações de Avaliação e Crítica (Reds/Oranges/Pinks)
const assessmentAndCritique = [
    { type: 'Contradiz Logicamente', color: '#ef4444', description: 'A e B são mutuamente exclusivos. A verdade de um implica a falsidade do outro.' }, // red-500
    { type: 'Apresenta um Contraexemplo para', color: '#f97316', description: 'A é um caso particular que invalida a generalização B.' }, // orange-500
    { type: 'Leva a uma Reductio ad Absurdum de', color: '#d946ef', description: 'Assumir A leva a uma consequência absurda, minando a validade de A.' }, // fuchsia-500
    { type: 'Oferece uma Crítica Radical a', color: '#ec4899', description: 'Questiona os pressupostos, origens ou função de poder de B.' }, // pink-500
];

// III. Relações de Distinção e Clarificação Conceitual (Cyans/Indigos)
const distinctionAndClarification = [
    { type: 'É uma Distinção entre', color: '#6366f1', description: 'Articula uma diferença conceitual fundamental entre o conceito de origem e o de destino.' }, // indigo-500
    { type: 'É Condição Necessária para', color: '#818cf8', description: 'B não pode ser verdadeiro ou existir sem A.' }, // indigo-400
    { type: 'É Condição Suficiente para', color: '#4f46e5', description: 'A presença de A garante a presença de B.' }, // indigo-600
];

// IV. Relações de Estrutura e Composição (Yellows/Grays)
const structureAndComposition = [
    { type: 'É uma Propriedade de', color: '#eab308', description: 'A é uma característica ou atributo de B.' }, // yellow-500
    { type: 'É um Tipo de', color: '#9ca3af', description: 'Relação taxonômica. O conceito de origem é uma categoria geral para o conceito de destino.' }, // gray-400
    { type: 'É um Token de', color: '#6b7280', description: 'O conceito de origem é uma instância particular da categoria geral do conceito de destino.' }, // gray-500
];

const defaultRelationshipTypes = [
  ...inferenceAndFoundation,
  ...assessmentAndCritique,
  ...distinctionAndClarification,
  ...structureAndComposition
];

const SUPABASE_URL = 'https://kowbxomppzqgmfagzirc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd2J4b21wcHpxZ21mYWd6aXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTI1MTMsImV4cCI6MjA2ODg2ODUxM30.3R92DVk_HPQBtGc4V3stf7UWQxMeNeazXdZEj_BZdk0';

const App: React.FC = () => {
    // Core Data
    const [data, setData] = useState<{ nodes: D3Node[], links: D3Link[] } | null>(null);

    // AI Instance
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY! }), []);

    // --- Custom Hooks for State and Logic Management ---
    const {
        session,
        setSession,
        activeProject,
        activeProjectData,
        updateActiveProjectData,
        logActivity,
        handleCreateProject,
        handleSwitchProject,
        handleDeleteProject,
        handleRenameProject,
    } = useSessionManager();

    const {
        allPublications,
        setAllPublications,
        isFeedLoading,
        handleAddFeed,
        handleRemoveFeed,
        handleRefreshFeeds,
        handleRefreshSingleFeed,
        handleMarkAsSeen,
    } = useFeedManager(activeProjectData, updateActiveProjectData, logActivity);

    const {
        selectedNode,
        setSelectedNode,
        focusedNode,
        setFocusedNode,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        crossLinks,
        isLoadingCrossLinks,
        relatedConcepts,
        hoveredNode,
        setHoveredNode,
        searchAttempted,
        findRelatedConcepts,
        handleSearchChange,
    } = useNebula(data, ai, logActivity);
    
    const beliefChallenge = useBeliefFlipChallenge(
        ai,
        activeProjectData,
        updateActiveProjectData,
        logActivity,
        data ? data.nodes : null
    );

    // View Management
    const [currentView, setCurrentView] = useState<'nebula' | 'map' | 'feed'>('nebula');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDiaryOpen, setIsDiaryOpen] = useState(false);
    const [isNotesInboxOpen, setIsNotesInboxOpen] = useState(false);
    const [isArgumentStudioOpen, setIsArgumentStudioOpen] = useState(false);
    const [isChallengeOpen, setIsChallengeOpen] = useState(false);
    const [initialWorkbenchData, setInitialWorkbenchData] = useState<any>(null);
    
    // --- Confirmation Dialog State ---
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        message: string;
        onConfirm: () => void;
        title?: string;
        confirmText?: string;
    }>({
        isOpen: false,
        message: '',
        onConfirm: () => {},
    });

    const requestConfirmation: ConfirmationRequestHandler = useCallback((options) => {
        setConfirmation({
            isOpen: true,
            message: options.message,
            title: options.title,
            confirmText: options.confirmText,
            onConfirm: () => {
                options.onConfirm();
                setConfirmation(c => ({...c, isOpen: false}));
            },
        });
    }, []);

    const handleCancelConfirmation = () => {
        setConfirmation(c => ({...c, isOpen: false}));
    };

    // --- Derived State and Memos ---
    const allRelationshipTypes = useMemo(() => {
        const disabledDefaults = new Set(session.disabledDefaultTypes || []);
        const disabledCustoms = new Set(session.disabledCustomTypes || []);
    
        const activeDefaults = defaultRelationshipTypes.filter(
            (rt) => !disabledDefaults.has(rt.type)
        );
    
        const activeCustoms = (session.customRelationshipTypes || [])
            .filter((rt) => !disabledCustoms.has(rt.name))
            .map(ct => ({ type: ct.name, color: ct.color, description: ct.description }));
            
        return [...activeDefaults, ...activeCustoms];
    }, [session.customRelationshipTypes, session.disabledDefaultTypes, session.disabledCustomTypes]);

    const mapTrayConcepts = useMemo(() => {
        if (!data || !activeProjectData) return [];
        const nodeMap = new Map(data.nodes.map(node => [node.id, node]));
        return activeProjectData.mapTrayConceptIds.map(id => nodeMap.get(id)).filter((node): node is D3Node => !!node);
    }, [activeProjectData, data]);

    const nodeIdsWithNewPublications = useMemo(() => {
        if (!activeProjectData) return new Set<number>();
        const feedUrlToNodeId = new Map(activeProjectData.trackedFeeds.map(f => [f.url, f.nodeId]));
        const newPubNodeIds = new Set<number>();
        for (const pub of allPublications) {
            if (pub.isNew) {
                const nodeId = feedUrlToNodeId.get(pub.sourceUrl);
                if (nodeId !== undefined) {
                    newPubNodeIds.add(nodeId);
                }
            }
        }
        return newPubNodeIds;
    }, [allPublications, activeProjectData]);

    // --- Effects ---
    useEffect(() => {
        const root = parseMarkdown();
        const { nodes, links } = flattenData(root);
        setData({ nodes, links });
    }, []);
    
    useEffect(() => {
        // When the active project changes, we need to reset/reload transient state like feeds
        setAllPublications([]);
        if (activeProjectData && activeProjectData.trackedFeeds.length > 0) {
            handleRefreshFeeds(true); // `true` indicates it's a project switch
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProject?.id]);

    // --- Handlers ---
    const handleUpdateCustomRelationshipTypes = useCallback((updater: (currentTypes: CustomRelationshipType[]) => CustomRelationshipType[]) => {
        setSession(prev => ({
            ...prev,
            customRelationshipTypes: updater(prev.customRelationshipTypes || []),
        }));
    }, [setSession]);

    const handleToggleRelationshipType = useCallback((typeName: string, isDefault: boolean) => {
        setSession(prev => {
            const newSession = { ...prev };
            if (isDefault) {
                const disabled = new Set(newSession.disabledDefaultTypes || []);
                disabled.has(typeName) ? disabled.delete(typeName) : disabled.add(typeName);
                newSession.disabledDefaultTypes = Array.from(disabled);
            } else {
                const disabled = new Set(newSession.disabledCustomTypes || []);
                disabled.has(typeName) ? disabled.delete(typeName) : disabled.add(typeName);
                newSession.disabledCustomTypes = Array.from(disabled);
            }
            return newSession;
        });
    }, [setSession]);

    const handleSetAiAssistanceLevel = useCallback((level: 'off' | 'moderate' | 'rigorous') => {
        setSession(prev => ({ ...prev, aiAssistanceLevel: level }));
    }, [setSession]);
    
    const handleSearchResultSelect = useCallback((node: D3Node) => {
        setSelectedNode(node);
        setFocusedNode(node);
        setSearchQuery(node.name);
        setSearchResults([]);
        logActivity('EXPLORE_CONCEPT', { conceptName: node.name, conceptId: node.id });
    }, [logActivity, setFocusedNode, setSearchQuery, setSearchResults, setSelectedNode]);

    const handleNodeSelect = useCallback((node: D3Node | null) => {
        setSelectedNode(node);
        if(node) {
            setFocusedNode(node);
            setSearchQuery(node.name);
            setSearchResults([]);
            logActivity('EXPLORE_CONCEPT', { conceptName: node.name, conceptId: node.id });
        } else {
            setFocusedNode(null);
            setSearchQuery('');
        }
    }, [logActivity, setFocusedNode, setSearchQuery, setSearchResults, setSelectedNode]);

    const handleAddToMapTray = useCallback((node: D3Node) => {
        if (activeProjectData?.mapTrayConceptIds.includes(node.id)) {
            return;
        }
        logActivity('ADD_TO_TRAY', { conceptName: node.name, conceptId: node.id });
        updateActiveProjectData(d => {
            if (d.mapTrayConceptIds.includes(node.id)) return d;
            return {...d, mapTrayConceptIds: [...d.mapTrayConceptIds, node.id]};
        });
    }, [activeProjectData, updateActiveProjectData, logActivity]);
    
    const handleRemoveFromMapTray = (nodeId: number) => {
        updateActiveProjectData(d => ({...d, mapTrayConceptIds: d.mapTrayConceptIds.filter(id => id !== nodeId) }));
    };

    const handleTrayConceptAdd = useCallback((node: D3Node) => {
        updateActiveProjectData(d => {
            if (d.mapLayout.nodes.some(n => n.id === node.id)) {
                return {
                    ...d,
                    mapTrayConceptIds: d.mapTrayConceptIds.filter(id => id !== node.id),
                };
            }
    
            let newX: number;
            let newY: number;
            const nodesOnMap = d.mapLayout.nodes;
            const newNodeWidth = 150;
    
            if (nodesOnMap.length > 0) {
                let rightmostNode = nodesOnMap[0];
                nodesOnMap.forEach(n => {
                    if ((n.x + n.width / 2) > (rightmostNode.x + rightmostNode.width / 2)) {
                        rightmostNode = n;
                    }
                });
                newX = rightmostNode.x + rightmostNode.width / 2 + 20 + newNodeWidth / 2;
                newY = rightmostNode.y;
            } else {
                newX = window.innerWidth / 2;
                newY = window.innerHeight / 3;
            }
    
            const newNode: MapNode = {
                id: node.id,
                name: node.name,
                x: newX,
                y: newY,
                shape: 'rect',
                width: newNodeWidth,
                height: 40,
            };
    
            return {
                ...d,
                mapLayout: {
                    ...d.mapLayout,
                    nodes: [...d.mapLayout.nodes, newNode],
                },
                mapTrayConceptIds: d.mapTrayConceptIds.filter(id => id !== node.id),
            };
        });
    }, [updateActiveProjectData]);

    const handleCloudExport = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/backups`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify([{ id: 'meu_backup', conteudo: session }])
            });

            if (response.ok) {
                return { success: true, message: 'All projects saved to the cloud successfully.' };
            }
            const error = await response.json();
            return { success: false, message: `Error: ${error.message || 'Failed to save session.'}` };
        } catch (error) {
            return { success: false, message: 'Network error. Could not save session.' };
        }
    }, [session]);

    const handleCloudImport = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/backups?id=eq.meu_backup&select=conteudo`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, message: `Error: ${error.message || 'Failed to fetch backup.'}` };
            }

            const data = await response.json();
            if (data.length === 0) return { success: false, message: 'No cloud backup found.' };

            // A more robust validation could be added here
            setSession(data[0].conteudo);
            return { success: true, message: 'Projects restored from the cloud successfully!' };
        } catch (error) {
            return { success: false, message: 'Network error. Could not fetch backup.' };
        }
    }, [setSession]);

    const handleExportMapData = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        if (!activeProjectData) return { success: false, message: "No active project to export." };
    
        const { nodes, links } = activeProjectData.mapLayout;
        const exportableData = {
            graph: {
                metadata: { projectName: activeProject?.name, exportDate: new Date().toISOString() },
                nodes: nodes.map(node => ({
                    id: node.id, label: node.name, isAiGenerated: !!node.isAiGenerated,
                })),
                edges: links.map(link => ({
                    source: link.source, target: link.target, relations: link.relationshipTypes,
                    metadata: { justification: link.justification || null }
                }))
            }
        };
    
        try {
            const jsonString = JSON.stringify(exportableData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeProjectName = activeProject?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `concept_map_${safeProjectName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { success: true, message: "Map data exported successfully." };
        } catch (error) {
            return { success: false, message: "An error occurred during export." };
        }
    }, [activeProject, activeProjectData]);

    const handleDeconstructArgument = (deconstruction: { premises: string[], conclusion: string }) => {
        setIsArgumentStudioOpen(false);
        setInitialWorkbenchData({
            deconstructed: deconstruction,
            mode: 'text-to-map'
        });
        setCurrentView('map');
    };
    
    // --- Notes Inbox Handlers ---
    const handleImportNotes = useCallback((data: Omit<ImportedNoteSource, 'id' | 'notes'> & { notes: Omit<KindleNote, 'sourceId'>[] }) => {
        const sourceId = `source_${Date.now()}`;
        const newSource: ImportedNoteSource = {
            id: sourceId,
            ...data,
            notes: data.notes.map(n => ({ ...n, sourceId })),
        };

        updateActiveProjectData(d => ({
            ...d,
            importedNoteSources: [...(d.importedNoteSources || []), newSource]
        }));
        logActivity('IMPORT_NOTES', { title: data.title, noteCount: data.notes.length });
    }, [updateActiveProjectData, logActivity]);

    const handleDeleteNoteSource = useCallback((sourceId: string) => {
        updateActiveProjectData(d => ({
            ...d,
            importedNoteSources: (d.importedNoteSources || []).filter(s => s.id !== sourceId)
        }));
    }, [updateActiveProjectData]);

    const handleUpdateNoteSourceMetadata = useCallback((sourceId: string, metadata: Partial<Omit<ImportedNoteSource, 'id' | 'notes'>>) => {
        updateActiveProjectData(d => ({
            ...d,
            importedNoteSources: (d.importedNoteSources || []).map(s => 
                s.id === sourceId ? { ...s, ...metadata } : s
            )
        }));
    }, [updateActiveProjectData]);

    const handleMarkNotesAsProcessed = useCallback((noteIds: string[]) => {
        updateActiveProjectData(d => {
            const processed = new Set(d.processedNoteIds || []);
            noteIds.forEach(id => processed.add(id));
            return { ...d, processedNoteIds: Array.from(processed) };
        });
    }, [updateActiveProjectData]);
    
    const handleAddNoteToMap = useCallback(async (note: KindleNote, position: { x: number, y: number }) => {
        const tempId = `temp_${Date.now()}`;
        const placeholderNode: MapNode = {
            id: tempId, name: 'Synthesizing...', x: position.x, y: position.y,
            shape: 'rect', width: 150, height: 40, isAiGenerated: true,
        };

        updateActiveProjectData(d => ({
            ...d,
            mapLayout: { ...d.mapLayout, nodes: [...d.mapLayout.nodes, placeholderNode] }
        }));
        
        handleMarkNotesAsProcessed([note.id]);

        try {
            const { title, provenance } = await mapBuilderService.synthesizeNoteTitle(ai, note.text);
            const source = activeProjectData?.importedNoteSources?.find(s => s.id === note.sourceId);

            logActivity('ADD_NOTE_TO_MAP', {
                title: source?.title || 'Unknown Source',
                noteText: note.text,
                synthesizedTitle: title,
                provenance
            });

            const finalId = `note_${note.id}`;
            const finalNode: MapNode = {
                ...placeholderNode,
                id: finalId,
                name: title,
                sourceNotes: [note],
            };

            updateActiveProjectData(d => ({
                ...d,
                mapLayout: {
                    ...d.mapLayout,
                    nodes: d.mapLayout.nodes.map(n => n.id === tempId ? finalNode : n)
                }
            }));

        } catch (error) {
            console.error("Failed to synthesize note title:", error);
            updateActiveProjectData(d => ({
                ...d,
                mapLayout: { ...d.mapLayout, nodes: d.mapLayout.nodes.filter(n => n.id !== tempId) },
                processedNoteIds: (d.processedNoteIds || []).filter(id => id !== note.id)
            }));
        }
    }, [ai, updateActiveProjectData, handleMarkNotesAsProcessed, logActivity, activeProjectData?.importedNoteSources]);

    const handleAddMultipleNotesToMap = useCallback(async (notes: KindleNote[], position: { x: number; y: number }) => {
        const gridCols = Math.ceil(Math.sqrt(notes.length));
        const spacing = 170;
        let noteIndex = 0;
        
        for (const note of notes) {
            const row = Math.floor(noteIndex / gridCols);
            const col = noteIndex % gridCols;
            const notePosition = {
                x: position.x + col * spacing - (gridCols - 1) * spacing / 2,
                y: position.y + row * spacing
            };
            await handleAddNoteToMap(note, notePosition); // Await to process one by one to avoid rate limits
            noteIndex++;
        }
    }, [handleAddNoteToMap]);
    
    const handleAttachSourceNote = useCallback((nodeId: string | number, notes: KindleNote[]) => {
        updateActiveProjectData(d => ({
            ...d,
            mapLayout: {
                ...d.mapLayout,
                nodes: d.mapLayout.nodes.map(n => {
                    if (n.id === nodeId) {
                        const existingNotes = new Map((n.sourceNotes || []).map(sn => [sn.id, sn]));
                        notes.forEach(newNote => existingNotes.set(newNote.id, newNote));
                        return { ...n, sourceNotes: Array.from(existingNotes.values()) };
                    }
                    return n;
                })
            }
        }));
        handleMarkNotesAsProcessed(notes.map(n => n.id));
    }, [updateActiveProjectData, handleMarkNotesAsProcessed]);
    
    const handleAppendToNodeNotes = useCallback((nodeId: string | number, notes: KindleNote[]) => {
        updateActiveProjectData(d => ({
            ...d,
            mapLayout: {
                ...d.mapLayout,
                nodes: d.mapLayout.nodes.map(n => {
                    if (n.id === nodeId) {
                        const newContent = notes.map(note => `<blockquote>${note.text}</blockquote>`).join('');
                        return { ...n, notes: (n.notes || '') + newContent };
                    }
                    return n;
                })
            }
        }));
        handleMarkNotesAsProcessed(notes.map(n => n.id));
    }, [updateActiveProjectData, handleMarkNotesAsProcessed]);


    // --- Render Logic ---
    if (!activeProjectData) {
        return <div className="flex items-center justify-center h-full w-full bg-black text-white"><p>Loading project...</p></div>;
    }
    
    const renderView = () => {
        switch(currentView) {
            case 'nebula':
                return data ? (
                    <NebulaGraph 
                        nodes={data.nodes}
                        hierarchicalLinks={data.links}
                        crossLinks={crossLinks}
                        onNodeSelect={handleNodeSelect}
                        selectedNode={selectedNode}
                        focusedNode={focusedNode}
                        hoveredNode={hoveredNode}
                        nodeIdsWithNewPublications={nodeIdsWithNewPublications}
                    />
                ) : <div className="flex items-center justify-center h-full"><p>Loading...</p></div>;
            case 'map':
                return (
                    <MapBuilder
                        layout={activeProjectData.mapLayout}
                        setLayout={(updater) => updateActiveProjectData(d => ({ ...d, mapLayout: typeof updater === 'function' ? updater(d.mapLayout) : updater }))}
                        logActivity={logActivity}
                        relationshipTypes={allRelationshipTypes}
                        onExportMapData={handleExportMapData}
                        allNodes={data?.nodes || []}
                        initialWorkbenchData={initialWorkbenchData}
                        onClearInitialWorkbenchData={() => setInitialWorkbenchData(null)}
                        beliefChallenge={beliefChallenge}
                        setIsChallengeOpen={setIsChallengeOpen}
                        aiAssistanceLevel={session.aiAssistanceLevel || 'moderate'}
                        onAddNoteToMap={handleAddNoteToMap}
                        onAddMultipleNotesToMap={handleAddMultipleNotesToMap}
                        onAttachSourceNote={handleAttachSourceNote}
                        onAppendToNodeNotes={handleAppendToNodeNotes}
                    />
                );
            case 'feed':
                return (
                    <FeedPage
                        trackedFeeds={activeProjectData.trackedFeeds}
                        publications={allPublications}
                        isLoading={isFeedLoading}
                        onRemoveFeed={handleRemoveFeed}
                        onRefreshFeeds={() => handleRefreshFeeds(false)}
                        onMarkAsSeen={handleMarkAsSeen}
                        onRefreshSingleFeed={handleRefreshSingleFeed}
                        logActivity={logActivity}
                    />
                );
            default: return null;
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
            <ProjectDiaryPanel 
                isOpen={isDiaryOpen}
                onClose={() => setIsDiaryOpen(false)}
                entries={activeProjectData.projectDiary}
            />
             <BeliefFlipChallenge
                isOpen={isChallengeOpen}
                onClose={() => {
                    beliefChallenge.discardChallenge();
                    setIsChallengeOpen(false)
                }}
                {...beliefChallenge}
            />
            {currentView === 'map' && (
                <NotesInbox
                    isOpen={isNotesInboxOpen}
                    onClose={() => setIsNotesInboxOpen(false)}
                    importedNoteSources={activeProjectData.importedNoteSources || []}
                    processedNoteIds={new Set(activeProjectData.processedNoteIds || [])}
                    onImportNotes={handleImportNotes}
                    onDeleteSource={handleDeleteNoteSource}
                    onUpdateSourceMetadata={handleUpdateNoteSourceMetadata}
                    onMarkNotesAsProcessed={handleMarkNotesAsProcessed}
                    onRequestConfirmation={requestConfirmation}
                />
            )}
            {renderView()}
            
            <header className="absolute top-5 left-5 right-5 z-20 flex justify-between items-start gap-4 pointer-events-none">
                <div id="left-ui-container" className="flex flex-col gap-2.5 pointer-events-auto">
                    {currentView === 'nebula' && (
                        <div className="relative">
                            <SearchInput 
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search for a category..."
                            />
                            {searchQuery.length > 1 && searchResults.length > 0 && (
                                <SearchResultsDropdown 
                                    results={searchResults}
                                    onSelect={handleSearchResultSelect}
                                />
                            )}
                        </div>
                    )}
                     <ProjectSwitcher
                        projects={session.projects}
                        activeProject={activeProject}
                        onCreateProject={handleCreateProject}
                        onSwitchProject={handleSwitchProject}
                        onDeleteProject={handleDeleteProject}
                        onRenameProject={handleRenameProject}
                        onRequestConfirmation={requestConfirmation}
                    />
                </div>
                 <div className="flex items-center gap-2 pointer-events-auto">
                    {currentView === 'map' && (
                         <button onClick={() => setIsNotesInboxOpen(true)} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500" aria-label="Open Notes Inbox">
                            <BookOpenIcon className="w-5 h-5" />
                        </button>
                    )}
                     <button onClick={() => setIsChallengeOpen(true)} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-yellow-500" aria-label="Open Belief Flip Challenge">
                        <LightbulbIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsDiaryOpen(true)} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500" aria-label="Open Project Diary">
                        <DiaryIcon className="w-5 h-5" />
                    </button>
                    {currentView === 'map' && (
                        <button onClick={() => setIsArgumentStudioOpen(true)} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500" aria-label="Analyze Argument from Text">
                            <FlaskConicalIcon className="w-5 h-5" />
                        </button>
                    )}
                    <ViewSwitcher currentView={currentView} setView={setCurrentView} />
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500" aria-label="Open Settings">
                        <SettingsIcon className="w-5 h-5"/>
                    </button>
                </div>
            </header>

            {currentView === 'nebula' && (
                <InfoPanel 
                    node={selectedNode} 
                    onFindRelated={findRelatedConcepts}
                    isLoading={isLoadingCrossLinks}
                    relatedConcepts={relatedConcepts}
                    onConceptSelect={handleSearchResultSelect}
                    setHoveredNode={setHoveredNode}
                    searchAttempted={searchAttempted}
                    onAddToMapTray={handleAddToMapTray}
                    onAddFeed={handleAddFeed}
                    trackedFeeds={activeProjectData.trackedFeeds}
                    nodeIdsWithNewPublications={nodeIdsWithNewPublications}
                    onGoToFeed={() => setCurrentView('feed')}
                />
            )}

            {currentView !== 'feed' && (
                 <MapTray 
                    concepts={mapTrayConcepts} 
                    onRemove={handleRemoveFromMapTray} 
                    onAdd={handleTrayConceptAdd}
                 />
            )}
            
            {isArgumentStudioOpen && (
                 <StudioPanel
                    analysisMode={true}
                    onClose={() => setIsArgumentStudioOpen(false)}
                    onDeconstruct={handleDeconstructArgument}
                    ai={ai}
                    // Props for note-taking mode, not used in analysis mode
                    state={{ nodeId: '', x: window.innerWidth / 2, y: window.innerHeight / 2 }}
                    initialNotes=""
                    nodeName=""
                    onUpdateContent={() => {}}
                    onLogEdit={() => {}}
                    logActivity={logActivity}
                />
            )}

            {currentView === 'map' && activeProjectData.mapLayout.nodes.length === 0 && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-gray-400 pointer-events-none z-0">
                    <BrainCircuit className="w-24 h-24 mx-auto text-gray-600"/>
                    <h2 className="text-2xl mt-4 font-bold">Conceptual Map Builder</h2>
                    <p className="mt-2 max-w-md">
                        Drag concepts from the "Map Tray" on the right or import notes from the Notes Inbox to start building your map.
                    </p>
                </div>
            )}
            
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onCloudExport={handleCloudExport}
                onCloudImport={handleCloudImport}
                customRelationshipTypes={session.customRelationshipTypes || []}
                onUpdateCustomRelationshipTypes={handleUpdateCustomRelationshipTypes}
                ai={ai}
                defaultRelationshipTypes={defaultRelationshipTypes}
                disabledDefaultTypes={session.disabledDefaultTypes || []}
                disabledCustomTypes={session.disabledCustomTypes || []}
                onToggleRelationshipType={handleToggleRelationshipType}
                onRequestConfirmation={requestConfirmation}
                aiAssistanceLevel={session.aiAssistanceLevel || 'moderate'}
                onSetAiAssistanceLevel={handleSetAiAssistanceLevel}
            />

            <ConfirmDialog
                isOpen={confirmation.isOpen}
                message={confirmation.message}
                onConfirm={confirmation.onConfirm}
                onCancel={handleCancelConfirmation}
                title={confirmation.title}
                confirmText={confirmation.confirmText}
            />
        </div>
    );
};

export default App;