import React, { useState, useMemo } from 'react';
import { 
    BookOpen, 
    Book, 
    FileText, 
    Plus, 
    Trash2, 
    Edit, 
    Search, 
    MessageSquare, 
    Check, 
    X, 
    HelpCircle, 
    MapPin, 
    ArrowRight, 
    ExternalLink, 
    ChevronRight,
    Sparkles,
    AlertCircle,
    Info
} from 'lucide-react';
import { AppSessionData, WikiSource, WikiCategoryEntry, D3Node } from '../types';
import { parseWikiStructuredText, resolveToTaxonomyCategory } from '../services/wikiParser';
import ProjectSwitcher from './ProjectSwitcher';

const AI_PROMPT_TEMPLATE = `Você é um Pesquisador Sênior e Especialista em Ontologia Filosófica.
Sua tarefa é analisar o artigo, livro ou capítulo fornecido e mapear suas ideias centrais estritamente de acordo com as seguintes diretrizes de formato para o sistema Ágora do Debate.

Siga exatamente o formato abaixo, sem adicionar comentários informais fora dos blocos:

# METADADOS
Título: [Inserir título exato do texto analisado entre aspas se preferir]
Autor: [Inserir nome completo do autor principal]
Tipo: [Inserir se é 'Artigo', 'Livro' ou 'Capítulo']

# RESUMO GERAL
[Escreva um parágrafo resumindo o problema central do texto, as teses principais e os termos filosóficos fundamentais introduzidos pelo autor].

# CATEGORIAS MAPEADAS

Abaixo estão os pontos de detalhe do mapeamento associados diretamente a categorias da taxonomia do PhilPapers. Cada categoria mapeada deve ter seu próprio bloco começando com "## Categoria: [Nome da Categoria em Inglês ou Português]":

## Categoria: [Primeira Categoria do PhilPapers, por exemplo: "Epistemic Akrasia", "Ethics of Belief", "The Self" ou "Speech Acts"]
Caminho PhilPapers: [Caminho hierárquico na ontologia como "Metaphysics and Epistemology > Epistemology > ..."]
Notas de Debate: [Notas detalhadas e críticas explicando de forma precisa como o autor explora ou mobiliza esta categoria no argumento. Seja profundo e use o vocabulário do texto.]

## Categoria: [Segunda Categoria se houver]
Caminho PhilPapers: [... > ...]
Notas de Debate: [...]

Instruções Adicionais IMPORTANTES:
- Certifique-se de que os nomes de Categoria correspondam intimamente a itens da taxonomia do PhilPapers (ex: 'Ethics of Belief', 'Justification', 'Epistemic Reasons', 'The Self', 'Speech Acts', etc.).
- Não use sub-listas de caminhos inválidos como título da categoria. Reserve-as para a linha "Caminho PhilPapers".
- Forneça notas ricas e acadêmicas para as Notas de Debate.`;

interface WikiPageProps {
    data: { nodes: D3Node[]; links: any[] } | null;
    activeProjectData: AppSessionData | null;
    updateActiveProjectData: (updater: (currentData: AppSessionData) => AppSessionData) => void;
    logActivity: (type: string, payload: { [key: string]: any }) => void;
    session: any;
    activeProject: any;
    onCreateProject: (name: string) => void;
    onSwitchProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onArchiveProject: (projectId: string) => void;
    onUnarchiveProject: (projectId: string) => void;
    onRequestConfirmation: any;
}

const formatTextWithStyles = (text: string) => {
    // Simple tokenization for bold (**text**), italic (*text*) and inline code (`text`)
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i} className="text-indigo-200 italic">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-indigo-300 font-mono text-2xs">{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

const renderMarkdownSummary = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
        <div className="space-y-3 text-sm text-slate-200 leading-relaxed font-sans">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) {
                    return <div key={idx} className="h-2" />;
                }

                // Check for headers (e.g. ### Header)
                if (trimmed.startsWith('###')) {
                    const headerText = trimmed.replace(/^###\s*/, '');
                    return (
                        <h4 key={idx} className="text-sm font-bold text-indigo-200 tracking-wider uppercase mt-4 mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-3.5 rounded bg-indigo-500 inline-block" />
                            {formatTextWithStyles(headerText)}
                        </h4>
                    );
                }
                if (trimmed.startsWith('##')) {
                    const headerText = trimmed.replace(/^##\s*/, '');
                    return (
                        <h4 key={idx} className="text-sm font-bold text-indigo-300 tracking-wider uppercase mt-4 mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-3.5 rounded bg-indigo-500 inline-block" />
                            {formatTextWithStyles(headerText)}
                        </h4>
                    );
                }

                // Check for lists (e.g. - item, * item)
                if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    const listText = trimmed.replace(/^[\-\*]\s*/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2 ml-3 text-slate-200">
                            <span className="text-indigo-400 font-bold select-none">•</span>
                            <span className="flex-1">{formatTextWithStyles(listText)}</span>
                        </div>
                    );
                }

                // Check for numbered lists (e.g. 1. item, 2. item)
                if (/^\d+\.\s+/.test(trimmed)) {
                    const numberMatch = trimmed.match(/^(\d+)\.\s+/);
                    const num = numberMatch ? numberMatch[1] : '1';
                    const listText = trimmed.replace(/^\d+\.\s*/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2 ml-3 text-slate-100">
                            <span className="text-indigo-400 font-bold font-mono select-none">{num}.</span>
                            <span className="flex-1">{formatTextWithStyles(listText)}</span>
                        </div>
                    );
                }

                return (
                    <p key={idx} className="text-slate-100">
                        {formatTextWithStyles(trimmed)}
                    </p>
                );
            })}
        </div>
    );
};

