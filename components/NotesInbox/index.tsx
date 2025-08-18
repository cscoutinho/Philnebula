
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { KindleNote, ImportedNoteSource, PublicationType, ConfirmationRequestHandler } from '../../types';
import * as notesParser from '../../services/notesParser';
import { ChevronLeft, BookOpenIcon, UploadCloudIcon, Trash2, Edit, Check, X, Square, CheckSquare, RefreshCw, BookTextIcon, FileTextIcon, GraduationCapIcon } from '../icons';

type PendingSource = Omit<ImportedNoteSource, 'id' | 'notes'> & { notes: Omit<KindleNote, 'sourceId'>[] };

interface NotesInboxProps {
    isOpen: boolean;
    onClose: () => void;
    importedNoteSources: ImportedNoteSource[];
    processedNoteIds: Set<string>;
    onImportNotes: (data: PendingSource) => void;
    onDeleteSource: (sourceId: string) => void;
    onUpdateSourceMetadata: (sourceId: string, metadata: Partial<Omit<ImportedNoteSource, 'id' | 'notes'>>) => void;
    onMarkNotesAsProcessed: (noteIds: string[]) => void;
    onRequestConfirmation: ConfirmationRequestHandler;
}


const NoteCard: React.FC<{ 
    note: KindleNote; 
    isProcessed: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
}> = ({ note, isProcessed, isSelected, onToggleSelect }) => {

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, note: KindleNote) => {
        e.dataTransfer.setData('application/x-kindle-note', JSON.stringify(note));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <li
            draggable
            onDragStart={(e) => handleDragStart(e, note)}
            title="Drag to add to map"
            className={`group relative p-3 rounded-md transition-all duration-200 ${isProcessed ? 'opacity-40' : ''} ${isSelected ? 'bg-cyan-900/50 ring-2 ring-cyan-500' : 'bg-gray-800 hover:bg-gray-700'}`}
        >
             <div className="absolute top-2 left-2 z-10">
                <button onClick={onToggleSelect} className="p-1" aria-label={isSelected ? `Deselect note` : `Select note`}>
                    {isSelected 
                        ? <CheckSquare className="w-5 h-5 text-cyan-400" /> 
                        : <Square className="w-5 h-5 text-gray-500 group-hover:text-gray-300" />
                    }
                </button>
            </div>
            <div className="pl-8 cursor-grab">
                <p className="text-sm text-gray-200">{note.text}</p>
                <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
                    <span className="truncate pr-2">{note.heading}</span>
                    {note.type === 'note' && (
                        <div className="px-1.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-gray-600 text-gray-200 ring-gray-500">Note</div>
                    )}
                </div>
            </div>
        </li>
    );
};

