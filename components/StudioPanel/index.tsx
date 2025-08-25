import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { ProjectActivityType, KindleNote, UserNote, AppTag } from '../../types';
import { X, NoteIcon, DownloadIcon, UndoIcon, RedoIcon, BoldIcon, ItalicIcon, SparkleIcon, Check, PaletteIcon, FontSizeIcon, RefreshCw, CopyIcon, InsertBelowIcon, FlaskConicalIcon, SendIcon, Plus, BookOpenIcon, StickyNoteIcon, Trash2, MicrophoneIcon, StopCircleIcon } from '../icons';

const useHistoryState = <T,>(initialState: T): [T, (newState: T, immediate?: boolean) => void, () => void, () => void, boolean, boolean] => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [index, setIndex] = useState(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setState = useCallback((newState: T, immediate = false) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        const update = () => {
            if (newState === history[index]) return;
            const newHistory = history.slice(0, index + 1);
            newHistory.push(newState);
            setHistory(newHistory);
            setIndex(newHistory.length - 1);
        };
        
        if (immediate) {
            update();
        } else {
            timeoutRef.current = setTimeout(update, 300);
        }

    }, [history, index]);

    const undo = useCallback(() => {
        if (index > 0) setIndex(index - 1);
    }, [index]);

    const redo = useCallback(() => {
        if (index < history.length - 1) setIndex(index + 1);
    }, [index, history.length]);

    const canUndo = index > 0;
    const canRedo = index < history.length - 1;

    return [history[index], setState, undo, redo, canUndo, canRedo];
};

interface StudioPanelProps {
    state: { nodeId: string | number; x: number; y: number };
    nodeName: string;
    onClose: () => void;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
    ai: GoogleGenAI;
    
    // For analysis mode
    analysisMode?: boolean;
    onDeconstruct?: (result: { premises: string[], conclusion: string }) => void;
    
    // Note-related props
    userNotes: UserNote[];
    activeUserNote: (UserNote & { mapNodeId: string | number; mapNodeName: string; }) | null;
    onUpdateUserNotesForMapNode?: (nodeId: string | number, userNotes: UserNote[]) => void;
    onUpdateUserNote: (updatedNote: UserNote) => void;
    
    onLogEdit: (nodeId: string | number, noteTitle: string) => void;

    // Context for AI assistant
    allProjectNotes: (UserNote & { mapNodeId: string | number; mapNodeName: string; mapId: string; mapName: string; })[];
    allProjectTags: AppTag[];
    onUpdateTags: (tags: AppTag[]) => void;
    onNavigateToNexusTag: (tagId: string) => void;
    onNavigateToNexusNote: (noteId: string) => void;
}


const fontSizes = [
    { name: 'Small', value: '2' },
    { name: 'Normal', value: '3' },
    { name: 'Large', value: '5' },
    { name: 'Heading', value: '6' },
];
const textColors = ['#FFFFFF', '#FDE047', '#A7F3D0', '#A5B4FC', '#F9A8D4', '#FCA5A5'];

const HIGHLIGHT_COLOR_HEX = '#3a6eff'; // A solid blue that works with execCommand
const HIGHLIGHT_COLOR_RGB = 'rgb(58, 110, 255)';

const simpleMarkdownToHtml = (markdown: string): string => {
    const formatLatex = (text: string): string => {
        return text
            .replace(/\\rightarrow/g, '→')
            .replace(/\\leftrightarrow/g, '↔')
            .replace(/\\land/g, '∧')
            .replace(/\\lor/g, '∨')
            .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
            .replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>');
    };

    const processInlines = (text: string) => {
        let processedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        const formulaRegex = /(\$[^$]+\$)|((?:\b[A-Z][A-Z0-9_]*|[()~¬])(?:[ \t]*(?:\\(?:rightarrow|leftrightarrow|land|lor)|_\{[^}]+\}|_[A-Z][A-Z0-9_]+)[ \t]*(?:\(.*\)|[A-Z][A-Z0-9_]*|[()~¬])?)+)/g;
        
        processedText = processedText.replace(formulaRegex, (match) => {
            const isDelimited = match.startsWith('$') && match.endsWith('$');
            const content = isDelimited ? match.slice(1, -1) : match;
            const formattedContent = formatLatex(content);
            return `<span class="latex-inline">${formattedContent}</span>`;
        });

        return processedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    };

    const blocks = markdown.split(/\n\s*\n/);

    return blocks.map(block => {
        const trimmedBlock = block.trim();
        if (trimmedBlock === '') return '';

        const headingMatch = trimmedBlock.match(/^(#{1,6})\s(.*)/s);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const content = processInlines(headingMatch[2].replace(/\n/g, ' '));
            return `<h${level}>${content}</h${level}>`;
        }

        if (trimmedBlock.match(/^---\s*$/)) {
            return '<hr>';
        }

        const lines = trimmedBlock.split('\n');
        const isUl = lines.every(line => /^\s*\*\s/.test(line));
        const isOl = lines.every(line => /^\s*\d+\.\s/.test(line));

        if (isUl || isOl) {
            const tag = isUl ? 'ul' : 'ol';
            let listHtml = `<${tag}>`;
            lines.forEach(line => {
                const itemContent = line.replace(/^\s*(\*|\d+\.)\s/, '');
                listHtml += `<li>${processInlines(itemContent)}</li>`;
            });
            listHtml += `</${tag}>`;
            return listHtml;
        }

        return `<p>${trimmedBlock.split('\n').map(line => processInlines(line)).join('<br />')}</p>`;
    }).join('');
};

