


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { parseMarkdown, flattenData } from './services/dataParser';
import { D3Node, D3Link, Publication, CustomRelationshipType, MapNode, KindleNote, ImportedNoteSource, ConfirmationRequestHandler, ConceptualMap, UserNote, TrackedFeed, ResearchAnalysisData, AppTag, AppSessionData } from './types';
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
import MapSwitcher from './components/MapSwitcher';
import ProjectDiaryPanel from './components/ProjectDiaryPanel';
import BeliefFlipChallenge from './components/BeliefFlipChallenge';
import ConfirmDialog from './components/ConfirmDialog';
import { BrainCircuit, SettingsIcon, DiaryIcon, FlaskConicalIcon, LightbulbIcon, BookOpenIcon, X, RefreshCw, GraduationCapIcon, ChevronDown } from './components/icons';
import { useSessionManager } from './hooks/useSessionManager';
import { useFeedManager } from './hooks/useFeedManager';
import { useNebula } from './hooks/useNebula';
import { useBeliefFlipChallenge } from './hooks/useBeliefFlipChallenge';
import StudioPanel from './components/MapBuilder/Panels/StudioPanel';
import NotesInbox from './components/NotesInbox';
import NexusView from './components/NexusView';
import * as mapBuilderService from './services/mapBuilderService';
import * as feedService from './services/feedService';

const formatUserNoteTitleFromKindleNote = (note: KindleNote): string => {
    // Example note.heading: "Destaque - Página 24"
    // Example note.section: "Preface to the 2013 Edition"
    // Desired output: "From: Destaque - Preface to the 2013 Edition - Página 24"

    const headingParts = note.heading.split(' - ');

    // If heading doesn't have the expected format, return the old format
    if (headingParts.length < 2) {
        return `From: ${note.heading}`;
    }

    const noteTypeStr = headingParts[0]; // e.g., "Destaque"
    const locationStr = headingParts.slice(1).join(' - '); // e.g., "Página 24"

    if (note.section && note.section !== 'General Notes') {
        return `From: ${noteTypeStr} - ${note.section} - ${locationStr}`;
    }

    // Fallback for notes without a specific section
    return `From: ${note.heading}`;
};


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
    { type: 'Undefined', color: '#374151', description: 'Um tipo de relação não especificado para quando nenhum dos outros se aplica.' }, // gray-700
];

const defaultRelationshipTypes = [
  ...inferenceAndFoundation,
  ...assessmentAndCritique,
  ...distinctionAndClarification,
  ...structureAndComposition
];

const SUPABASE_URL = 'https://kowbxomppzqgmfagzirc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd2J4b21wcHpxZ21mYWd6aXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTI1MTMsImV4cCI6MjA2ODg2ODUxM30.3R92DVk_HPQBtGc4V3stf7UWQxMeNeazXdZEj_BZdk0';