const NotesInbox: React.FC<NotesInboxProps> = ({ isOpen, onClose, importedNoteSources, processedNoteIds, onImportNotes, onDeleteSource, onUpdateSourceMetadata, onMarkNotesAsProcessed, onRequestConfirmation }) => {
    const [view, setView] = useState<'list' | 'selectType' | 'uploadWithDoi' | 'confirm'>('list');
    const [importType, setImportType] = useState<PublicationType | null>(null);
    const [pendingImport, setPendingImport] = useState<PendingSource | null>(null);
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
    const [doi, setDoi] = useState('');
    
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [editingSource, setEditingSource] = useState<ImportedNoteSource | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
    const [showProcessed, setShowProcessed] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetImportState = useCallback(() => {
        setView('list');
        setImportType(null);
        setPendingImport(null);
        setIsFetchingMetadata(false);
        setDoi('');
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetImportState();
            setSelectedSourceId(null);
        } else {
             // Reset to list view when opening, but keep selected source if any
            setView('list');
        }
    }, [isOpen, resetImportState]);
    
    useEffect(() => {
        if(selectedSourceId) {
            setView('list');
        }
        setSelectedNoteIds(new Set());
    }, [selectedSourceId, showProcessed, searchQuery]);
    
    const selectedSource = useMemo(() => {
        return importedNoteSources.find(s => s.id === selectedSourceId);
    }, [selectedSourceId, importedNoteSources]);

    const displayedNotes = useMemo(() => {
        if (!selectedSource) return [];
        let notes = selectedSource.notes;
        if (!showProcessed) {
            notes = notes.filter(note => !processedNoteIds.has(note.id));
        }
        if (searchQuery.trim()) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            notes = notes.filter(note => 
                note.text.toLowerCase().includes(lowerCaseQuery) ||
                note.heading.toLowerCase().includes(lowerCaseQuery)
            );
        }
        return notes;
    }, [selectedSource, showProcessed, processedNoteIds, searchQuery]);
    
    const fetchMetadata = useCallback(async (parsedData: { title: string, author: string, notes: Omit<KindleNote, 'sourceId'>[] }, publicationType: PublicationType, doiValue?: string) => {
        setIsFetchingMetadata(true);
        let metadata: Partial<Omit<ImportedNoteSource, 'id' | 'notes'>> = {};

        try {
            if (publicationType === 'book') {
                const query = `intitle:"${encodeURIComponent(parsedData.title)}" inauthor:"${encodeURIComponent(parsedData.author)}"`;
                const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0) {
                        const book = data.items[0].volumeInfo;
                        metadata.coverImageUrl = book.imageLinks?.thumbnail;
                        metadata.description = book.description;
                        metadata.title = book.title || parsedData.title;
                        metadata.author = book.authors?.join(', ') || parsedData.author;
                        metadata.publicationDate = book.publishedDate;
                        metadata.publisher = book.publisher;
                        metadata.pages = book.pageCount?.toString();
                    }
                }
            } else if ((publicationType === 'article' || publicationType === 'chapter') && doiValue) {
                const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doiValue)}`);
                 if (response.ok) {
                    const data = await response.json();
                    const item = data.message;
                    metadata.title = item.title?.[0] || parsedData.title;
                    metadata.author = item.author?.map((a: any) => `${a.given} ${a.family}`).join(', ') || parsedData.author;
                    if (publicationType === 'article') {
                        metadata.journalTitle = item['container-title']?.[0];
                    } else { // chapter
                        metadata.bookTitle = item['container-title']?.[0];
                        if (item.ISBN && Array.isArray(item.ISBN) && item.ISBN.length > 0) {
                            const isbn = item.ISBN[0];
                            try {
                                const bookResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
                                if (bookResponse.ok) {
                                    const bookData = await bookResponse.json();
                                    if (bookData.items && bookData.items.length > 0) {
                                        metadata.coverImageUrl = bookData.items[0].volumeInfo.imageLinks?.thumbnail;
                                    }
                                }
                            } catch (e) {
                                console.warn("Failed to fetch book cover for chapter:", e);
                            }
                        }
                    }
                    if (item.issued && item.issued['date-parts']?.[0]) {
                        metadata.publicationDate = item.issued['date-parts'][0].join('-');
                    }
                    metadata.publisher = item.publisher;
                    metadata.volume = item.volume;
                    metadata.issue = item.issue;
                    metadata.pages = item.page;
                    metadata.description = item.abstract?.replace(/<[^>]+>/g, '');
                    metadata.doi = doiValue;
                    
                    let fetchedKeywords: string[] = [];
                    if (item.subject && Array.isArray(item.subject)) {
                        fetchedKeywords = fetchedKeywords.concat(item.subject.filter((k: any) => typeof k === 'string'));
                    }
                    if (item.keywords && Array.isArray(item.keywords)) { // Some journals use this field
                        fetchedKeywords = fetchedKeywords.concat(item.keywords.filter((k: any) => typeof k === 'string'));
                    }
                    if (fetchedKeywords.length > 0) {
                        metadata.keywords = [...new Set(fetchedKeywords)];
                    }
                }
            }
        } catch (error) {
            console.error("Metadata fetch failed:", error);
        }
        
        setPendingImport({
            publicationType: publicationType,
            title: metadata.title || parsedData.title,
            author: metadata.author || parsedData.author,
            notes: parsedData.notes,
            ...metadata
        });

        setIsFetchingMetadata(false);
        setView('confirm');
    }, []);

    const handleFileSelected = (file: File, publicationType: PublicationType, doiValue?: string) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const htmlString = event.target?.result as string;
            try {
                const parsedData = notesParser.parseKindleHTML(htmlString);
                fetchMetadata(parsedData, publicationType, doiValue);
            } catch (error) {
                alert(`Failed to parse notes file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                resetImportState();
            }
        };
        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && importType) {
            handleFileSelected(file, importType);
        }
        e.target.value = '';
    };

    const handleDoiUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const file = (e.currentTarget.elements.namedItem('file-input') as HTMLInputElement).files?.[0];
        if (file && importType) {
            handleFileSelected(file, importType, doi);
        } else {
            alert("Please select a file.");
        }
    };

    const handleConfirmImport = () => {
        if (pendingImport) {
            onImportNotes(pendingImport);
            resetImportState();
        }
    };

    const handleToggleSelect = (noteId: string) => {
        setSelectedNoteIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(noteId)) newSet.delete(noteId);
            else newSet.add(noteId);
            return newSet;
        });
    };
    
    const handleSelectAll = () => {
        if (selectedNoteIds.size === displayedNotes.length) {
            setSelectedNoteIds(new Set());
        } else {
            setSelectedNoteIds(new Set(displayedNotes.map(n => n.id)));
        }
    };

    const handleBatchDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!selectedSource) return;
        const selectedNotes = selectedSource.notes.filter(n => selectedNoteIds.has(n.id));
        e.dataTransfer.setData('application/x-kindle-notes-multiple', JSON.stringify(selectedNotes));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleMarkSelectedAsProcessed = () => {
        onMarkNotesAsProcessed(Array.from(selectedNoteIds));
        setSelectedNoteIds(new Set());
    };

    const handleSaveMetadata = () => {
        if (editingSource) {
            const { id, notes, ...metadata } = editingSource;
            onUpdateSourceMetadata(id, metadata);
            setEditingSource(null);
        }
    };
    
    const PublicationIcon = ({ type }: { type: PublicationType }) => {
        switch (type) {
            case 'book': return <BookOpenIcon className="w-6 h-6 text-gray-500" />;
            case 'article': return <FileTextIcon className="w-6 h-6 text-gray-500" />;
            case 'chapter': return <BookTextIcon className="w-6 h-6 text-gray-500" />;
            case 'thesis': return <GraduationCapIcon className="w-6 h-6 text-gray-500" />;
            default: return <FileTextIcon className="w-6 h-6 text-gray-500" />;
        }
    };

    const renderSelectType = () => (
        <div className="flex flex-col flex-grow p-4 space-y-4">
            <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-200 self-start">
                <ChevronLeft className="w-4 h-4" /> Back to Sources
            </button>
            <h4 className="font-bold text-white">Select Publication Type</h4>
            <div className="grid grid-cols-2 gap-3">
                {(['book', 'article', 'chapter', 'thesis'] as PublicationType[]).map(type => (
                    <button
                        key={type}
                        onClick={() => {
                            setImportType(type);
                            if (type === 'book' || type === 'thesis') {
                                fileInputRef.current?.click();
                            } else {
                                setView('uploadWithDoi');
                            }
                        }}
                        className="flex flex-col items-center justify-center p-4 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors space-y-2"
                    >
                        <PublicationIcon type={type} />
                        <span className="capitalize text-sm">{type.replace(/_/g, ' ')}</span>
                    </button>
                ))}
            </div>
        </div>
    );
    
    const renderUploadWithDoi = () => (
        <div className="flex flex-col flex-grow p-4 space-y-4">
             <button onClick={() => setView('selectType')} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-200 self-start">
                <ChevronLeft className="w-4 h-4" /> Back to Type Selection
            </button>
            <h4 className="font-bold text-white capitalize">{importType} Import</h4>
            <form onSubmit={handleDoiUploadSubmit} className="space-y-4">
                <div>
                    <label htmlFor="doi-input" className="block text-sm font-medium text-gray-300 mb-1">DOI</label>
                    <input id="doi-input" type="text" value={doi} onChange={e => setDoi(e.target.value)} required placeholder="e.g., 10.1007/s13347-017-0275-z" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" />
                </div>
                 <div>
                    <label htmlFor="file-input" className="block text-sm font-medium text-gray-300 mb-1">Notes File (.html)</label>
                    <input id="file-input" name="file-input" type="file" accept=".html" required className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700" />
                </div>
                 <button type="submit" className="w-full px-4 py-2 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 transition-colors">
                    Upload & Fetch Metadata
                </button>
            </form>
        </div>
    );

    const renderConfirm = () => {
        if (!pendingImport) return null;
        return (
             <div className="flex flex-col flex-grow p-4 space-y-3 overflow-y-auto">
                <button onClick={resetImportState} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-200 self-start">
                    <ChevronLeft className="w-4 h-4" /> Cancel
                </button>
                <h4 className="font-bold text-white text-lg">Confirm Import</h4>
                 {isFetchingMetadata ? (
                    <div className="flex-grow flex items-center justify-center text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mr-2"/> Fetching metadata...</div>
                 ) : (
                    <>
                        <div className="flex gap-4">
                            {(pendingImport.publicationType === 'book' || pendingImport.coverImageUrl) && (
                                <div className="w-1/3 flex-shrink-0">
                                {pendingImport.coverImageUrl ? (
                                    <img src={pendingImport.coverImageUrl} alt="Book cover" className="w-full object-cover rounded shadow-lg" />
                                ) : (
                                    <div className="w-full aspect-[2/3] bg-gray-700 rounded flex items-center justify-center">
                                        <BookOpenIcon className="w-10 h-10 text-gray-500" />
                                    </div>
                                )}
                                </div>
                            )}
                            <div className="flex-grow space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Title</label>
                                    <input type="text" value={pendingImport.title} onChange={e => setPendingImport(p => p ? {...p, title: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Author(s)</label>
                                    <input type="text" value={pendingImport.author} onChange={e => setPendingImport(p => p ? {...p, author: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" />
                                </div>
                                {pendingImport.bookTitle && <div><label className="block text-xs font-medium text-gray-300 mb-1">Book Title</label><input type="text" value={pendingImport.bookTitle} onChange={e => setPendingImport(p => p ? {...p, bookTitle: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" /></div>}
                                {pendingImport.journalTitle && <div><label className="block text-xs font-medium text-gray-300 mb-1">Journal</label><input type="text" value={pendingImport.journalTitle} onChange={e => setPendingImport(p => p ? {...p, journalTitle: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" /></div>}
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="block text-xs font-medium text-gray-300 mb-1">Date</label><input type="text" value={pendingImport.publicationDate || ''} onChange={e => setPendingImport(p => p ? {...p, publicationDate: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" placeholder="e.g., 2023-04-01" /></div>
                                    <div><label className="block text-xs font-medium text-gray-300 mb-1">Publisher</label><input type="text" value={pendingImport.publisher || ''} onChange={e => setPendingImport(p => p ? {...p, publisher: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" /></div>
                                </div>
                                <div><label className="block text-xs font-medium text-gray-300 mb-1">Pages</label><input type="text" value={pendingImport.pages || ''} onChange={e => setPendingImport(p => p ? {...p, pages: e.target.value} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" placeholder="e.g., 42-59 or 320" /></div>
                                <div><label className="block text-xs font-medium text-gray-300 mb-1">Keywords (comma-separated)</label><input type="text" value={pendingImport.keywords?.join(', ') || ''} onChange={e => setPendingImport(p => p ? {...p, keywords: e.target.value.split(',').map(k => k.trim())} : null)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" /></div>

                            </div>
                        </div>
                        {pendingImport.description && (
                            <div className="text-sm text-gray-400">
                                <p className="text-xs font-medium text-gray-300 mb-1">{pendingImport.publicationType === 'book' ? 'Synopsis' : 'Abstract'}</p>
                                <textarea value={pendingImport.description} onChange={e => setPendingImport(p => p ? {...p, description: e.target.value} : null)} className="w-full p-2 bg-gray-900/50 rounded text-xs leading-relaxed h-24 resize-none border border-gray-700" />
                            </div>
                        )}
                         <div className="text-sm text-gray-400">
                            <span className="font-semibold">{pendingImport.notes.length}</span> notes found.
                        </div>
                        <div className="pt-2">
                             <button onClick={handleConfirmImport} className="w-full px-4 py-2 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 transition-colors">
                                Add Source
                            </button>
                        </div>
                    </>
                 )}
            </div>
        )
    };
    
    const renderSourceList = () => (
        <div className="flex flex-col flex-grow overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
                <h4 className="font-bold text-white mb-2">Note Sources</h4>
                <button onClick={() => setView('selectType')} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors font-semibold text-sm">
                    <UploadCloudIcon className="w-5 h-5"/>
                    Import New Notes
                </button>
            </div>
            {importedNoteSources.length > 0 ? (
                <ul className="flex-grow p-2 space-y-1 overflow-y-auto">
                    {importedNoteSources.map(source => (
                        <li key={source.id} className="group rounded-md hover:bg-gray-700/70 transition-colors">
                            {editingSource?.id === source.id ? (
                                <div className="p-3 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" value={editingSource.title} onChange={e => setEditingSource(es => es ? {...es, title: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm col-span-2" placeholder="Title"/>
                                        <input type="text" value={editingSource.author} onChange={e => setEditingSource(es => es ? {...es, author: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm col-span-2" placeholder="Author"/>
                                        {editingSource.publicationType === 'chapter' && <input type="text" value={editingSource.bookTitle || ''} onChange={e => setEditingSource(es => es ? {...es, bookTitle: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm col-span-2" placeholder="Book Title"/>}
                                        {editingSource.publicationType === 'article' && <input type="text" value={editingSource.journalTitle || ''} onChange={e => setEditingSource(es => es ? {...es, journalTitle: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm col-span-2" placeholder="Journal"/>}
                                        <input type="text" value={editingSource.publicationDate || ''} onChange={e => setEditingSource(es => es ? {...es, publicationDate: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm" placeholder="Date"/>
                                        <input type="text" value={editingSource.publisher || ''} onChange={e => setEditingSource(es => es ? {...es, publisher: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm" placeholder="Publisher"/>
                                        <input type="text" value={editingSource.pages || ''} onChange={e => setEditingSource(es => es ? {...es, pages: e.target.value} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm col-span-2" placeholder="Pages"/>
                                    </div>
                                    <input type="text" value={editingSource.keywords?.join(', ') || ''} onChange={e => setEditingSource(es => es ? {...es, keywords: e.target.value.split(',').map(k => k.trim())} : null)} className="w-full p-1 bg-gray-900 border border-gray-600 rounded-md text-sm col-span-2" placeholder="Keywords (comma-separated)"/>
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveMetadata} className="p-1 text-green-400 hover:text-green-300" aria-label="Save changes"><Check className="w-5 h-5"/></button>
                                        <button onClick={() => setEditingSource(null)} className="p-1 text-red-400 hover:text-red-300" aria-label="Cancel editing"><X className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute top-1 right-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingSource(JSON.parse(JSON.stringify(source))); }} className="p-1 text-gray-400 hover:text-cyan-400" aria-label="Edit source metadata"><Edit className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); onRequestConfirmation({ message: 'Are you sure you want to delete this source and all its notes?', title: `Delete Source: ${source.title}`, confirmText: 'Delete', onConfirm: () => {if (selectedSourceId === source.id) {setSelectedSourceId(null);} onDeleteSource(source.id);}}); }} className="p-1 text-gray-400 hover:text-red-400" aria-label="Delete source"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                    <div onClick={() => setSelectedSourceId(source.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedSourceId(source.id)} role="button" tabIndex={0} className="w-full text-left p-3 flex items-center gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md">
                                        {source.coverImageUrl ? (
                                            <img src={source.coverImageUrl} alt={`Cover of ${source.title}`} className="w-10 h-14 object-cover rounded flex-shrink-0 shadow-md" />
                                        ) : (
                                            <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                                <PublicationIcon type={source.publicationType} />
                                            </div>
                                        )}
                                        <div className="overflow-hidden">
                                            <h5 className="font-semibold text-gray-100 truncate">{source.title}</h5>
                                            <p className="text-xs text-gray-400 truncate">{source.author}</p>
                                            <p className="text-xs text-gray-500 mt-1">{source.notes.length} notes</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="p-4 text-center text-gray-400 text-sm flex-grow flex flex-col items-center justify-center">
                    <p className="font-semibold mb-2">No notes imported for this project.</p>
                    <p className="max-w-xs">Export your notes from the Kindle web reader as an HTML file to get started.</p>
                </div>
            )}
        </div>
    );

    const renderNotesView = () => {
        if (!selectedSource) return null;
        const allDisplayedSelected = displayedNotes.length > 0 && selectedNoteIds.size === displayedNotes.length;
        return (
            <div className="flex flex-col flex-grow overflow-hidden relative">
                <div className="p-4 border-b border-gray-700 flex-shrink-0 space-y-3">
                    <button onClick={() => setSelectedSourceId(null)} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-200">
                        <ChevronLeft className="w-4 h-4" /> Back to Sources
                    </button>
                    <div>
                        <h4 className="font-bold text-white truncate">{selectedSource.title}</h4>
                        <p className="text-sm text-gray-400">{selectedSource.author}</p>
                        {selectedSource.bookTitle && <p className="text-xs text-gray-500 italic">In: {selectedSource.bookTitle}</p>}
                        {(selectedSource.publisher || selectedSource.publicationDate || selectedSource.pages) && (
                            <p className="text-xs text-gray-500 mt-1">
                                {[selectedSource.publisher, selectedSource.publicationDate].filter(Boolean).join(', ')}
                                {selectedSource.pages && <span className="ml-2 pl-2 border-l border-gray-600">pp. {selectedSource.pages}</span>}
                            </p>
                        )}
                        {selectedSource.keywords && selectedSource.keywords.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedSource.keywords.map(k => <span key={k} className="px-1.5 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{k}</span>)}
                            </div>
                        )}
                    </div>
                     <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${selectedSource.notes.length} notes...`}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                     <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 text-gray-300">
                            <input type="checkbox" checked={showProcessed} onChange={(e) => setShowProcessed(e.target.checked)} className="form-checkbox h-4 w-4 rounded bg-gray-900 border-gray-600 text-cyan-500 focus:ring-cyan-500" />
                            Show Processed
                        </label>
                        <button onClick={handleSelectAll} className="text-cyan-400 hover:underline">
                            {allDisplayedSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                </div>
                {displayedNotes.length > 0 ? (
                    <ul className="flex-grow p-2 space-y-2 overflow-y-auto pb-16">
                        {displayedNotes.map(note => (
                            <NoteCard key={note.id} note={note} isProcessed={processedNoteIds.has(note.id)} isSelected={selectedNoteIds.has(note.id)} onToggleSelect={() => handleToggleSelect(note.id)} />
                        ))}
                    </ul>
                ) : (
                     <div className="p-4 text-center text-gray-500 text-sm flex-grow flex flex-col items-center justify-center">
                        <p>No notes to display.</p>
                     </div>
                )}
                {selectedNoteIds.size > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-2 flex items-center justify-between z-10 animate-fade-in">
                        <span className="text-sm text-gray-300 px-2">{selectedNoteIds.size} selected</span>
                        <div className="flex items-center gap-2">
                            <button onClick={handleMarkSelectedAsProcessed} className="px-3 py-1 bg-gray-700 text-xs rounded hover:bg-gray-600">Mark as Processed</button>
                            <div 
                                draggable 
                                onDragStart={handleBatchDragStart} 
                                className="px-3 py-1 bg-cyan-700 text-white text-xs font-bold rounded cursor-grab active:cursor-grabbing"
                            >
                                Drag Group
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    let content;
    if (view === 'selectType') {
        content = renderSelectType();
    } else if (view === 'uploadWithDoi') {
        content = renderUploadWithDoi();
    } else if (view === 'confirm' || isFetchingMetadata) {
        content = renderConfirm();
    } else if (selectedSourceId) {
        content = renderNotesView();
    } else {
        content = renderSourceList();
    }

    return (
        <div
            className={`fixed top-0 left-0 h-full bg-black/80 backdrop-blur-md border-r border-gray-600 z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-96 flex flex-col`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-inbox-title"
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".html"
                className="hidden"
            />
            <div className="flex justify-between items-center p-4 border-b border-gray-600 flex-shrink-0">
                <h3 id="notes-inbox-title" className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                    <BookOpenIcon className="w-6 h-6"/>
                    Notes Inbox
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close Notes Inbox">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </div>
            
            {content}
        </div>
    );
};

export default NotesInbox;