const AI_SYSTEM_INSTRUCTION = "You are a versatile AI research and writing assistant. Your purpose is to help the user think, research, and write. You can summarize, explain complex concepts, brainstorm ideas, give context, and rephrase text. When provided with context, use it as a starting point for your response, but feel free to draw upon your broader knowledge to provide more complete and helpful answers, especially when the user asks for information not explicitly present in the text. Respond clearly and concisely to the user's instruction. Use markdown (like bullet points) if it enhances readability. Provide the answer directly, without conversational filler.";

const StudioPanel: React.FC<StudioPanelProps> = ({ 
    state, 
    userNotes: initialUserNotes,
    nodeName, 
    onClose, 
    onUpdateUserNotesForMapNode,
    onUpdateUserNote,
    onLogEdit, 
    logActivity,
    ai,
    analysisMode = false,
    onDeconstruct,
    activeUserNote,
    allProjectNotes,
    onNavigateToNexusNote,
}) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 700, height: 550 });
    
    const [aiPrompt, setAiPrompt] = useState<{ text: string, rect: DOMRect, userInput: string } | null>(null);
    const [aiConversation, setAiConversation] = useState<{ range: Range, history: { role: 'user' | 'model', content: string }[] } | null>(null);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [followUpInput, setFollowUpInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    const [analysisText, setAnalysisText] = useState('');
    const [aiConvoPosition, setAiConvoPosition] = useState<{ x: number; y: number } | null>(null);
    const [aiConvoSize, setAiConvoSize] = useState({ width: 448, height: 384 });

    const [userNotes, setUserNotes] = useState<UserNote[]>(initialUserNotes);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(activeUserNote ? activeUserNote.id : (initialUserNotes.length > 0 ? initialUserNotes[0].id : null));

    const panelRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const aiToolbarRef = useRef<HTMLDivElement>(null);
    const aiConversationRef = useRef<HTMLDivElement>(null);
    const aiConvoHeaderRef = useRef<HTMLDivElement>(null);
    const savedRange = useRef<Range | null>(null);
    const conversationEndRef = useRef<HTMLDivElement>(null);
    
    const isNoteTakingMode = !analysisMode;

    // Effect to update panel position
    useEffect(() => {
        if (panelRef.current) {
            const { innerWidth, innerHeight } = window;
            const p = panelRef.current.getBoundingClientRect();
            const left = Math.max(10, Math.min(state.x - p.width / 2, innerWidth - p.width - 10));
            const top = Math.max(10, Math.min(state.y - p.height / 2, innerHeight - p.height - 10));
            setPosition({ x: left, y: top });
        }
    }, [state.x, state.y]);
    
    // Draggable Panel Logic
    useEffect(() => {
        const header = headerRef.current;
        const panel = panelRef.current;
        if (!header || !panel) return;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
            e.preventDefault();
            const startPos = { x: e.clientX, y: e.clientY };
            const initialPanelPos = { x: panel.offsetLeft, y: panel.offsetTop };
            const onPointerMove = (e: PointerEvent) => {
                const dx = e.clientX - startPos.x;
                const dy = e.clientY - startPos.y;
                setPosition({ x: initialPanelPos.x + dx, y: initialPanelPos.y + dy });
            };
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onPointerMove), { once: true });
        };
        header.addEventListener('pointerdown', onPointerDown);
        return () => header.removeEventListener('pointerdown', onPointerDown);
    }, []);

    const removeHighlight = useCallback(() => {
        if (!editorRef.current) return;
        const spans = Array.from(editorRef.current.querySelectorAll<HTMLSpanElement>('span[style*="background-color"]'));
    
        spans.forEach(span => {
            if (span.style.backgroundColor === HIGHLIGHT_COLOR_RGB) {
                const parent = span.parentNode;
                if (parent) {
                    while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                    }
                    parent.removeChild(span);
                    parent.normalize();
                }
            }
        });
    }, []);

    const cleanupAiInteraction = useCallback(() => {
        setAiPrompt(null);
        setAiConversation(null);
        setChatSession(null);
        setFollowUpInput('');
        removeHighlight();
    }, [removeHighlight]);

    // Click Away Logic
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(event.target as Node) &&
                (!aiToolbarRef.current || !aiToolbarRef.current.contains(event.target as Node)) &&
                (!aiConversationRef.current || !aiConversationRef.current.contains(event.target as Node))
            ) {
                cleanupAiInteraction();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [cleanupAiInteraction]);
    
     useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiConversation?.history, isAiLoading]);

    // Draggable AI Conversation Panel
    useEffect(() => {
        const header = aiConvoHeaderRef.current;
        const panel = aiConversationRef.current;
        if (!header || !panel || !aiConvoPosition) return;
    
        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
            e.preventDefault();
            const startPos = { x: e.clientX, y: e.clientY };
            const initialPanelPos = { x: panel.offsetLeft, y: panel.offsetTop };
            
            const onPointerMove = (e: PointerEvent) => {
                const dx = e.clientX - startPos.x;
                const dy = e.clientY - startPos.y;
                setAiConvoPosition({ x: initialPanelPos.x + dx, y: initialPanelPos.y + dy });
            };
            
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onPointerMove), { once: true });
        };
        
        header.addEventListener('pointerdown', onPointerDown);
        return () => header.removeEventListener('pointerdown', onPointerDown);
    }, [aiConvoPosition]);

    // Position AI Conversation Panel
    useEffect(() => {
        if (aiConversation && !aiConvoPosition) {
            const rect = aiConversation.range.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;
            let left = rect.left + window.scrollX;
            let top = rect.bottom + window.scrollY + 5;

            if (left + aiConvoSize.width > innerWidth) {
                left = innerWidth - aiConvoSize.width - 10;
            }
            if (top + aiConvoSize.height > innerHeight) {
                top = rect.top + window.scrollY - aiConvoSize.height - 5;
            }

            setAiConvoPosition({ x: Math.max(10, left), y: Math.max(10, top) });
        }
        if (!aiConversation) {
            setAiConvoPosition(null);
        }
    }, [aiConversation, aiConvoPosition, aiConvoSize]);
    
    // Effect to auto-save user notes
    useEffect(() => {
        if(isNoteTakingMode && onUpdateUserNotesForMapNode) {
            const handler = setTimeout(() => {
                onUpdateUserNotesForMapNode(state.nodeId, userNotes);
            }, 1000);
            return () => clearTimeout(handler);
        }
    }, [userNotes, onUpdateUserNotesForMapNode, state.nodeId, isNoteTakingMode]);


    const handleAiSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editorRef.current?.contains(range.commonAncestorContainer)) {
                cleanupAiInteraction();
                (document.activeElement as HTMLElement)?.blur();
                
                const selectedText = range.toString(); // Extract text before DOM manipulation
                if (!selectedText.trim()) {
                    alert("Please select some text before using 'Ask AI'.");
                    return;
                }

                savedRange.current = range.cloneRange();
                
                document.execCommand('styleWithCSS', false, 'true');
                document.execCommand('backColor', false, HIGHLIGHT_COLOR_HEX);
                
                selection.removeAllRanges();
                selection.addRange(savedRange.current);
                
                setAiPrompt({ text: selectedText, rect: savedRange.current.getBoundingClientRect(), userInput: '' });
            } else {
                 alert("Please select text within the Studio editor to use 'Ask AI'.");
            }
        } else {
            alert("Please select some text before using 'Ask AI'.");
        }
    }, [cleanupAiInteraction]);

    const handleAskAI = async () => {
        if (!aiPrompt || !savedRange.current) return;
        setIsAiLoading(true);

        const systemInstruction = AI_SYSTEM_INSTRUCTION;
        const userInstruction = aiPrompt.userInput || 'Improve the selected text for clarity and conciseness.';
        const initialPrompt = `CONTEXT (selected text):\n---\n${aiPrompt.text}\n---\n\nUSER COMMAND:\n---\n${userInstruction}\n---\n`;

        try {
            const newChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
            setChatSession(newChat);
            
            const response = await newChat.sendMessage({ message: initialPrompt });
            
            logActivity('ASK_AI_ASSISTANT', {
                context: analysisMode ? 'Argument Analysis' : nodeName,
                userInstruction,
                selectedText: aiPrompt.text,
                provenance: {
                    prompt: initialPrompt,
                    systemInstruction,
                    rawResponse: response.text,
                    model: 'gemini-2.5-flash',
                    inputTokens: response.usageMetadata?.promptTokenCount,
                    outputTokens: response.usageMetadata?.candidatesTokenCount,
                    totalTokens: (response.usageMetadata?.promptTokenCount || 0) + (response.usageMetadata?.candidatesTokenCount || 0),
                }
            });

            setAiConversation({
                range: savedRange.current,
                history: [
                    { role: 'user', content: userInstruction },
                    { role: 'model', content: response.text }
                ]
            });

        } catch (error) {
            console.error("AI suggestion failed:", error);
            alert("The AI failed to respond. Please try again.");
        } finally {
            setIsAiLoading(false);
            setAiPrompt(null);
            removeHighlight();
        }
    };

    const handleFollowUp = async () => {
        if (!chatSession || !followUpInput.trim() || isAiLoading || !aiConversation) return;
    
        setIsAiLoading(true);
        const userMessage = { role: 'user' as const, content: followUpInput };
        
        setAiConversation(convo => convo ? { ...convo, history: [...convo.history, userMessage] } : null);
        const currentInput = followUpInput;
        setFollowUpInput('');
    
        try {
            const response = await chatSession.sendMessage({ message: currentInput });

            logActivity('ASK_AI_ASSISTANT', {
                context: analysisMode ? 'Argument Analysis' : nodeName,
                userInstruction: currentInput,
                isFollowUp: true,
                provenance: {
                    prompt: currentInput,
                    systemInstruction: AI_SYSTEM_INSTRUCTION,
                    rawResponse: response.text,
                    model: 'gemini-2.5-flash',
                    inputTokens: response.usageMetadata?.promptTokenCount,
                    outputTokens: response.usageMetadata?.candidatesTokenCount,
                    totalTokens: (response.usageMetadata?.promptTokenCount || 0) + (response.usageMetadata?.candidatesTokenCount || 0),
                }
            });

            const modelMessage = { role: 'model' as const, content: response.text };
            setAiConversation(convo => {
                if (!convo) return null;
                // Since the user message was already added, just append the model's response
                return { ...convo, history: [...convo.history, modelMessage] };
            });
        } catch(error) {
            console.error("AI follow-up failed:", error);
            const errorMessage = { role: 'model' as const, content: 'Sorry, I encountered an error. Please try again.' };
            setAiConversation(convo => convo ? { ...convo, history: [...convo.history, errorMessage] } : null);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const getLatestModelResponse = () => {
        if (!aiConversation) return null;
        return aiConversation.history.filter(m => m.role === 'model').pop()?.content || null;
    };
    
    const handleReplace = () => {
        const latestResponse = getLatestModelResponse();
        if (!latestResponse || !aiConversation) return;
        const { range } = aiConversation;
        cleanupAiInteraction();

        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
        document.execCommand('insertHTML', false, simpleMarkdownToHtml(latestResponse));
        if (editorRef.current) {
            const noteId = editorRef.current.closest('[data-note-id]')?.getAttribute('data-note-id');
            if (noteId) {
                const newContent = editorRef.current.innerHTML;
                const note = userNotes.find(n => n.id === noteId);
                if (note) {
                    handleUpdateNote(noteId, note.title, newContent);
                }
            }
        }
    };

    const handleInsertBelow = () => {
        const latestResponse = getLatestModelResponse();
        if (!latestResponse || !aiConversation || !editorRef.current) return;
        const { range } = aiConversation;
        cleanupAiInteraction();
    
        const editor = editorRef.current;
        const htmlToInsert = `<br>${simpleMarkdownToHtml(latestResponse)}`;
        
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            range.collapse(false);
            sel.addRange(range);
            editor.focus();
        }
        
        document.execCommand('insertHTML', false, htmlToInsert);
        
        const noteId = editor.closest('[data-note-id]')?.getAttribute('data-note-id');
        if (noteId) {
            const newContent = editor.innerHTML;
            const note = userNotes.find(n => n.id === noteId);
            if (note) {
                handleUpdateNote(noteId, note.title, newContent);
            }
        }
    };
    
    const handleCopy = () => {
        const latestResponse = getLatestModelResponse();
        if (!latestResponse) return;
        navigator.clipboard.writeText(latestResponse).catch(err => {
            console.error('Failed to copy text: ', err);
        });
        cleanupAiInteraction();
    };

    const handleDeconstruct = async () => {
        if (!analysisText.trim() || !onDeconstruct) return;
        setIsAiLoading(true);
        try {
            const model = 'gemini-2.5-flash';
            const systemInstruction = "You are an expert in logical analysis. Your task is to extract premises and a conclusion from a given text. Respond ONLY in the specified JSON format.";
            const prompt = `From the following text, identify all the distinct premises and the single main conclusion.
Text: "${analysisText}"`;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            premises: { type: Type.ARRAY, items: { type: Type.STRING } },
                            conclusion: { type: Type.STRING }
                        },
                        required: ["premises", "conclusion"]
                    }
                }
            });
            const result = JSON.parse(response.text);
            if (result.premises && result.conclusion) {
                onDeconstruct(result);
            }
        } catch(e) {
            console.error("Failed to deconstruct argument", e);
            alert("AI failed to deconstruct the argument. Please check the text and try again.");
        } finally {
            setIsAiLoading(false);
        }
    };
    
    // Note-taking mode specific handlers
    const handleAddNewNote = () => {
        const now = Date.now();
        const newNote: UserNote = {
            id: `note_${now}_${Math.random().toString(36).substring(2, 9)}`,
            title: 'Untitled Note',
            content: '<p><br></p>',
            createdAt: now,
            updatedAt: now,
        };
        const newNotes = [newNote, ...userNotes];
        setUserNotes(newNotes);
        setEditingNoteId(newNote.id);
    };

    const handleUpdateNote = (noteId: string, newTitle: string, newContent: string) => {
        const now = Date.now();
        let updatedNote: UserNote | undefined;
        const newNotes = userNotes.map(n => {
            if (n.id === noteId) {
                updatedNote = { ...n, title: newTitle, content: newContent, updatedAt: now };
                return updatedNote;
            }
            return n;
        });
        setUserNotes(newNotes);
    
        if (onUpdateUserNote && updatedNote) {
            onUpdateUserNote(updatedNote);
        }
    };

    const handleDeleteNote = (noteId: string) => {
        const noteToDelete = userNotes.find(n => n.id === noteId);
        if (noteToDelete) {
            logActivity('DELETE_NOTE', {
                conceptName: nodeName,
                noteTitle: noteToDelete.title,
            });
        }
        setUserNotes(currentNotes => currentNotes.filter(n => n.id !== noteId));
        if (editingNoteId === noteId) {
            setEditingNoteId(null);
        }
    };
    
    if (analysisMode) {
        return (
             <div
                ref={panelRef}
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 450 }}
                className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white flex flex-col select-text"
            >
                <div ref={headerRef} className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing flex-shrink-0">
                    <h3 className="text-md font-bold text-cyan-300 flex items-center gap-2 pl-2"><FlaskConicalIcon className="w-5 h-5"/> Argument Analysis Studio</h3>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><X className="w-5 h-5"/></button>
                </div>
                <div className="flex-grow p-4 flex flex-col">
                    <label htmlFor="argument-text" className="text-sm text-gray-400 mb-2">Paste or write the argument you want to analyze and map:</label>
                    <textarea
                        id="argument-text"
                        value={analysisText}
                        onChange={(e) => setAnalysisText(e.target.value)}
                        placeholder="e.g., All men are mortal. Socrates is a man. Therefore, Socrates is mortal."
                        className="w-full h-full bg-gray-800 border border-gray-600 rounded-md p-3 text-base text-gray-200 outline-none resize-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800/50">
                    <button
                        onClick={handleDeconstruct}
                        disabled={isAiLoading || !analysisText.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                         {isAiLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <SparkleIcon className="w-5 h-5"/>}
                         {isAiLoading ? 'Analyzing...' : 'Deconstruct Argument'}
                    </button>
                </div>
            </div>
        )
    }
    
    const noteToEdit = userNotes.find(n => n.id === editingNoteId);
    
    return (
        <div
            ref={panelRef}
            style={{ top: position.y, left: position.x, width: size.width, height: size.height, minWidth: 500, minHeight: 400 }}
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white flex flex-col resize overflow-hidden select-text"
            onMouseUp={() => {
                if (panelRef.current) {
                    const rect = panelRef.current.getBoundingClientRect();
                    if(rect.width !== size.width || rect.height !== size.height) {
                        setSize({ width: rect.width, height: rect.height });
                    }
                }
            }}
        >
            <div ref={headerRef} className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing flex-shrink-0">
                <h3 className="text-md font-bold text-cyan-300 flex items-center gap-2 pl-2"><NoteIcon className="w-5 h-5"/> Studio: {nodeName}</h3>
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-grow flex overflow-hidden">
                <div className="w-1/3 min-w-[200px] border-r border-gray-700 flex flex-col bg-gray-800/50">
                    <div className="flex-grow flex flex-col overflow-y-auto">
                        <ul className="flex-grow p-2 space-y-1">
                            {userNotes.map(note => (
                                <li key={note.id}>
                                    <button 
                                        onClick={() => setEditingNoteId(note.id)}
                                        className={`w-full text-left p-2 rounded-md ${editingNoteId === note.id ? 'bg-cyan-800/80 ring-1 ring-cyan-500' : 'hover:bg-gray-700/70'}`}
                                    >
                                        <p className="font-semibold text-gray-100 truncate">{note.title}</p>
                                        <p className="text-xs text-gray-400 mt-1 truncate">{note.content.replace(/<[^>]+>/g, '') || 'Empty note'}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="p-2 border-t border-gray-700">
                            <button onClick={handleAddNewNote} className="w-full flex items-center justify-center gap-2 p-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                                <Plus className="w-4 h-4" />
                                Add New Note
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-2/3 flex-grow flex flex-col">
                    {noteToEdit ? (
                        <EditableNoteCard
                            key={editingNoteId}
                            note={noteToEdit}
                            onSave={(id, title, content) => {
                                const isNewNote = !initialUserNotes.some(n => n.id === id);
                                handleUpdateNote(id, title, content);
                                
                                if (isNewNote) {
                                    logActivity('CREATE_NOTE', {
                                        conceptName: nodeName,
                                        noteTitle: title,
                                    });
                                } else {
                                    onLogEdit(state.nodeId, title);
                                }
                                onClose();
                            }}
                            onDelete={handleDeleteNote}
                            onCancel={onClose}
                            onAiSelection={handleAiSelection}
                            ai={ai}
                            logActivity={logActivity}
                            nodeName={nodeName}
                            allProjectNotes={allProjectNotes}
                            onNavigateToNexusNote={onNavigateToNexusNote}
                        />
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 p-4">
                            <StickyNoteIcon className="w-16 h-16 mb-4"/>
                            <p className="font-semibold">
                                {userNotes.length > 0 ? 'Select a note to view or edit' : 'No notes yet'}
                            </p>
                            <p className="text-sm mt-1">
                                {userNotes.length > 0 ? 'Choose a note from the list on the left.' : 'Click "Add New Note" to get started.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* AI Interaction elements remain the same */}
        </div>
    );
};


const EditableNoteCard: React.FC<{
    note: UserNote;
    onSave: (id: string, title: string, content: string) => void;
    onDelete: (id: string) => void;
    onCancel: () => void;
    onAiSelection: () => void;
    ai: GoogleGenAI;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
    nodeName: string;
    allProjectNotes: (UserNote & { mapNodeId: string | number; mapNodeName: string; mapId: string; mapName: string; })[];
    onNavigateToNexusNote: (noteId: string) => void;
}> = ({ note, onSave, onDelete, onCancel, onAiSelection, ai, logActivity, nodeName, allProjectNotes, onNavigateToNexusNote }) => {
    const [title, setTitle] = useState(note.title);
    const [content, setContent, undo, redo, canUndo, canRedo] = useHistoryState(note.content);
    const editorRef = useRef<HTMLDivElement>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isFontSizePickerOpen, setIsFontSizePickerOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    type LinkSearchState = { query: string; alias?: string; range: Range; position: { top: number, left: number } };
    const [linkSearch, setLinkSearch] = useState<LinkSearchState | null>(null);

    const linkResults = useMemo(() => {
        if (!linkSearch || !linkSearch.query.trim()) return [];
        const query = linkSearch.query.trim().toLowerCase();

        const getScore = (title: string): number => {
            const lowerTitle = title.toLowerCase();
            if (lowerTitle === query) return 10;
            if (lowerTitle.startsWith(query)) return 5;
            const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            if (new RegExp(`\\b${escapedQuery}\\b`).test(lowerTitle)) return 3;
            if (lowerTitle.includes(query)) return 1;
            return 0;
        };

        return allProjectNotes
            .filter(n => n.id !== note.id)
            .map(n => ({ note: n, score: getScore(n.title) }))
            .filter(item => item.score > 0)
            .sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return a.note.title.length - b.note.title.length;
            })
            .slice(0, 10)
            .map(item => item.note);
    }, [linkSearch, allProjectNotes, note.id]);

    const backlinks = useMemo(() => {
        const linkedFrom: { note: (UserNote & {mapNodeName: string}), context: string, linkText: string }[] = [];
        const regex = new RegExp(`<span class="nexus-link"[^>]*data-note-id="${note.id}"[^>]*>(.*?)<\\/span>`, 'g');
        
        for (const projectNote of allProjectNotes) {
            if (projectNote.id === note.id) continue;
            
            let match;
            let found = false;
            while ((match = regex.exec(projectNote.content)) !== null) {
                if(!found) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = projectNote.content;
                    const plainText = tempDiv.textContent || '';
                    const linkText = match[1];

                    const snippetIndex = plainText.indexOf(linkText);
                    let context = plainText;
                    if (snippetIndex !== -1) {
                        const start = Math.max(0, snippetIndex - 40);
                        const end = Math.min(plainText.length, snippetIndex + linkText.length + 40);
                        context = (start > 0 ? '...' : '') + plainText.substring(start, end) + (end < plainText.length ? '...' : '');
                    }
                    linkedFrom.push({ note: projectNote, context, linkText });
                    found = true; 
                }
            }
        }
        return linkedFrom;
    }, [allProjectNotes, note.id]);


    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result !== 'string') {
                    return reject(new Error("FileReader result is not a string"));
                }
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleStartRecording = async () => {
        setTranscriptionError(null);
        if (isRecording) {
            handleStopRecording();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                setIsRecording(false);
                setIsTranscribing(true);
                setTranscriptionError(null);
                
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                try {
                    const base64Audio = await blobToBase64(audioBlob);
                    
                    const audioPart = {
                        inlineData: {
                            mimeType: audioBlob.type,
                            data: base64Audio,
                        },
                    };
                    
                    const model = 'gemini-2.5-flash';
                    const prompt = "Transcribe this audio recording precisely and accurately.";
                    const textPart = { text: prompt };

                    const response = await ai.models.generateContent({
                      model,
                      contents: { parts: [audioPart, textPart] },
                    });
                    
                    const transcription = response.text;
                    
                    if (transcription && editorRef.current) {
                        const editor = editorRef.current;
                        editor.focus();
                        const selection = window.getSelection();
                        if (selection) {
                            const range = document.createRange();
                            range.selectNodeContents(editor);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                        const contentToInsert = `<p>${transcription}</p>`;
                        document.execCommand('insertHTML', false, contentToInsert);
                        setContent(editor.innerHTML, true);
                    }
                    
                    const { usageMetadata } = response;
                    logActivity('VOICE_NOTE', {
                        conceptName: nodeName,
                        provenance: {
                            prompt,
                            systemInstruction: undefined,
                            rawResponse: response.text,
                            model,
                            inputTokens: usageMetadata?.promptTokenCount,
                            outputTokens: usageMetadata?.candidatesTokenCount,
                            totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
                        }
                    });

                } catch (err) {
                    console.error("Transcription failed:", err);
                    setTranscriptionError("Failed to transcribe audio. Please try again.");
                } finally {
                    setIsTranscribing(false);
                    stream.getTracks().forEach(track => track.stop());
                }
            };
            
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setTranscriptionError("Could not access microphone. Please check permissions.");
        }
    };

    const handleExecCommand = useCallback((command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setContent(editorRef.current.innerHTML, true);
        }
        setIsColorPickerOpen(false);
        setIsFontSizePickerOpen(false);
    }, [setContent]);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }, [content]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML;
        setContent(newContent);
    
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
                const textContent = textNode.textContent;
                const match = textContent.substring(0, range.startOffset).match(/\[\[([^\]]*)$/);
                if (match) {
                    const fullQuery = match[1];
                    const [query, alias] = fullQuery.split('|');
                    const tempRange = document.createRange();
                    tempRange.setStart(textNode, match.index!);
                    tempRange.setEnd(textNode, range.startOffset);
                    
                    if (editorRef.current) {
                        const cardRoot = editorRef.current.closest('.editable-note-card-root');
                        if (!cardRoot) return;

                        const cardRootRect = cardRoot.getBoundingClientRect();
                        const rangeRect = tempRange.getBoundingClientRect();

                        const position = {
                            top: rangeRect.bottom - cardRootRect.top,
                            left: rangeRect.left - cardRootRect.left,
                        };
                        
                        setLinkSearch({ query, alias, range: tempRange, position });
                    }
                    return;
                }
            }
        }
        setLinkSearch(null);
    };

    const escapeHtml = (unsafe: string) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    const insertNexusLink = (targetNote: UserNote) => {
        if (!linkSearch || !editorRef.current) return;
        
        const editor = editorRef.current;
        editor.focus();

        const { range, alias } = linkSearch;
        
        const selection = window.getSelection();
        if (!selection) return;

        selection.removeAllRanges();
        selection.addRange(range);

        const displayText = (alias !== undefined && alias.trim() !== '') ? alias.trim() : targetNote.title;
        const aliasAttr = (alias !== undefined && alias.trim() !== '') ? `data-alias="true"` : '';
        const linkElHtml = `<span class="nexus-link" data-note-id="${targetNote.id}" ${aliasAttr} contenteditable="false">${escapeHtml(displayText)}</span>&nbsp;`;
        
        document.execCommand('insertHTML', false, linkElHtml);

        setLinkSearch(null);
        setContent(editor.innerHTML, true);
    };
    
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('nexus-link')) {
                e.preventDefault();
                const noteId = target.getAttribute('data-note-id');
                if (noteId) {
                    onNavigateToNexusNote(noteId);
                }
            }
        };

        editor.addEventListener('click', handleClick);
        return () => editor.removeEventListener('click', handleClick);
    }, [onNavigateToNexusNote]);
    
    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    return (
        <div className="flex-grow flex flex-col h-full relative editable-note-card-root">
            <div className="flex-shrink-0 p-2 border-b border-gray-700">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-gray-100 outline-none border-none p-2 focus:ring-1 focus:ring-cyan-500 rounded-md"
                    placeholder="Note Title"
                />
            </div>
            <div className="flex items-center p-2 border-b border-gray-700 bg-gray-800/50 flex-shrink-0 gap-1">
                 <button onMouseDown={(e) => e.preventDefault()} onClick={undo} disabled={!canUndo} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded disabled:opacity-50" title="Undo"><UndoIcon className="w-4 h-4"/></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={redo} disabled={!canRedo} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded disabled:opacity-50" title="Redo"><RedoIcon className="w-4 h-4"/></button>
                <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleExecCommand('bold')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Bold"><BoldIcon className="w-4 h-4"/></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleExecCommand('italic')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Italic"><ItalicIcon className="w-4 h-4"/></button>
                <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <div className="relative">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setIsColorPickerOpen(p => !p); setIsFontSizePickerOpen(false); }} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Text Color"><PaletteIcon className="w-4 h-4"/></button>
                    {isColorPickerOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 flex gap-2">
                            {textColors.map(color => <button key={color} onMouseDown={(e) => e.preventDefault()} onClick={() => handleExecCommand('foreColor', color)} className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white" style={{ backgroundColor: color }} />)}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setIsFontSizePickerOpen(p => !p); setIsColorPickerOpen(false); }} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Font Size"><FontSizeIcon className="w-4 h-4"/></button>
                    {isFontSizePickerOpen && (
                        <div className="absolute top-full left-0 mt-1 w-28 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50">
                            {fontSizes.map(size => <button key={size.name} onMouseDown={(e) => e.preventDefault()} onClick={() => handleExecCommand('fontSize', size.value)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded text-sm">{size.name}</button>)}
                        </div>
                    )}
                </div>
                 <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <button
                    onClick={handleStartRecording}
                    disabled={isTranscribing}
                    className={`p-1.5 text-gray-300 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5 text-sm ${isRecording ? 'text-red-400' : ''}`}
                    title={isRecording ? "Stop Recording" : "Start Voice Note"}
                >
                    {isTranscribing ? (
                        <RefreshCw className="w-4 h-4 animate-spin"/>
                    ) : isRecording ? (
                        <StopCircleIcon className="w-4 h-4"/>
                    ) : (
                        <MicrophoneIcon className="w-4 h-4"/>
                    )}
                    {isTranscribing ? 'Transcribing...' : isRecording ? 'Recording...' : null}
                </button>
                <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <button onClick={onAiSelection} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded flex items-center gap-1.5 text-sm" title="Ask AI to edit selected text">
                    <SparkleIcon className="w-4 h-4 text-purple-400"/>
                    Ask AI
                </button>
            </div>
            {transcriptionError && <div className="text-xs text-red-400 px-4 py-1 bg-red-900/50 flex-shrink-0">{transcriptionError}</div>}
            <div className="flex-grow p-4 overflow-y-auto" data-note-id={note.id} onClick={() => editorRef.current?.focus()}>
                <div
                    ref={editorRef}
                    contentEditable={true}
                    onInput={handleEditorInput}
                    suppressContentEditableWarning={true}
                    className="w-full h-full bg-transparent text-gray-200 outline-none resize-none leading-relaxed prose prose-invert prose-sm max-w-none"
                    style={{'--nexus-link-bg': 'rgba(6, 182, 212, 0.15)', '--nexus-link-border': '#0891b2', '--nexus-link-text': '#a5f3fc'} as React.CSSProperties}
                />
            </div>
             {linkSearch && (
                <div 
                    className="absolute bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50 text-white text-sm w-72"
                    style={{
                        top: linkSearch.position.top + 5,
                        left: linkSearch.position.left,
                    }}
                >
                    <input type="text" readOnly value={`[[${linkSearch.query}${linkSearch.alias !== undefined ? '|' + linkSearch.alias : ''}`} className="w-full bg-gray-900 text-gray-400 px-2 py-1 rounded-t-md text-xs outline-none" />
                    <ul className="max-h-48 overflow-y-auto">
                        {linkResults.map(res => (
                            <li key={res.id}>
                                <button onClick={() => insertNexusLink(res)} className="w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded">
                                    <p className="font-semibold truncate">{res.title}</p>
                                    <p className="text-xs text-gray-400 truncate">in: {res.mapNodeName}</p>
                                </button>
                            </li>
                        ))}
                        {linkResults.length === 0 && <li className="px-3 py-1.5 text-gray-500 text-xs italic">No matching notes found</li>}
                    </ul>
                </div>
            )}
            <div className="flex-shrink-0 p-2 border-t border-gray-700 bg-gray-900/70">
                <details className="text-sm">
                    <summary className="cursor-pointer text-gray-400 font-semibold py-1 hover:text-white">
                        Backlinks ({backlinks.length})
                    </summary>
                    <ul className="pl-2 pt-2 max-h-24 overflow-y-auto">
                        {backlinks.length > 0 ? backlinks.map(({ note, context, linkText }) => {
                             const highlightedContext = context.replace(new RegExp(escapeRegExp(linkText), 'i'), `<strong class="text-yellow-300 bg-yellow-500/20 px-1 rounded">${linkText}</strong>`);
                             return (
                                <li key={note.id} className="mb-3 last:mb-0">
                                    <button onClick={() => { onCancel(); onNavigateToNexusNote(note.id); }} className="font-semibold text-cyan-300 hover:underline text-left">
                                        {note.title}
                                    </button>
                                    <p className="text-xs text-gray-500 italic px-2 border-l-2 border-gray-600 ml-1 mt-1" dangerouslySetInnerHTML={{ __html: highlightedContext }} />
                                </li>
                             )
                        }) : <li className="text-xs text-gray-500 italic">No linked mentions found.</li>}
                    </ul>
                </details>
            </div>
            <div className="flex-shrink-0 p-2 border-t border-gray-700 flex justify-between items-center bg-gray-800/50">
                <button onClick={() => onDelete(note.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-md"><Trash2 className="w-4 h-4"/></button>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={() => onSave(note.id, title, editorRef.current?.innerHTML || content)} className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-md">Save & Close</button>
                </div>
            </div>
        </div>
    );
};

export default StudioPanel;