export const WikiPage: React.FC<WikiPageProps> = ({
    data,
    activeProjectData,
    updateActiveProjectData,
    logActivity,
    session,
    activeProject,
    onCreateProject,
    onSwitchProject,
    onDeleteProject,
    onRenameProject,
    onArchiveProject,
    onUnarchiveProject,
    onRequestConfirmation
}) => {
    // Current state settings
    const [selectedTab, setSelectedTab] = useState<'categories' | 'readings'>('categories');
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    // Editing State for Category Entry
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editingEntryNotes, setEditingEntryNotes] = useState('');

    // Import Wizard State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [rawPastedText, setRawPastedText] = useState('');
    const [parsedPreview, setParsedPreview] = useState<{
        source: {
            title: string;
            author: string;
            type: 'article' | 'book' | 'chapter';
            generalSummary: string;
        };
        entries: {
            categoryName: string;
            notes: string;
            subcategoryName?: string;
        }[];
    } | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    // Quick Add Entry (Arena de Debate) State
    const [quickAddSourceId, setQuickAddSourceId] = useState('');
    const [quickAddNotes, setQuickAddNotes] = useState('');

    // States for AI category summaries
    const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Safe retrieve of Wiki Sources and Entries from State
    const wikiSources = useMemo<WikiSource[]>(() => {
        return activeProjectData?.wikiSources || [];
    }, [activeProjectData?.wikiSources]);

    const wikiCategoryEntries = useMemo<WikiCategoryEntry[]>(() => {
        return activeProjectData?.wikiCategoryEntries || [];
    }, [activeProjectData?.wikiCategoryEntries]);

    // Gather all distinct taxonomy categories that exist in our PhilPapers data
    const taxonomyCategories = useMemo(() => {
        if (!data || !data.nodes) return [];
        return data.nodes.map(n => n.name).filter((v, i, self) => self.indexOf(v) === i).sort();
    }, [data]);

    // Removed local resolver definition in favor of imported resolveToTaxonomyCategory

    // Categories with entries counter map
    const categoryEntriesCountMap = useMemo(() => {
        const counts: { [key: string]: number } = {};
        wikiCategoryEntries.forEach(entry => {
            counts[entry.categoryName] = (counts[entry.categoryName] || 0) + 1;
        });
        return counts;
    }, [wikiCategoryEntries]);

    // Handler for pasting raw structured text
    const handlePasteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setRawPastedText(text);
        if (!text.trim()) {
            setParsedPreview(null);
            setParseError(null);
            return;
        }

        try {
            const parsed = parseWikiStructuredText(text, taxonomyCategories);
            if (!parsed.source.title || parsed.source.title === 'Untitled Reading') {
                setParseError("Aviso: Não foi possível detectar o título do texto automaticamente. Por favor, ajuste abaixo.");
            } else {
                setParseError(null);
            }
            setParsedPreview(parsed);
        } catch (err: any) {
            setParseError("Erro ao processar o formato do texto. Verifique se ele segue o padrão sugerido.");
            setParsedPreview(null);
        }
    };

    // Submits the wizard import to State
    const handleSaveImportedWiki = () => {
        if (!parsedPreview) return;

        const newSourceId = `source_${Date.now()}`;
        const newSource: WikiSource = {
            id: newSourceId,
            title: parsedPreview.source.title.trim() || 'Untitled Reading',
            author: parsedPreview.source.author.trim() || 'Unknown Author',
            type: parsedPreview.source.type,
            generalSummary: parsedPreview.source.generalSummary.trim() || '',
            rawParsedText: rawPastedText,
            createdAt: Date.now()
        };

        const newEntries: WikiCategoryEntry[] = parsedPreview.entries
            .map((entry, idx) => {
                const resolvedCategory = resolveToTaxonomyCategory(entry.categoryName, taxonomyCategories);
                if (!resolvedCategory) return null; // Discard elements that aren't valid taxonomy categories

                return {
                    id: `entry_${Date.now()}_${idx}_${Math.random().toString(36).substring(2,5)}`,
                    sourceId: newSourceId,
                    sourceTitle: newSource.title,
                    sourceAuthor: newSource.author,
                    categoryName: resolvedCategory,
                    notes: entry.notes,
                    subcategoryName: entry.subcategoryName ? resolveToTaxonomyCategory(entry.subcategoryName, taxonomyCategories) : undefined
                };
            })
            .filter((entry): entry is WikiCategoryEntry => entry !== null);

        // Persist to session
        updateActiveProjectData(current => ({
            ...current,
            wikiSources: [...(current.wikiSources || []), newSource],
            wikiCategoryEntries: [...(current.wikiCategoryEntries || []), ...newEntries]
        }));

        logActivity('wiki_import_source', { title: newSource.title, author: newSource.author, entriesCount: newEntries.length });

        // Reset wizard
        setRawPastedText('');
        setParsedPreview(null);
        setIsImportModalOpen(false);

        // Pre-select the newly added reading
        setSelectedTab('readings');
        setSelectedSourceId(newSourceId);
        setSelectedCategoryName(null);
    };

    // Delete entire source reading
    const handleDeleteSource = (sourceId: string) => {
        const source = wikiSources.find(s => s.id === sourceId);
        if (!source) return;

        const performDeletion = () => {
            updateActiveProjectData(current => ({
                ...current,
                wikiSources: (current.wikiSources || []).filter(s => s.id !== sourceId),
                wikiCategoryEntries: (current.wikiCategoryEntries || []).filter(e => e.sourceId !== sourceId)
            }));
            logActivity('wiki_delete_source', { title: source.title });
            if (selectedSourceId === sourceId) {
                setSelectedSourceId(null);
            }
        };

        if (onRequestConfirmation) {
            onRequestConfirmation({
                title: 'Excluir Fonte da Ágora',
                message: `Tem certeza de que deseja remover a fonte "${source.title}"? Isso excluirá todas as vozes e debates associados a essa fonte na Ágora.`,
                confirmText: 'Excluir',
                onConfirm: performDeletion
            });
        } else if (confirm(`Tem certeza de que deseja remover a fonte "${source.title}"? Isso excluirá todas as vozes e debates associados a essa fonte na Ágora.`)) {
            performDeletion();
        }
    };

    // Adds a direct perspective entry to a category
    const handleQuickAddEntry = (categoryName: string) => {
        if (!quickAddSourceId || !quickAddNotes.trim()) return;

        const source = wikiSources.find(s => s.id === quickAddSourceId);
        if (!source) return;

        const newEntry: WikiCategoryEntry = {
            id: `entry_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
            sourceId: source.id,
            sourceTitle: source.title,
            sourceAuthor: source.author,
            categoryName: categoryName,
            notes: quickAddNotes.trim()
        };

        updateActiveProjectData(current => ({
            ...current,
            wikiCategoryEntries: [...(current.wikiCategoryEntries || []), newEntry]
        }));

        logActivity('wiki_add_voice', { category: categoryName, source: source.title });

        setQuickAddNotes('');
        setQuickAddSourceId('');
    };

    // Starts editing a voice entry
    const handleStartEditingEntry = (entry: WikiCategoryEntry) => {
        setEditingEntryId(entry.id);
        setEditingEntryNotes(entry.notes);
    };

    // Saves edited voice entry notes
    const handleSaveEditingEntry = () => {
        if (!editingEntryId) return;

        updateActiveProjectData(current => ({
            ...current,
            wikiCategoryEntries: (current.wikiCategoryEntries || []).map(entry => 
                entry.id === editingEntryId ? { ...entry, notes: editingEntryNotes } : entry
            )
        }));

        setEditingEntryId(null);
        setEditingEntryNotes('');
    };

    // Delete single entry voice
    const handleDeleteEntry = (entryId: string) => {
        const performDeletion = () => {
            updateActiveProjectData(current => ({
                ...current,
                wikiCategoryEntries: (current.wikiCategoryEntries || []).filter(e => e.id !== entryId)
            }));
        };

        if (onRequestConfirmation) {
            onRequestConfirmation({
                title: 'Excluir Voz',
                message: 'Tem certeza de que deseja excluir esta voz argumentativa da Ágora?',
                confirmText: 'Excluir',
                onConfirm: performDeletion
            });
        } else if (confirm("Tem certeza de que deseja excluir esta voz argumentativa da Ágora?")) {
            performDeletion();
        }
    };

    // Filters categories directory on sidebar
    const filteredCategories = useMemo(() => {
        let list = taxonomyCategories.filter(cat => (categoryEntriesCountMap[cat] || 0) > 0);

        if (searchQuery.trim()) {
            const normalizedQuery = searchQuery.toLowerCase();
            list = list.filter(cat => cat.toLowerCase().includes(normalizedQuery));
        }

        return list;
    }, [taxonomyCategories, searchQuery, categoryEntriesCountMap]);

    // Filters sources list on sidebar
    const filteredSources = useMemo(() => {
        let list = wikiSources;
        if (searchQuery.trim()) {
            const normalizedQuery = searchQuery.toLowerCase();
            list = list.filter(src => 
                src.title.toLowerCase().includes(normalizedQuery) || 
                src.author.toLowerCase().includes(normalizedQuery)
            );
        }
        return list;
    }, [wikiSources, searchQuery]);

    // Active Category's Voices inside Agora
    const activeCategoryEntries = useMemo(() => {
        if (!selectedCategoryName) return [];
        return wikiCategoryEntries.filter(entry => entry.categoryName === selectedCategoryName);
    }, [wikiCategoryEntries, selectedCategoryName]);

    // Dynamic fingerprint for active category's entries to track additions, deletions or modifications
    const currentFingerprint = useMemo(() => {
        if (!selectedCategoryName) return '';
        return activeCategoryEntries
            .map(e => `${e.id}-${e.notes.slice(0, 50)}`)
            .sort()
            .join('|');
    }, [activeCategoryEntries, selectedCategoryName]);

    // Stored summary from state
    const categorySummaryData = useMemo(() => {
        if (!selectedCategoryName) return null;
        return activeProjectData?.wikiCategorySummaries?.[selectedCategoryName] || null;
    }, [activeProjectData?.wikiCategorySummaries, selectedCategoryName]);

    // Handle fetching summary from server
    const fetchCategorySummary = async (categoryName: string, entriesToSynthesize: typeof activeCategoryEntries, fingerprint: string) => {
        if (loadingSummaries[categoryName]) return;
        
        setLoadingSummaries(prev => ({ ...prev, [categoryName]: true }));
        setSummaryError(null);

        try {
            const response = await fetch('/api/category-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryName,
                    entries: entriesToSynthesize.map(e => ({
                        sourceTitle: e.sourceTitle,
                        sourceAuthor: e.sourceAuthor,
                        notes: e.notes
                    }))
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Falha ao conectar com o serviço do Gemini');
            }

            const data = await response.json();
            const summaryText = data.summary;

            // Save to project state
            updateActiveProjectData(current => {
                const prevSummaries = current.wikiCategorySummaries || {};
                return {
                    ...current,
                    wikiCategorySummaries: {
                        ...prevSummaries,
                        [categoryName]: {
                            summary: summaryText,
                            fingerprint: fingerprint
                        }
                    }
                };
            });
        } catch (err: any) {
            console.error('Error generating summary:', err);
            setSummaryError(`Não foi possível auto-sumarizar: ${err.message || err}`);
        } finally {
            setLoadingSummaries(prev => ({ ...prev, [categoryName]: false }));
        }
    };

    const loadedSummaryFingerprint = categorySummaryData?.fingerprint || '';
    const hasLoadedSummary = !!categorySummaryData;

    // Auto trigger generation if missing or outdated and entries are available
    React.useEffect(() => {
        if (!selectedCategoryName || activeCategoryEntries.length === 0) return;

        const isMissing = !hasLoadedSummary;
        const isOutdated = hasLoadedSummary && loadedSummaryFingerprint !== currentFingerprint;

        // Only trigger auto generation if the summary is completely missing.
        // If it is simply outdated, we let the user update it values when they finish editing
        // to prevent lag, rate-limiting, and error loops while typing notes.
        if (isMissing && !loadingSummaries[selectedCategoryName]) {
            fetchCategorySummary(selectedCategoryName, activeCategoryEntries, currentFingerprint);
        }
    }, [selectedCategoryName, currentFingerprint, hasLoadedSummary, loadedSummaryFingerprint]);

    // Active Reading details
    const activeSource = useMemo(() => {
        if (!selectedSourceId) return null;
        return wikiSources.find(src => src.id === selectedSourceId) || null;
    }, [wikiSources, selectedSourceId]);

    const activeSourceEntries = useMemo(() => {
        if (!selectedSourceId) return [];
        return wikiCategoryEntries.filter(entry => entry.sourceId === selectedSourceId);
    }, [wikiCategoryEntries, selectedSourceId]);

    // Helper to render book icons
    const renderSourceIcon = (type: 'article' | 'book' | 'chapter', className = "w-4 h-4") => {
        switch (type) {
            case 'book': return <Book className={className} />;
            case 'chapter': return <FileText className={className} />;
            default: return <BookOpen className={className} />;
        }
    };

    const renderSourceLabel = (type: 'article' | 'book' | 'chapter') => {
        switch (type) {
            case 'book': return 'Livro';
            case 'chapter': return 'Capítulo de livro';
            default: return 'Artigo';
        }
    };

    return (
        <div className="flex h-full flex-col bg-[#0b0f19] text-gray-100 font-sans pt-24" id="wiki_view_container">
            {/* Top Area Header */}
            <header className="flex items-center justify-between border-b border-gray-800 bg-[#0f1423] px-6 py-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <MessageSquare className="h-5 h-5 text-indigo-400" />
                            Ágora do Debate <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">Dissonance engine</span>
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">
                            Preserve pensamentos divergentes e mapeie múltiplos pontos de vista filosóficos sobre a taxonomia.
                        </p>
                    </div>
                </div>
                <div>
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors focus:ring-2 focus:ring-indigo-500"
                        id="btn_open_import_wiki"
                    >
                        <Plus className="h-4 w-4" /> Importar de IA / Leitura
                    </button>
                </div>
            </header>

            {/* Split Page Contents */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* 1. Left Sidebar Navigator */}
                <aside className="w-1/3 min-w-[320px] max-w-[420px] border-r border-gray-800 bg-[#0c101d] flex flex-col h-full">
                    {/* View Switch / Tabs toggle */}
                    <div className="grid grid-cols-2 border-b border-gray-800 p-2 gap-2 bg-[#0d1222]">
                        <button
                            onClick={() => { setSelectedTab('categories'); setSearchQuery(''); }}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                                selectedTab === 'categories'
                                    ? 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/50'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                            }`}
                        >
                            <MessageSquare className="w-4 h-4" /> Categorias
                        </button>
                        <button
                            onClick={() => { setSelectedTab('readings'); setSearchQuery(''); }}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                                selectedTab === 'readings'
                                    ? 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/50'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                            }`}
                        >
                            <BookOpen className="w-4 h-4" /> Leituras ({wikiSources.length})
                        </button>
                    </div>

                    {/* Search & Filter tools */}
                    <div className="p-3 border-b border-gray-800/50 flex flex-col gap-2">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={selectedTab === 'categories' ? "Buscar categorias da taxonomia..." : "Buscar por título ou autor..."}
                                className="w-full bg-[#12182c] border border-gray-800 rounded-md pl-9 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {selectedTab === 'categories' ? (
                            <div className="text-3xs text-gray-500 uppercase tracking-wider font-mono select-none px-0.5">
                                Categorias com fontes associadas ({filteredCategories.length})
                            </div>
                        ) : (
                            <div className="flex items-center justify-between px-0.5">
                                <div className="text-3xs text-gray-500 uppercase tracking-wider font-mono select-none">
                                    Obras indexadas ({filteredSources.length})
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Left Scroll List contents */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40 divide-dashed">
                        {selectedTab === 'categories' ? (
                            filteredCategories.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    Nenhuma categoria encontrada.
                                </div>
                            ) : (
                                filteredCategories.map(cat => {
                                    const entryCount = categoryEntriesCountMap[cat] || 0;
                                    const isSelected = selectedCategoryName === cat;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setSelectedCategoryName(cat);
                                                setSelectedSourceId(null);
                                            }}
                                            className={`w-full text-left p-3.5 flex items-start justify-between gap-3 transition-colors ${
                                                isSelected 
                                                    ? 'bg-[#18203d] text-white border-l-2 border-indigo-500' 
                                                    : 'hover:bg-[#0f1426] text-gray-300'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm text-gray-100 group-hover:text-indigo-400">{cat}</span>

                                            </div>
                                            {entryCount > 0 ? (
                                                <span className="px-2 py-0.5 rounded-md text-3xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                                                    ● {entryCount}
                                                </span>
                                            ) : (
                                                <span className="text-3xs text-gray-600">vazio</span>
                                            )}
                                        </button>
                                    );
                                })
                            )
                        ) : (
                            filteredSources.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    <BookOpen className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                    <p>Nenhuma leitura cadastrada ainda.</p>
                                    <button 
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="text-xs text-indigo-400 font-medium underline mt-1.5 hover:text-indigo-300"
                                    >
                                        Importar primeira leitura 
                                    </button>
                                </div>
                            ) : (
                                filteredSources.map(src => {
                                    const isSelected = selectedSourceId === src.id;
                                    const entryCount = wikiCategoryEntries.filter(e => e.sourceId === src.id).length;
                                    return (
                                        <div
                                            key={src.id}
                                            onClick={() => {
                                                setSelectedSourceId(src.id);
                                                setSelectedCategoryName(null);
                                            }}
                                            className={`group w-full text-left p-3.5 flex flex-col gap-1 transition-colors cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-[#18203d] text-white border-l-2 border-indigo-500' 
                                                    : 'hover:bg-[#0f1426] text-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-3xs uppercase px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded flex items-center gap-1 font-mono">
                                                    {renderSourceIcon(src.type, "w-2.5 h-2.5")}
                                                    {renderSourceLabel(src.type)}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleDeleteSource(src.id);
                                                    }}
                                                    className="relative z-10 opacity-70 group-hover:opacity-100 text-gray-400 hover:text-rose-450 p-1.5 rounded transition-all hover:bg-rose-950/40 cursor-pointer pointer-events-auto"
                                                    title="Remover fonte"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <p className="font-semibold text-sm leading-snug line-clamp-2 text-white">
                                                {src.title}
                                            </p>
                                            <div className="flex items-center justify-between text-2xs mt-1 text-gray-400">
                                                <span>por {src.author}</span>
                                                <span className="text-gray-500">{entryCount} conexões</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </aside>

                {/* 2. Main Arena Content Panel */}
                <main className="flex-1 bg-[#080b13] flex flex-col h-full overflow-y-auto p-6 md:p-8">
                    
                    {/* CASE A: No active selection */}
                    {!selectedCategoryName && !selectedSourceId && (
                        <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto py-12">
                            <div className="p-4 bg-[#0f1423] rounded-full border border-gray-800 shadow-xl mb-6">
                                <MessageSquare className="w-12 h-12 text-indigo-400 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo à Ágora do Debate</h2>
                            <p className="text-sm text-gray-400 leading-relaxed max-w-md">
                                Esta seção permite que você construa uma Wiki dialética e dissonante a partir de fontes e leituras indexadas com base na taxonomia do PhilPapers.
                            </p>
                            
                            {/* Fast instructions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-10 text-left">
                                <div className="p-4 rounded-lg bg-[#0e1324] border border-gray-800/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        <h3 className="font-semibold text-xs text-indigo-200 uppercase tracking-wider">Passo 1: Alimentar</h3>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Faça a leitura crítica em outras ferramentas e use o modelo de linguagem para mapear os temas centrais do seu texto na taxonomia do PhilPapers.
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-[#0e1324] border border-gray-800/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowRight className="w-4 h-4 text-indigo-400" />
                                        <h3 className="font-semibold text-xs text-indigo-200 uppercase tracking-wider">Passo 2: Importar</h3>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Cole o texto estruturado no botão superior. Nosso parser identificará a obra, os conceitos abordados e as notas associadas de forma instantânea.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CASE B: A specific taxonomy category was clicked */}
                    {selectedCategoryName && (
                        <div className="flex flex-col gap-6">
                            {/* Header Category details */}
                            <div className="border-b border-gray-800 pb-5">
                                <div className="flex items-center gap-2 text-3xs text-gray-400 uppercase tracking-wider mb-1">
                                    <span>Taxonomia Principal</span> 
                                    <ChevronRight className="w-2.5 h-2.5" />
                                    <span className="text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded font-mono">Espaço Ágora</span>
                                </div>
                                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                                    {selectedCategoryName}
                                </h2>
                                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                                    Arena de debate dialético sobre a categoria de <strong className="text-white font-medium">{selectedCategoryName}</strong>. 
                                    Aqui estão consolidadas as diferentes interpretações e dissonâncias mapeadas das suas leituras.
                                </p>
                            </div>

                            {/* AI Synthesis Section */}
                            {activeCategoryEntries.length > 0 && (
                                <div className="p-6 rounded-lg border border-indigo-950 bg-[#0d1222] shadow-sm relative overflow-hidden backdrop-blur-3xl flex-shrink-0">
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button 
                                            onClick={() => fetchCategorySummary(selectedCategoryName, activeCategoryEntries, currentFingerprint)}
                                            disabled={loadingSummaries[selectedCategoryName]}
                                            className="text-gray-400 hover:text-indigo-300 disabled:opacity-40 transition-colors cursor-pointer p-1.5 rounded hover:bg-indigo-950/40"
                                            title="Atualizar Sumário Manualmente"
                                        >
                                            <svg className={`w-4 h-4 ${loadingSummaries[selectedCategoryName] ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 10H18.228m-.228-6l2.25 2.25m-2.25-2.25L16 6" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <div className="p-1 px-2 rounded bg-indigo-950/60 border border-indigo-850 text-indigo-400 text-3xs font-mono font-bold tracking-widest flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-indigo-400" /> SUMÁRIO DA CATEGORIA (IA)
                                        </div>
                                        {loadingSummaries[selectedCategoryName] && (
                                            <span className="text-2xs text-indigo-400 font-mono animate-pulse">Sumarizando fontes...</span>
                                        )}
                                        {categorySummaryData && !loadingSummaries[selectedCategoryName] && (
                                            <span className="text-3xs text-gray-400 font-mono">Consolidado em tempo real</span>
                                        )}
                                        {hasLoadedSummary && loadedSummaryFingerprint !== currentFingerprint && !loadingSummaries[selectedCategoryName] && (
                                            <button 
                                                onClick={() => fetchCategorySummary(selectedCategoryName, activeCategoryEntries, currentFingerprint)}
                                                className="px-2 py-0.5 rounded bg-yellow-950/40 border border-yellow-800 text-yellow-300 text-3xs font-mono font-bold hover:bg-yellow-900/40 transition-all animate-pulse duration-1000 cursor-pointer flex items-center gap-1"
                                                title="Sincronizar novos argumentos ao sumário"
                                            >
                                                <span>⚠️ NOVAS FONTES (CLIQUE PARA ATUALIZAR O SUMÁRIO)</span>
                                            </button>
                                        )}
                                    </div>

                                    {loadingSummaries[selectedCategoryName] ? (
                                        <div className="space-y-3 py-2">
                                            <div className="h-4 bg-indigo-950/60 rounded w-1/4 animate-pulse"></div>
                                            <div className="h-3.5 bg-indigo-950/60 rounded w-full animate-pulse"></div>
                                            <div className="h-3.5 bg-indigo-950/60 rounded w-11/12 animate-pulse"></div>
                                            <div className="h-3.5 bg-indigo-950/60 rounded w-4/5 animate-pulse"></div>
                                        </div>
                                    ) : (
                                        <>
                                            {categorySummaryData && categorySummaryData.summary && categorySummaryData.summary.trim() ? (
                                                <div className="mt-1">
                                                    {renderMarkdownSummary(categorySummaryData.summary) || (
                                                        <p className="text-sm text-slate-100 whitespace-pre-line font-sans leading-relaxed">
                                                            {categorySummaryData.summary}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400">
                                                    Nenhum sumário disponível. Clique no botão de atualizar ao lado para gerar um sumário desta categoria taxonômica baseado nas fontes.
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {summaryError && (
                                        <div className="mt-3 p-2 bg-red-950/40 border border-red-950 rounded text-3xs text-red-400 flex items-center gap-1.5 font-mono">
                                            <AlertCircle className="w-3 h-3 text-red-450 flex-shrink-0" />
                                            <span>{summaryError}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* List of Voices (The Arena) */}
                            <div className="flex-1 space-y-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5" /> Argumentos e Leituras ({activeCategoryEntries.length})
                                </h3>

                                {activeCategoryEntries.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-gray-800/80 p-8 text-center text-gray-500">
                                        <p className="text-sm">Nenhum ponto de debate associado a esta categoria ainda.</p>
                                        <p className="text-xs text-gray-600 mt-1">Você pode adicionar uma voz usando o formulário abaixo, ou importando um novo texto.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {activeCategoryEntries.map(entry => {
                                            const isEditing = editingEntryId === entry.id;
                                            return (
                                                <div 
                                                    key={entry.id} 
                                                    className="p-5 rounded-lg border border-gray-800/80 bg-[#0c1120] relative group hover:border-gray-700 transition-colors"
                                                >
                                                    {/* Voice Metadata header */}
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 px-2 rounded bg-indigo-950/40 border border-indigo-950 text-indigo-400 text-3xs font-mono">
                                                                VOZ ATIVA
                                                            </div>
                                                            <span className="text-2xs text-gray-400">
                                                                via <strong className="text-white hover:underline cursor-pointer" onClick={() => { setSelectedSourceId(entry.sourceId); setSelectedCategoryName(null); }}>
                                                                    "{entry.sourceTitle}"
                                                                </strong> (pág. {entry.sourceAuthor})
                                                            </span>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                            {!isEditing && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleStartEditingEntry(entry)}
                                                                        className="p-1 text-gray-500 hover:text-indigo-400 rounded hover:bg-gray-800"
                                                                        title="Editar voz"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                                        className="p-1 text-gray-500 hover:text-rose-400 rounded hover:bg-gray-800"
                                                                        title="Excluir voz"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Voice Core Text */}
                                                    {isEditing ? (
                                                        <div className="mt-2 flex flex-col gap-2">
                                                            <textarea
                                                                value={editingEntryNotes}
                                                                onChange={(e) => setEditingEntryNotes(e.target.value)}
                                                                rows={4}
                                                                className="w-full bg-[#12182c] border border-gray-800 rounded-md p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => setEditingEntryId(null)}
                                                                    className="px-2.5 py-1 text-xs text-gray-400 hover:text-white"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button 
                                                                    onClick={handleSaveEditingEntry}
                                                                    className="px-3 py-1 text-xs bg-indigo-600 rounded text-white font-medium hover:bg-indigo-500"
                                                                >
                                                                    Salvar Alterações
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-indigo-900/60 font-serif italic text-[#cbd5e1]">
                                                            "{entry.notes}"
                                                        </p>
                                                    )}

                                                    {/* Tags metadata if any */}
                                                    {entry.subcategoryName && (
                                                        <div className="mt-3 flex gap-2">
                                                            <span className="text-3xs uppercase tracking-wide bg-indigo-950/80 text-indigo-300 border border-indigo-900/60 px-1.5 py-0.5 rounded font-mono">
                                                                Subcategoria: {entry.subcategoryName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Quick Add Perspective Form explicitly linked on selected category */}
                            <div className="mt-auto border-t border-gray-800/70 pt-6">
                                <div className="p-4 rounded-lg bg-[#0a0e19] border border-gray-800/80">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" /> Adicionar voz a este debate
                                    </h4>
                                    
                                    {wikiSources.length === 0 ? (
                                        <div className="text-xs text-gray-500 leading-relaxed">
                                            Nenhum texto/fonte catalogado no projeto ainda. Por favor, <button className="text-indigo-400 underline font-semibold hover:text-indigo-300" onClick={() => setIsImportModalOpen(true)}>Importe um texto estruturado da leitura</button> para poder vincular novas perspectivas na Ágora.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-1 gap-2">
                                                <label className="text-2xs text-gray-400">Selecione uma Fonte de Leitura:</label>
                                                <select
                                                    value={quickAddSourceId}
                                                    onChange={(e) => setQuickAddSourceId(e.target.value)}
                                                    className="w-full bg-[#12182c] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none"
                                                >
                                                    <option value="">-- Selecione a obra/artigo referenciado --</option>
                                                    {wikiSources.map(src => (
                                                        <option key={src.id} value={src.id}>
                                                            {src.title} ({src.author})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-2xs text-gray-400">Ideia central / Dissonância argumentativa:</label>
                                                <textarea
                                                    value={quickAddNotes}
                                                    onChange={(e) => setQuickAddNotes(e.target.value)}
                                                    rows={3}
                                                    placeholder="Descreva o ponto de vista contido nessa fonte referente a este tópico..."
                                                    className="w-full bg-[#12182c] border border-gray-800 rounded p-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                                                />
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleQuickAddEntry(selectedCategoryName)}
                                                    disabled={!quickAddSourceId || !quickAddNotes.trim()}
                                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Acoplar Voz dialética
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CASE C: A specific source reading card was clicked */}
                    {activeSource && (
                        <div className="flex flex-col gap-6">
                            {/* Header details */}
                            <div className="border-b border-gray-800 pb-5">
                                <div className="flex items-center gap-2 text-3xs text-gray-400 uppercase tracking-newer mb-1 font-mono">
                                    <span>Arquivo de Leituras</span> 
                                    <ChevronRight className="w-2.5 h-2.5" />
                                    <span>{renderSourceLabel(activeSource.type)}</span>
                                </div>
                                <h2 className="text-2xl font-extrabold text-white leading-tight">
                                    {activeSource.title}
                                </h2>
                                <p className="text-sm font-medium text-indigo-400 mt-1">
                                    pelo autor {activeSource.author}
                                </p>
                            </div>

                            {/* Abstract */}
                            {activeSource.generalSummary && (
                                <div className="p-4 rounded-md bg-[#0a0e19] border border-gray-800/55">
                                    <h4 className="text-2xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                                        <Info className="w-3 h-3 text-indigo-400" /> Resumo do Documento e Escopo
                                    </h4>
                                    <p className="text-xs text-gray-300 leading-relaxed italic">
                                        {activeSource.generalSummary}
                                    </p>
                                </div>
                            )}

                            {/* List of Concepts maps embedded in this source */}
                            <div className="flex-1 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5" /> Tópicos mapeados nesta obra ({activeSourceEntries.length})
                                </h3>

                                {activeSourceEntries.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-gray-800/80 p-6 text-center text-gray-500 text-xs">
                                        Esta leitura ainda não está conectada a nenhum tópico na Ágora. Utilize a aba "Categorias" para vinculá-la.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeSourceEntries.map(entry => (
                                            <div 
                                                key={entry.id}
                                                className="p-4 rounded bg-[#0d1222]/80 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer group"
                                                onClick={() => {
                                                    setSelectedCategoryName(entry.categoryName);
                                                    setSelectedSourceId(null);
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5 text-xs text-white font-bold group-hover:text-indigo-400 cursor-pointer">
                                                        <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {entry.categoryName}
                                                        <ChevronRight className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-3xs uppercase bg-gray-800 text-gray-500 font-mono px-1 rounded">IR PARA ÁGORA</span>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed pl-5 whitespace-pre-wrap-custom line-clamp-3">
                                                    {entry.notes}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Nova Leitura / Paste Wizard Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="wiki_import_wizard_overlay">
                    <div className="bg-[#0b0f1b] border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <header className="px-6 py-4.5 border-b border-gray-800 bg-[#0f1424] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-base font-bold text-white">Importar Mapeamento Inteligente para a Ágora</h3>
                            </div>
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* Contents Flow */}
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Left Form: Paste Block */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Cole a resposta estruturada:</label>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
                                            setCopiedPrompt(true);
                                            setTimeout(() => setCopiedPrompt(false), 2000);
                                        }}
                                        className={`text-2xs font-bold px-2 py-0.5 rounded transition-all duration-200 border flex items-center gap-1.5 ${
                                            copiedPrompt 
                                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40 animate-pulse' 
                                                : 'bg-indigo-950/40 text-indigo-400 border-indigo-800/45 hover:bg-indigo-900/40'
                                         }`}
                                        title="Copie o prompt estruturado estrito de diretrizes para usar no Gemini ou outro LLM"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> 
                                        {copiedPrompt ? '✓ Copiado!' : 'Copiar Prompt para IA'}
                                    </button>
                                </div>
                                <textarea
                                    value={rawPastedText}
                                    onChange={handlePasteTextChange}
                                    placeholder={`O artigo "Minha Obra", escrito por Prof. Amplo, investiga...

Com base na taxonomia do PhilPapers fornecida, os temas centrais do artigo se relacionam de forma direta com as seguintes categorias principais e subcategorias:

**1. Epistemic Normativity (Normatividade Epistêmica)**
Esta é a categoria com a maior correspondência...
* **Ethics of Belief:** O autor explora...`}
                                    className="w-full flex-1 min-h-[320px] bg-[#070b13] border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                                />
                                {parseError && (
                                    <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900/60 flex items-start gap-2 text-2xs text-amber-200">
                                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                        <span>{parseError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Right Form: Interactive Review of Parse */}
                            <div className="flex flex-col gap-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 h-5">Review e Ajustes do Mapeamento</h4>
                                
                                {!parsedPreview ? (
                                    <div className="flex-1 border border-dashed border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center text-center text-gray-600">
                                        <BookOpen className="w-10 h-10 mb-2 text-gray-700" />
                                        <p className="text-xs">Aguardando colagem no campo esquerdo...</p>
                                        <p className="text-3xs mt-1 text-gray-700 max-w-xs">
                                            Os dados de Título, Autor, Resumo e os pontos de debate específicos serão extraídos dinamicamente.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col gap-3">
                                        
                                        {/* Metadata inputs */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-3xs uppercase text-gray-500">Título Mapeado:</label>
                                                <input
                                                    type="text"
                                                    value={parsedPreview.source.title}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setParsedPreview(prev => prev ? {
                                                            ...prev,
                                                            source: { ...prev.source, title: newVal }
                                                        } : null);
                                                    }}
                                                    className="bg-[#12182c] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-3xs uppercase text-gray-500">Autor Mapeado:</label>
                                                <input
                                                    type="text"
                                                    value={parsedPreview.source.author}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setParsedPreview(prev => prev ? {
                                                            ...prev,
                                                            source: { ...prev.source, author: newVal }
                                                        } : null);
                                                    }}
                                                    className="bg-[#12182c] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1">
                                            <label className="text-3xs uppercase text-gray-500">Formatado como:</label>
                                            <div className="flex gap-2">
                                                {(['article', 'book', 'chapter'] as const).map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setParsedPreview(prev => prev ? {
                                                            ...prev,
                                                            source: { ...prev.source, type: t }
                                                        } : null)}
                                                        className={`flex-1 text-center py-1 text-3xs font-semibold rounded uppercase border ${
                                                            parsedPreview.source.type === t
                                                                ? 'bg-indigo-950/60 text-indigo-400 border-indigo-800/80'
                                                                : 'bg-[#12182c] text-gray-400 border-gray-800/60 hover:text-white'
                                                        }`}
                                                    >
                                                        {renderSourceLabel(t)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Abstract display */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-2xs uppercase text-gray-500">Introdução / Resumo:</label>
                                            <textarea
                                                value={parsedPreview.source.generalSummary}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setParsedPreview(prev => prev ? {
                                                        ...prev,
                                                        source: { ...prev.source, generalSummary: newVal }
                                                    } : null);
                                                }}
                                                rows={2}
                                                className="bg-[#12182c] border border-gray-800 rounded p-2 text-3xs text-gray-300 focus:outline-none"
                                            />
                                        </div>

                                        {/* Categories extracted */}
                                        <div className="flex flex-col gap-1.5 flex-1 max-h-[160px] overflow-y-auto">
                                            <label className="text-2xs uppercase text-gray-500 font-bold">Ideias Mapeadas da Ágora ({parsedPreview.entries.length}):</label>
                                            <div className="space-y-1.5">
                                                {parsedPreview.entries.map((ent, i) => {
                                                    const resolvedCat = resolveToTaxonomyCategory(ent.categoryName, taxonomyCategories);
                                                    const isResolved = resolvedCat !== ent.categoryName;
                                                    return (
                                                        <div key={i} className="p-2.5 rounded bg-[#0b0e1a] border border-gray-800 flex flex-col gap-1">
                                                            <div className="flex items-center justify-between text-3xs">
                                                                <div className="flex items-center gap-1 text-emerald-400 font-bold flex-wrap">
                                                                    <Check className="w-3" />
                                                                    <span>{resolvedCat}</span>
                                                                    {isResolved && (
                                                                        <span className="text-indigo-400 font-normal px-1 py-0.2 bg-indigo-950/40 rounded ml-1 text-3xs">
                                                                            ajustado de "{ent.categoryName}"
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {ent.subcategoryName && (
                                                                    <span className="text-gray-500 font-mono lowercase">subcategory</span>
                                                                )}
                                                            </div>
                                                            <p className="text-3xs text-gray-400 leading-snug truncate">
                                                                {ent.notes}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer controls */}
                        <footer className="px-6 py-4.5 border-t border-gray-800 bg-[#0f1424] flex justify-end gap-3.5">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveImportedWiki}
                                disabled={!parsedPreview}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                                id="btn_confirm_import_wiki"
                            >
                                Acoplar à Ágora
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};