const cleanupOrphanedTags = (projectData: AppSessionData): AppSessionData => {
    const allNotes: UserNote[] = [];
    projectData.maps.forEach(map => {
        map.layout.nodes.forEach(node => {
            if (node.userNotes) {
                allNotes.push(...node.userNotes);
            }
        });
    });

    const usedTagIds = new Set<string>();
    allNotes.forEach(note => {
        note.tagIds?.forEach(tagId => {
            usedTagIds.add(tagId);
        });
    });

    const existingTags = projectData.tags || [];
    const cleanedTags = existingTags.filter(tag => usedTagIds.has(tag.id));

    if (existingTags.length === cleanedTags.length) {
        return projectData;
    }

    return { ...projectData, tags: cleanedTags };
};


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
    const [currentView, setCurrentView] = useState<'nebula' | 'map' | 'feed' | 'nexus'>('nebula');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDiaryOpen, setIsDiaryOpen] = useState(false);
    const [isNotesInboxOpen, setIsNotesInboxOpen] = useState(false);
    const [isChallengeOpen, setIsChallengeOpen] = useState(false);
    const [initialWorkbenchData, setInitialWorkbenchData] = useState<any>(null);
    const [notesToPlace, setNotesToPlace] = useState<KindleNote[] | null>(null);
    const [nexusFocusNoteId, setNexusFocusNoteId] = useState<string | null>(null);
    const [nexusFilterTagId, setNexusFilterTagId] = useState<string | null>(null);

    // Unified Studio Panel State
    type StudioState = {
        mode: 'map' | 'nexus' | 'analysis';
        mapNodeId?: string | number;
        userNoteId?: string;
        x: number;
        y: number;
    };
    const [studioState, setStudioState] = useState<StudioState | null>(null);
    
    // Research Analysis State
    const [isResearchAnalysisOpen, setIsResearchAnalysisOpen] = useState(false);
    const [researchAnalysisData, setResearchAnalysisData] = useState<ResearchAnalysisData | null>(null);
    type LoadingState = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error';
    const [researchAnalysisLoadingState, setResearchAnalysisLoadingState] = useState<LoadingState>('idle');
    const [currentAnalysisNodeName, setCurrentAnalysisNodeName] = useState<string | null>(null);
    const [publicationTitleToUrlMap, setPublicationTitleToUrlMap] = useState<Map<string, string>>(new Map());
    
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
    const activeMap = useMemo(() => {
        if (!activeProjectData || !activeProjectData.activeMapId) return null;
        return activeProjectData.maps.find(m => m.id === activeProjectData.activeMapId);
    }, [activeProjectData]);

    const activeMapLayout = useMemo(() => {
        return activeMap ? activeMap.layout : { nodes: [], links: [], logicalConstructs: [] };
    }, [activeMap]);

    const allUserNotesWithNodeInfo = useMemo(() => {
        if (!activeProjectData) return [];
        const notes: (UserNote & { mapNodeId: string | number, mapNodeName: string })[] = [];
        activeProjectData.maps.forEach(map => {
            map.layout.nodes.forEach(node => {
                if (node.userNotes) {
                    node.userNotes.forEach(un => {
                        notes.push({ ...un, mapNodeId: node.id, mapNodeName: node.name });
                    });
                }
            });
        });
        return notes;
    }, [activeProjectData]);

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

    // --- Map Management Handlers ---
    const handleCreateMap = useCallback((name: string) => {
        const newMap: ConceptualMap = {
            id: `map_${Date.now()}`,
            name,
            layout: { nodes: [], links: [], logicalConstructs: [] },
        };
        updateActiveProjectData(d => ({
            ...d,
            maps: [...d.maps, newMap],
            activeMapId: newMap.id,
        }));
    }, [updateActiveProjectData]);

    const handleSwitchMap = useCallback((mapId: string) => {
        updateActiveProjectData(d => ({ ...d, activeMapId: mapId }));
    }, [updateActiveProjectData]);

    const handleRenameMap = useCallback((mapId: string, newName: string) => {
        updateActiveProjectData(d => ({
            ...d,
            maps: d.maps.map(m => m.id === mapId ? { ...m, name: newName } : m)
        }));
    }, [updateActiveProjectData]);

    const handleDeleteMap = useCallback((mapId: string) => {
        updateActiveProjectData(d => {
            const remainingMaps = d.maps.filter(m => m.id !== mapId);
            if (remainingMaps.length === 0) {
                const newMap: ConceptualMap = { id: `map_${Date.now()}`, name: 'Main Map', layout: { nodes: [], links: [], logicalConstructs: [] } };
                return { ...d, maps: [newMap], activeMapId: newMap.id };
            }
            const newActiveMapId = d.activeMapId === mapId ? remainingMaps[0].id : d.activeMapId;
            return { ...d, maps: remainingMaps, activeMapId: newActiveMapId };
        });
    }, [updateActiveProjectData]);

    const handleSetLayout = useCallback((updater: any) => {
        updateActiveProjectData(d => {
            if (!d.activeMapId) return d;
            return {
                ...d,
                maps: d.maps.map(m => {
                    if (m.id === d.activeMapId) {
                        const newLayout = typeof updater === 'function' ? updater(m.layout) : updater;
                        return { ...m, layout: newLayout };
                    }
                    return m;
                })
            };
        });
    }, [updateActiveProjectData]);
    
    // --- Studio Handlers ---
    const handleOpenStudioForMapNode = useCallback((nodeId: string | number, x: number, y: number) => {
        setStudioState({
            mode: 'map',
            mapNodeId: nodeId,
            x: x,
            y: y,
        });
    }, []);

    const handleOpenStudioForNexusNote = useCallback((userNoteId: string, x: number, y: number) => {
        setStudioState({
            mode: 'nexus',
            userNoteId,
            x,
            y,
        });
    }, []);

    // --- Nexus Handlers ---
    const handleUpdateNexusLayout = useCallback((updater: (layout: AppSessionData['nexusLayout']) => AppSessionData['nexusLayout']) => {
        updateActiveProjectData(d => ({
            ...d,
            nexusLayout: updater(d.nexusLayout || { notePositions: [], links: [] }),
        }));
    }, [updateActiveProjectData]);

    const handleNavigateToNexusNote = useCallback((userNoteId: string) => {
        setStudioState(null); // Close studio if open
        setNexusFocusNoteId(userNoteId);
        setCurrentView('nexus');
    }, []);

    const handleNavigateToNexusTag = useCallback((tagId: string) => {
        setStudioState(null);
        setNexusFilterTagId(tagId);
        setCurrentView('nexus');
    }, []);

    // --- Research Analysis Handler ---
    const handleAnalyzeResearchTrends = useCallback(async (feed: TrackedFeed) => {
        setIsResearchAnalysisOpen(true);
        setResearchAnalysisLoadingState('fetching');
        setCurrentAnalysisNodeName(feed.nodeName);
        setResearchAnalysisData(null);
        setPublicationTitleToUrlMap(new Map());

        try {
            const { publications } = await feedService.fetchFullFeed(feed.url, feed.nodeName, 50);
            
            const titleToUrl = new Map<string, string>();
            publications.forEach(p => {
                titleToUrl.set(p.title, p.link);
            });
            setPublicationTitleToUrlMap(titleToUrl);

            if (publications.length < 10) {
                throw new Error("Not enough recent publications found to perform a meaningful analysis.");
            }
            
            setResearchAnalysisLoadingState('analyzing');

            const publicationsList = publications.map(p => ({ title: p.title, author: p.author }));
            const { data: analysisData, provenance } = await feedService.analyzeResearchTrends(ai, feed.nodeName, publicationsList);
            
            logActivity('ANALYZE_RESEARCH_TRENDS', {
                conceptName: feed.nodeName,
                publicationCount: publications.length,
                provenance
            });
            
            setResearchAnalysisData(analysisData);
            setResearchAnalysisLoadingState('done');

        } catch (error) {
            console.error("Failed to analyze research trends:", error);
            setResearchAnalysisLoadingState('error');
        }
    }, [ai, logActivity]);
    
    const handleUpdateUserNotesForMapNode = useCallback((mapNodeId: string | number, userNotes: UserNote[]) => {
        updateActiveProjectData(d => {
            const updatedData = {
                ...d,
                maps: d.maps.map(m => ({
                    ...m,
                    layout: {
                        ...m.layout,
                        nodes: m.layout.nodes.map(n => {
                            if (n.id === mapNodeId) {
                                return { ...n, userNotes };
                            }
                            return n;
                        })
                    }
                }))
            };
            return cleanupOrphanedTags(updatedData);
        });
    }, [updateActiveProjectData]);

    const handleUpdateUserNote = useCallback((updatedNote: UserNote) => {
        updateActiveProjectData(d => {
            // Parse content for tags
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = updatedNote.content;
            const contentText = tempDiv.textContent || "";
            
            const hashtagRegex = /#([a-zA-Z0-9_][a-zA-Z0-9_-]*)/g;
            const foundTagNames = new Set<string>();
            let match;
            while ((match = hashtagRegex.exec(contentText)) !== null) {
                foundTagNames.add(match[1]);
            }
    
            let projectTags = [...(d.tags || [])];
            const newTagsToAdd: AppTag[] = [];
            const finalNoteTagIds = new Set<string>();
    
            // Process found tags
            foundTagNames.forEach(tagName => {
                const normalizedTagName = tagName.toLowerCase();
                let existingTag = projectTags.find(t => t.name.toLowerCase() === normalizedTagName);
                
                if (!existingTag) {
                    // Create new tag if it doesn't exist
                    const newTag: AppTag = {
                        id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        name: tagName,
                        color: '#6366f1', // Standard default color (indigo-500)
                    };
                    newTagsToAdd.push(newTag);
                    finalNoteTagIds.add(newTag.id);
                } else {
                    finalNoteTagIds.add(existingTag.id);
                }
            });
            
            const finalProjectTags = [...projectTags, ...newTagsToAdd];
            const finalUpdatedNote = { ...updatedNote, tagIds: Array.from(finalNoteTagIds) };
    
            // Update project data with the modified note and possibly new tags
            const newMaps = d.maps.map(m => ({
                ...m,
                layout: {
                    ...m.layout,
                    nodes: m.layout.nodes.map(n => ({
                        ...n,
                        userNotes: (n.userNotes || []).map(un => 
                            un.id === finalUpdatedNote.id ? finalUpdatedNote : un
                        )
                    }))
                }
            }));
    
            const projectWithUpdatedNoteAndTags = { ...d, maps: newMaps, tags: finalProjectTags };
            return cleanupOrphanedTags(projectWithUpdatedNoteAndTags);
        });
    }, [updateActiveProjectData]);

    const handleUpdateTags = useCallback((tags: AppTag[]) => {
        updateActiveProjectData(d => ({ ...d, tags }));
    }, [updateActiveProjectData]);

    // --- Other Handlers ---
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
            if (!d.activeMapId) return d;
            const activeMapIndex = d.maps.findIndex(m => m.id === d.activeMapId);
            if (activeMapIndex === -1) return d;

            const activeMap = d.maps[activeMapIndex];
            if (activeMap.layout.nodes.some(n => n.id === node.id)) {
                return {
                    ...d,
                    mapTrayConceptIds: d.mapTrayConceptIds.filter(id => id !== node.id),
                };
            }
    
            let newX: number;
            let newY: number;
            const nodesOnMap = activeMap.layout.nodes;
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
            
            const newLayout = { ...activeMap.layout, nodes: [...activeMap.layout.nodes, newNode] };
            const newMaps = [...d.maps];
            newMaps[activeMapIndex] = { ...activeMap, layout: newLayout };

            return {
                ...d,
                maps: newMaps,
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
        if (!activeMap) return { success: false, message: "No active map to export." };
    
        const { nodes, links } = activeMapLayout;
        const exportableData = {
            graph: {
                metadata: { projectName: activeProject?.name, mapName: activeMap.name, exportDate: new Date().toISOString() },
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
            const safeMapName = activeMap.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `concept_map_${safeProjectName}_${safeMapName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { success: true, message: "Map data exported successfully." };
        } catch (error) {
            return { success: false, message: "An error occurred during export." };
        }
    }, [activeProject, activeMap, activeMapLayout]);

    const handleDeconstructArgument = (deconstruction: { premises: string[], conclusion: string }) => {
        setStudioState(null);
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

        handleSetLayout(l => ({ ...l, nodes: [...l.nodes, placeholderNode] }));
        
        handleMarkNotesAsProcessed([note.id]);

        try {
            const source = activeProjectData?.importedNoteSources?.find(s => s.id === note.sourceId);
            
            // Gather context for the new prompt
            const existingMapConcepts = (activeMapLayout.nodes || [])
                .map(n => n.name)
                .filter(name => name !== 'Synthesizing...') // Exclude placeholders
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 10); // Take up to 10 random concepts

            const { title, provenance } = await mapBuilderService.synthesizeNoteTitle(ai, note, source, existingMapConcepts);

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
                userNotes: [{
                    id: `note_${note.id}_content`,
                    title: formatUserNoteTitleFromKindleNote(note),
                    content: `<p>${note.text}</p>`,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }],
            };

            handleSetLayout(l => ({
                ...l,
                nodes: l.nodes.map(n => n.id === tempId ? finalNode : n)
            }));

        } catch (error) {
            console.error("Failed to synthesize note title:", error);
            handleSetLayout(l => ({ ...l, nodes: l.nodes.filter(n => n.id !== tempId) }));
            // un-mark as processed
            updateActiveProjectData(d => ({
                ...d,
                processedNoteIds: (d.processedNoteIds || []).filter(id => id !== note.id)
            }));
        }
    }, [ai, handleSetLayout, handleMarkNotesAsProcessed, logActivity, activeProjectData?.importedNoteSources, updateActiveProjectData, activeMapLayout.nodes]);

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
    
    const handleAppendToNodeNotes = useCallback((nodeId: string | number, notes: KindleNote[]) => {
        const node = activeMapLayout.nodes.find(n => n.id === nodeId);
        const source = activeProjectData?.importedNoteSources?.find(s => s.id === notes[0]?.sourceId);

        if (node) {
            logActivity('APPEND_NOTE_TO_NODE', {
                conceptName: node.name,
                conceptId: node.id,
                noteCount: notes.length,
                sourceTitle: source?.title || 'Unknown Source',
            });
        }

        handleSetLayout(l => ({
            ...l,
            nodes: l.nodes.map(n => {
                if (n.id === nodeId) {
                    const newNotes: UserNote[] = notes.map((note, index) => {
                        const now = Date.now();
                        return {
                            id: `note_${now}_${Math.random().toString(36).substring(2, 9)}_${index}`,
                            title: formatUserNoteTitleFromKindleNote(note),
                            content: `<blockquote><p>${note.text}</p></blockquote><p><br></p>`,
                            createdAt: now,
                            updatedAt: now,
                        };
                    });
                    const updatedUserNotes = [...(n.userNotes || []), ...newNotes];
                    const { notes: oldNotes, ...restOfNode } = n as MapNode & { notes?: string };
                    return { ...restOfNode, userNotes: updatedUserNotes };
                }
                return n;
            })
        }));
        handleMarkNotesAsProcessed(notes.map(n => n.id));
    }, [handleSetLayout, handleMarkNotesAsProcessed, logActivity, activeMapLayout.nodes, activeProjectData?.importedNoteSources]);

    const handleAddSelectedNotesToMap = useCallback((notes: KindleNote[]) => {
        setNotesToPlace(notes);
        setIsNotesInboxOpen(false); // Close inbox to reveal map for placement
    }, []);

    const handleClearNotesToPlace = useCallback(() => {
        setNotesToPlace(null);
    }, []);


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
                        layout={activeMapLayout}
                        setLayout={handleSetLayout}
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
                        onAppendToNodeNotes={handleAppendToNodeNotes}
                        onRequestConfirmation={requestConfirmation}
                        notesToPlace={notesToPlace}
                        onClearNotesToPlace={handleClearNotesToPlace}
                        onOpenStudio={handleOpenStudioForMapNode}
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
                        onAnalyzeResearch={handleAnalyzeResearchTrends}
                    />
                );
            case 'nexus':
                return (
                    <NexusView
                        allUserNotes={allUserNotesWithNodeInfo}
                        activeProjectData={activeProjectData}
                        updateActiveProjectData={updateActiveProjectData}
                        onOpenStudioForNexusNote={handleOpenStudioForNexusNote}
                        focusNoteId={nexusFocusNoteId}
                        onClearFocusNote={() => setNexusFocusNoteId(null)}
                        focusTagId={nexusFilterTagId}
                        onClearFocusTag={() => setNexusFilterTagId(null)}
                        onUpdateNexusLayout={handleUpdateNexusLayout}
                        onUpdateTags={handleUpdateTags}
                        session={session}
                        activeProject={activeProject}
                        onCreateProject={handleCreateProject}
                        onSwitchProject={handleSwitchProject}
                        onDeleteProject={handleDeleteProject}
                        onRenameProject={handleRenameProject}
                        onRequestConfirmation={requestConfirmation}
                    />
                );
            default: return null;
        }
    };
    
    const studioUserNote = useMemo(() => {
        if (studioState?.mode !== 'nexus' || !studioState.userNoteId) return null;
        return allUserNotesWithNodeInfo.find(un => un.id === studioState.userNoteId) || null;
    }, [studioState, allUserNotesWithNodeInfo]);


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
                    onAddSelectedNotesToMap={handleAddSelectedNotesToMap}
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
                    {currentView !== 'nexus' && (
                        <ProjectSwitcher
                            projects={session.projects}
                            activeProject={activeProject}
                            onCreateProject={handleCreateProject}
                            onSwitchProject={handleSwitchProject}
                            onDeleteProject={handleDeleteProject}
                            onRenameProject={handleRenameProject}
                            onRequestConfirmation={requestConfirmation}
                        />
                    )}
                    {currentView === 'map' && activeProjectData && (
                        <MapSwitcher
                            maps={activeProjectData.maps}
                            activeMap={activeMap}
                            onCreateMap={handleCreateMap}
                            onSwitchMap={handleSwitchMap}
                            onDeleteMap={handleDeleteMap}
                            onRenameMap={handleRenameMap}
                            onRequestConfirmation={requestConfirmation}
                        />
                    )}
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
                        <button onClick={() => setStudioState({ mode: 'analysis', x: window.innerWidth / 2, y: window.innerHeight / 2 })} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-500" aria-label="Analyze Argument from Text">
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

            {currentView !== 'feed' && currentView !== 'nexus' && (
                 <MapTray 
                    concepts={mapTrayConcepts} 
                    onRemove={handleRemoveFromMapTray} 
                    onAdd={handleTrayConceptAdd}
                 />
            )}
            
            {studioState && studioState.mode === 'analysis' && (
                 <StudioPanel
                    analysisMode={true}
                    onClose={() => setStudioState(null)}
                    onDeconstruct={handleDeconstructArgument}
                    ai={ai}
                    state={{ nodeId: '', x: window.innerWidth / 2, y: window.innerHeight / 2 }}
                    nodeName=""
                    logActivity={logActivity}
                    userNotes={[]}
                    onLogEdit={() => {}}
                    activeUserNote={null}
                    allProjectNotes={[]}
                    allProjectTags={[]}
                    onUpdateUserNote={() => {}}
                    onUpdateTags={() => {}}
                    onNavigateToNexusTag={() => {}}
                />
            )}

            {studioState && studioState.mode === 'map' && activeMap && (() => {
                const node = activeMap.layout.nodes.find(n => n.id === studioState.mapNodeId);
                if (!node) return null;
                return (
                    <StudioPanel
                        state={{ nodeId: node.id, x: studioState.x, y: studioState.y }}
                        activeUserNote={null}
                        userNotes={node.userNotes || []}
                        nodeName={node.name}
                        onClose={() => setStudioState(null)}
                        onUpdateUserNotesForMapNode={handleUpdateUserNotesForMapNode}
                        onUpdateUserNote={handleUpdateUserNote}
                        onLogEdit={(nodeId, noteTitle) => logActivity('EDIT_NOTE', {
                            conceptId: nodeId,
                            conceptName: node.name,
                            noteTitle: noteTitle
                        })}
                        logActivity={logActivity}
                        ai={ai}
                        allProjectNotes={allUserNotesWithNodeInfo}
                        allProjectTags={activeProjectData.tags || []}
                        onUpdateTags={handleUpdateTags}
                        onNavigateToNexusTag={handleNavigateToNexusTag}
                    />
                );
            })()}

            {studioState && studioState.mode === 'nexus' && studioUserNote && (
                <StudioPanel
                    state={{ nodeId: studioUserNote.mapNodeId, x: studioState.x, y: studioState.y }}
                    activeUserNote={studioUserNote}
                    userNotes={[studioUserNote]}
                    nodeName={studioUserNote.mapNodeName}
                    onClose={() => setStudioState(null)}
                    onUpdateUserNote={handleUpdateUserNote}
                    onLogEdit={(nodeId, noteTitle) => logActivity('EDIT_NOTE', {
                        conceptId: nodeId,
                        conceptName: studioUserNote.mapNodeName,
                        noteTitle: noteTitle
                    })}
                    logActivity={logActivity}
                    ai={ai}
                    allProjectNotes={allUserNotesWithNodeInfo}
                    allProjectTags={activeProjectData.tags || []}
                    onUpdateTags={handleUpdateTags}
                    onNavigateToNexusTag={handleNavigateToNexusTag}
                />
            )}


            {currentView === 'map' && activeMapLayout.nodes.length === 0 && (
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
            
            <ResearchAnalysisModal
                isOpen={isResearchAnalysisOpen}
                onClose={() => setIsResearchAnalysisOpen(false)}
                loadingState={researchAnalysisLoadingState}
                data={researchAnalysisData}
                nodeName={currentAnalysisNodeName}
                publicationTitleToUrlMap={publicationTitleToUrlMap}
            />
        </div>
    );
};

const ResearchAnalysisModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    loadingState: 'idle' | 'fetching' | 'analyzing' | 'done' | 'error';
    data: ResearchAnalysisData | null;
    nodeName: string | null;
    publicationTitleToUrlMap: Map<string, string>;
}> = ({ isOpen, onClose, loadingState, data, nodeName, publicationTitleToUrlMap }) => {
    if (!isOpen) return null;

    const getLoadingMessage = () => {
        switch (loadingState) {
            case 'fetching': return `Fetching the 50 most recent publications in '${nodeName}'...`;
            case 'analyzing': return `The AI is synthesizing themes and identifying patterns...`;
            case 'error': return `An error occurred. The AI could not complete the analysis. This may be due to a lack of recent publications or a network issue.`;
            default: return 'Preparing analysis...';
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-full max-w-3xl text-white flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center gap-2">
                        <GraduationCapIcon className="w-6 h-6"/>
                        Research Overview: {nodeName}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {loadingState !== 'done' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            {loadingState !== 'error' && <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />}
                            <p className={`mt-4 text-lg ${loadingState === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                                {getLoadingMessage()}
                            </p>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-100 mb-2">General Summary</h3>
                                <p className="text-gray-300 leading-relaxed">{data.generalSummary}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-100 mb-3">Key Themes</h3>
                                <div className="space-y-3">
                                    {data.keyThemes.map((theme, index) => (
                                        <details key={index} className="bg-gray-900/50 rounded-lg group" open={index < 2}>
                                            <summary className="flex justify-between items-center p-3 cursor-pointer list-none">
                                                <span className="font-semibold text-cyan-300">{theme.theme}</span>
                                                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="px-4 pb-4 border-t border-gray-700">
                                                <p className="text-gray-300 mt-3 mb-2">{theme.description}</p>
                                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Representative Titles</h5>
                                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                                                    {theme.representativeTitles.map((title, i) => {
                                                        const url = publicationTitleToUrlMap.get(title);
                                                        return (
                                                            <li key={i}>
                                                                {url ? (
                                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-200 hover:underline">
                                                                        {title}
                                                                    </a>
                                                                ) : (
                                                                    title
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-100 mb-2">Potential Debates</h3>
                                <p className="text-gray-300 leading-relaxed">{data.potentialDebates}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-2">Notable Authors</h3>
                                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                                        {data.notableAuthors.map(author => <li key={author}>{author}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-2">Future Questions</h3>
                                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                                        {data.futureQuestions.map(q => <li key={q}>{q}</li>)}
                                    </ol>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="flex-shrink-0 p-3 bg-gray-900/50 text-xs text-gray-500 border-t border-gray-700 text-center">
                    Analysis generated by AI based on the titles of up to 50 recent publications. The content of the articles was not analyzed.
                </div>
            </div>
        </div>
    );
};

export default App;