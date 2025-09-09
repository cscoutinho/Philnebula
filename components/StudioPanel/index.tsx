import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { ProjectActivityType, KindleNote, UserNote, AppTag } from '../../types';
import { X, NoteIcon, DownloadIcon, UndoIcon, RedoIcon, BoldIcon, ItalicIcon, SparkleIcon, Check, PaletteIcon, FontSizeIcon, RefreshCw, CopyIcon, InsertBelowIcon, FlaskConicalIcon, SendIcon, Plus, BookOpenIcon, StickyNoteIcon, Trash2, MicrophoneIcon, StopCircleIcon, QuoteIcon, ChevronLeft, ChevronRight, LinkIcon } from '../icons';

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
    onNavigateToNote: (noteId: string) => void;
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
    onNavigateToNote,
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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const aiToolbarRef = useRef<HTMLDivElement>(null);
    const aiConversationRef = useRef<HTMLDivElement>(null);
    const aiConvoHeaderRef = useRef<HTMLDivElement>(null);
    const savedRange = useRef<Range | null>(null);
    const conversationEndRef = useRef<HTMLDivElement>(null);
    
    const isNoteTakingMode = !analysisMode;

    const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startSize = size;
        const startPosition = { x: e.clientX, y: e.clientY };

        const onPointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startPosition.x;
            const dy = moveEvent.clientY - startPosition.y;
            setSize({
                width: Math.max(500, startSize.width + dx),
                height: Math.max(400, startSize.height + dy),
            });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp, { once: true });
    }, [size]);

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
        // Robustly remove the blue highlight applied by execCommand('backColor') within the active editor
        const getEditorRoot = (): HTMLElement | null => {
            if (savedRange.current) {
                const common = savedRange.current.commonAncestorContainer as Node;
                const elem = (common.nodeType === Node.ELEMENT_NODE ? (common as Element) : (common.parentElement)) || null;
                return elem ? (elem.closest('[contenteditable="true"]') as HTMLElement | null) : null;
            }
            // Fallback: search within the Studio panel
            return panelRef.current ? (panelRef.current.querySelector('[contenteditable="true"]') as HTMLElement | null) : null;
        };

        const editor = getEditorRoot();
        if (!editor) return;

        try {
            const candidates = editor.querySelectorAll<HTMLElement>('[style*="background-color:"], [style*="background:"], [bgcolor], span, font');
            candidates.forEach(el => {
                // Check inline style first for exact match
                const inline = el.getAttribute('style') || '';
                const hasHex = inline.toLowerCase().includes(`background-color: ${HIGHLIGHT_COLOR_HEX}`);
                const hasRgb = inline.toLowerCase().includes(`background-color: ${HIGHLIGHT_COLOR_RGB}`);
                // Some browsers serialize as rgba(..., 1)
                const hasRgba = inline.toLowerCase().includes('background-color: rgba(58, 110, 255');
                const hasBgShorthand = inline.toLowerCase().includes('background:') && (inline.toLowerCase().includes(HIGHLIGHT_COLOR_HEX) || inline.toLowerCase().includes('58, 110, 255'));
                const hasBgColorAttr = (el as HTMLElement).getAttribute('bgcolor')?.toLowerCase() === HIGHLIGHT_COLOR_HEX;

                if (hasHex || hasRgb || hasRgba || hasBgShorthand || hasBgColorAttr) {
                    el.style.background = '';
                    el.style.backgroundColor = '';
                    if (hasBgColorAttr) el.removeAttribute('bgcolor');
                    // Clean empty style attribute
                    if (el.getAttribute('style') === '') el.removeAttribute('style');
                }
            });
        } catch (e) {
            // Swallow cleanup errors silently; better to leave a harmless highlight than crash
            console.debug('Highlight cleanup skipped:', e);
        }
    }, [panelRef]);

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

    // Cleanup on unmount to ensure no lingering highlight remains if the Studio is closed
    useEffect(() => {
        return () => {
            removeHighlight();
        };
    }, [removeHighlight]);
    
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

    const handleAiRequest = useCallback((text: string, range: Range) => {
        cleanupAiInteraction();
        (document.activeElement as HTMLElement)?.blur();

        // Capture a stable rect BEFORE mutating the DOM with execCommand
        const getRangeRect = (r: Range): DOMRect => {
            const rect = r.getBoundingClientRect();
            if (rect.width || rect.height) return rect;
            const rects = r.getClientRects();
            if (rects.length) return rects[0] as DOMRect;
            // Fallback: insert a temporary marker to measure caret position
            const marker = document.createElement('span');
            marker.style.position = 'absolute';
            marker.style.width = '0';
            marker.style.height = '0';
            const temp = r.cloneRange();
            temp.collapse(true);
            temp.insertNode(marker);
            const mrect = marker.getBoundingClientRect();
            marker.remove();
            return mrect;
        };

        const stableRect = getRangeRect(range);
        savedRange.current = range.cloneRange();
        
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('backColor', false, HIGHLIGHT_COLOR_HEX);
            // Keep the visual selection for positioning, but restore the savedRange
            selection.removeAllRanges();
            selection.addRange(savedRange.current);
        }
        
        setAiPrompt({ text, rect: stableRect, userInput: '' });
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
            const responseText = response.text ?? '';
            
            logActivity('ASK_AI_ASSISTANT', {
                context: analysisMode ? 'Argument Analysis' : nodeName,
                userInstruction,
                selectedText: aiPrompt.text,
                provenance: {
                    prompt: initialPrompt,
                    systemInstruction,
                    rawResponse: responseText,
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
                    { role: 'model', content: responseText }
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
            const responseText = response.text ?? '';

            logActivity('ASK_AI_ASSISTANT', {
                context: analysisMode ? 'Argument Analysis' : nodeName,
                userInstruction: currentInput,
                isFollowUp: true,
                provenance: {
                    prompt: currentInput,
                    systemInstruction: AI_SYSTEM_INSTRUCTION,
                    rawResponse: responseText,
                    model: 'gemini-2.5-flash',
                    inputTokens: response.usageMetadata?.promptTokenCount,
                    outputTokens: response.usageMetadata?.candidatesTokenCount,
                    totalTokens: (response.usageMetadata?.promptTokenCount || 0) + (response.usageMetadata?.candidatesTokenCount || 0),
                }
            });

            const modelMessage = { role: 'model' as const, content: responseText };
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
        const currentEditor = (range.commonAncestorContainer.parentElement as HTMLElement)?.closest('[contenteditable="true"]');
        cleanupAiInteraction();

        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
        document.execCommand('insertHTML', false, simpleMarkdownToHtml(latestResponse));
        if (currentEditor) {
            const noteId = currentEditor.closest('[data-note-id]')?.getAttribute('data-note-id');
            if (noteId) {
                const newContent = currentEditor.innerHTML;
                const note = userNotes.find(n => n.id === noteId);
                if (note) {
                    handleUpdateNote(noteId, note.title, newContent);
                }
            }
        }
    };

    const handleInsertBelow = () => {
        const latestResponse = getLatestModelResponse();
        if (!aiConversation || !latestResponse) return;
        const { range } = aiConversation;
        const currentEditor = (range.commonAncestorContainer.parentElement as HTMLElement)?.closest('[contenteditable="true"]');
        cleanupAiInteraction();
    
        if (currentEditor) {
            const htmlToInsert = `<br>${simpleMarkdownToHtml(latestResponse)}`;
            
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                range.collapse(false);
                sel.addRange(range);
                if (currentEditor instanceof HTMLElement) {
                    currentEditor.focus();
                }
            }
            
            document.execCommand('insertHTML', false, htmlToInsert);
            
            const noteId = currentEditor.closest('[data-note-id]')?.getAttribute('data-note-id');
            if (noteId) {
                const newContent = currentEditor.innerHTML;
                const note = userNotes.find(n => n.id === noteId);
                if (note) {
                    handleUpdateNote(noteId, note.title, newContent);
                }
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
            const text = response.text ?? '{"premises":[],"conclusion":""}';
            const result = JSON.parse(text);
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
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white flex flex-col overflow-hidden select-text"
        >
            <div ref={headerRef} className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing flex-shrink-0">
                <h3 className="text-md font-bold text-cyan-300 flex items-center gap-2 pl-2"><NoteIcon className="w-5 h-5"/> Studio: {nodeName}</h3>
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-grow flex overflow-hidden">
                <div className={`${isSidebarCollapsed ? 'w-12' : 'w-1/3 min-w-[200px]'} border-r border-gray-700 flex flex-col bg-gray-800/50 transition-all duration-300`}>
                    <div className={`flex-shrink-0 p-2 border-b border-gray-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isSidebarCollapsed && (
                            <h4 className="font-semibold text-gray-300 ml-2">Notes</h4>
                        )}
                        <button 
                            onClick={() => setIsSidebarCollapsed(prev => !prev)} 
                            className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-md"
                            aria-label={isSidebarCollapsed ? 'Expand notes panel' : 'Collapse notes panel'}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="flex-grow flex flex-col overflow-hidden">
                            <ul className="flex-grow p-2 space-y-1 overflow-y-auto">
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
                    )}
                </div>

                <div className={`${isSidebarCollapsed ? 'w-full' : 'w-2/3'} flex-grow flex flex-col transition-all duration-300`}>
                    {noteToEdit ? (
                        <EditableNoteCard
                            key={editingNoteId}
                            note={noteToEdit}
                            onSave={(id, title, content) => {
                                const isNewNote = !initialUserNotes.some(n => n.id === id);
                                handleUpdateNote(id, title, content);
                                if (isNewNote) {
                                    logActivity('CREATE_NOTE', { conceptName: nodeName, noteTitle: title });
                                } else {
                                    onLogEdit(state.nodeId, title);
                                }
                            }}
                            onDelete={handleDeleteNote}
                            onClose={onClose}
                            onAiRequest={handleAiRequest}
                            ai={ai}
                            logActivity={logActivity}
                            nodeName={nodeName}
                            allProjectNotes={allProjectNotes}
                            onNavigateToNote={onNavigateToNote}
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
            
            {aiPrompt && !aiConversation && (() => {
                if (!panelRef.current) return null;
                const panelRect = panelRef.current.getBoundingClientRect();
                
                const relativeTop = aiPrompt.rect.top - panelRect.top;
                const relativeLeft = aiPrompt.rect.left - panelRect.left;

                const toolbarWidth = 400;
                const toolbarHeight = 50; 
                let top = relativeTop - toolbarHeight;
                let left = relativeLeft + (aiPrompt.rect.width / 2) - (toolbarWidth / 2);

                if (top < 10) {
                    top = relativeTop + aiPrompt.rect.height + 5;
                }
                if (left < 10) {
                    left = 10;
                }
                if (left + toolbarWidth > size.width - 10) {
                    left = size.width - toolbarWidth - 10;
                }
                
                return (
                    <div
                        ref={aiToolbarRef}
                        className="absolute bg-gray-900 border border-gray-600 rounded-lg shadow-2xl z-50 p-2 flex items-center gap-2 animate-fade-in"
                        style={{
                            top: `${top}px`,
                            left: `${left}px`,
                            width: 400,
                        }}
                    >
                        <input
                            type="text"
                            value={aiPrompt.userInput}
                            onChange={(e) => setAiPrompt(p => p ? { ...p, userInput: e.target.value } : null)}
                            placeholder="e.g., 'Summarize this in one sentence...'"
                            className="flex-grow bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        />
                        <button onClick={handleAskAI} disabled={isAiLoading} className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-500">
                            {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <SparkleIcon className="w-4 h-4"/>}
                        </button>
                        <button onClick={cleanupAiInteraction} className="p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600" aria-label="Cancel AI request">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                );
            })()}

            {aiConversation && (
                <div
                    ref={aiConversationRef}
                    style={{
                        top: aiConvoPosition?.y,
                        left: aiConvoPosition?.x,
                        width: aiConvoSize.width,
                        height: aiConvoSize.height,
                    }}
                    className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col"
                >
                    <div ref={aiConvoHeaderRef} className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-900 rounded-t-lg cursor-grab active:cursor-grabbing">
                        <h4 className="font-bold text-sm flex items-center gap-2"><SparkleIcon className="w-4 h-4 text-purple-400"/> AI Assistant</h4>
                        <button onClick={cleanupAiInteraction} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-3 space-y-4 text-sm">
                        {aiConversation.history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-2 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    {msg.content.split('\n').map((line, j) => <p key={j}>{line}</p>)}
                                </div>
                            </div>
                        ))}
                        {isAiLoading && <div className="text-gray-400 text-center">...</div>}
                        <div ref={conversationEndRef}></div>
                    </div>
                    <div className="p-2 border-t border-gray-700 space-y-2">
                        <div className="flex gap-2">
                            <button onClick={handleReplace} className="flex-grow px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">Replace Selected</button>
                            <button onClick={handleInsertBelow} className="flex-grow px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">Insert Below</button>
                            <button onClick={handleCopy} className="flex-grow px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">Copy</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={followUpInput}
                                onChange={(e) => setFollowUpInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                                placeholder="Follow up..."
                                className="flex-grow bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none"
                            />
                            <button onClick={handleFollowUp} disabled={isAiLoading} className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-500">
                                <SendIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div
                onPointerDown={handleResizePointerDown}
                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-10"
                title="Resize panel"
            >
                <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3 text-gray-500 absolute bottom-1 right-1"
                    aria-hidden="true"
                >
                    <path d="M11 1 L1 11" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 5 L5 11" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 9 L9 11" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
        </div>
    );
};

interface EditableNoteCardProps {
    note: UserNote;
    onSave: (id: string, title: string, content: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    onAiRequest: (text: string, range: Range) => void;
    ai: GoogleGenAI;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
    nodeName: string;
    allProjectNotes: (UserNote & { mapNodeId: string | number; mapNodeName: string; mapId: string; mapName: string; })[];
    onNavigateToNote: (noteId: string) => void;
}

const EditableNoteCard: React.FC<EditableNoteCardProps> = ({ note, onSave, onDelete, onClose, onAiRequest, ai, logActivity, nodeName, allProjectNotes, onNavigateToNote }) => {
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
    const [isJustSaved, setIsJustSaved] = useState(false);
    
    type LinkSearchState = { query: string; range: Range; position: { top: number, left: number } };
    const [linkSearch, setLinkSearch] = useState<LinkSearchState | null>(null);
    
    const [linkEditState, setLinkEditState] = useState<{ target: HTMLSpanElement, rect: DOMRect } | null>(null);
    const [aliasText, setAliasText] = useState('');
    
    const [linkModalState, setLinkModalState] = useState<{ range: Range; existingLink?: HTMLAnchorElement | null } | null>(null);
    const [linkPreviewState, setLinkPreviewState] = useState<{ url: string; rect: DOMRect } | null>(null);


    const handleAiSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editorRef.current?.contains(range.commonAncestorContainer)) {
                const selectedText = range.toString();
                if (!selectedText.trim()) {
                    alert("Please select some text before using 'Ask AI'.");
                    return;
                }
                onAiRequest(selectedText, range);
            } else {
                 alert("Please select text within the Studio editor to use 'Ask AI'.");
            }
        } else {
            alert("Please select some text before using 'Ask AI'.");
        }
    }, [onAiRequest]);

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
                const match = textContent.substring(0, range.startOffset).match(/\[\[([^\][]*)$/);
                if (match) {
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
                        
                        setLinkSearch({ query: match[1], range: tempRange, position });
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
        editor.focus({ preventScroll: true });
    
        const { range } = linkSearch;
        
        const selection = window.getSelection();
        if (!selection) return;

        // Delete the [[ pattern and any partial query text
        range.deleteContents();
        
        // Create the link element
        const displayText = targetNote.title;
        const linkSpan = document.createElement('span');
        linkSpan.className = 'nexus-link';
        linkSpan.setAttribute('data-note-id', targetNote.id.toString());
        linkSpan.setAttribute('contenteditable', 'false');
        linkSpan.textContent = displayText;
        
        // Insert the link at the exact range position
        range.insertNode(linkSpan);
        
        // Add a space after the link for better UX
        const spaceNode = document.createTextNode('\u00A0');
        range.setStartAfter(linkSpan);
        range.insertNode(spaceNode);
        
        // Position cursor after the space
        range.setStartAfter(spaceNode);
        range.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(range);
    
        setLinkSearch(null);
        setContent(editor.innerHTML, true);
    };
    
    // Alias editing logic
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('nexus-link')) {
                e.preventDefault();
                setAliasText(target.textContent || '');
                setLinkEditState({ target, rect: target.getBoundingClientRect() });
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (linkEditState && !(e.target as HTMLElement).closest('.link-edit-popover')) {
                setLinkEditState(null);
            }
            if (linkModalState && !(e.target as HTMLElement).closest('.weblink-modal-popover')) {
                setLinkModalState(null);
            }
            if (linkPreviewState && !(e.target as HTMLElement).closest('.link-preview-popover')) {
                setLinkPreviewState(null);
            }
            
            const nexusLinkTarget = (e.target as HTMLElement).closest('span.nexus-link');
            // FIX: Cast result of closest to HTMLAnchorElement to access href property.
            const webLinkTarget = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.weblink');

            if (webLinkTarget) {
                e.preventDefault();
                setLinkPreviewState({ url: webLinkTarget.href, rect: webLinkTarget.getBoundingClientRect() });
                return;
            }

            if (nexusLinkTarget) {
                e.preventDefault();
                const noteId = nexusLinkTarget.getAttribute('data-note-id');
                if (noteId) {
                    onNavigateToNote(noteId);
                }
            }
        };

        const handleDoubleClick = (e: MouseEvent) => {
            // FIX: Cast result of closest to HTMLAnchorElement to access href property.
            const webLinkTarget = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.weblink');
            if (webLinkTarget) {
                e.preventDefault();
                window.open(webLinkTarget.href, '_blank', 'noopener,noreferrer');
                setLinkPreviewState(null);
            }
        };

        editor.addEventListener('contextmenu', handleContextMenu);
        editor.addEventListener('click', handleClick);
        editor.addEventListener('dblclick', handleDoubleClick);

        return () => {
            if (editor) {
                editor.removeEventListener('contextmenu', handleContextMenu);
                editor.removeEventListener('click', handleClick);
                editor.removeEventListener('dblclick', handleDoubleClick);
            }
        };
    }, [onNavigateToNote, linkEditState, linkModalState, linkPreviewState]);

    const handleUpdateAlias = () => {
        if (!linkEditState || !editorRef.current) return;
    
        const { target: span } = linkEditState;
        const noteId = span.getAttribute('data-note-id');
        const targetNote = allProjectNotes.find(n => n.id === noteId);
    
        if (!targetNote) {
            setLinkEditState(null);
            return;
        }
        
        const newText = aliasText.trim();
        const displayText = newText || targetNote.title;
    
        span.innerHTML = escapeHtml(displayText);
        
        if (displayText !== targetNote.title) {
            span.setAttribute('data-alias', 'true');
        } else {
            span.removeAttribute('data-alias');
        }
    
        setContent(editorRef.current.innerHTML, true);
        setLinkEditState(null);
    };
    
    const handleRemoveLink = () => {
        if (!linkEditState || !editorRef.current) return;
        const { target: span } = linkEditState;
        
        span.replaceWith(document.createTextNode(span.textContent || ''));
    
        editorRef.current.normalize();
        setContent(editorRef.current.innerHTML, true);
        setLinkEditState(null);
    };
    
    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    const handleLinkCommand = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
        const range = selection.getRangeAt(0);

        if (!editorRef.current.contains(range.commonAncestorContainer)) return;

        const parentElement = range.startContainer.parentElement;
        // FIX: Cast result of closest to HTMLAnchorElement to satisfy type of linkModalState.
        const existingLink = parentElement?.closest<HTMLAnchorElement>('a.weblink');
        
        setLinkModalState({ range, existingLink });
    };

    const handleSaveWebLink = (url: string, alias: string, range: Range, existingLink?: HTMLAnchorElement | null) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        if (existingLink) {
            existingLink.href = url;
            existingLink.textContent = alias.trim() || url;
        } else {
            const selectedText = range.toString();
            const text = alias.trim() || selectedText.trim() || url;
            const linkHtml = `<a href="${escapeHtml(url)}" class="weblink" data-weblink="true" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
            document.execCommand('insertHTML', false, linkHtml);
        }
        
        setContent(editorRef.current!.innerHTML, true);
        setLinkModalState(null);
    };
    
    const handleSaveClick = () => {
        if (!editorRef.current) return;
        onSave(note.id, title, editorRef.current.innerHTML);
        setIsJustSaved(true);
        setTimeout(() => setIsJustSaved(false), 2000);
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
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleExecCommand('formatBlock', 'blockquote')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Blockquote"><QuoteIcon className="w-4 h-4"/></button>
                 <button onMouseDown={(e) => e.preventDefault()} onClick={handleLinkCommand} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Add/Edit Web Link"><LinkIcon className="w-4 h-4"/></button>
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
                <button
                    onMouseDown={(e) => { e.preventDefault(); handleAiSelection(); }}
                    className="p-1.5 text-gray-300 hover:bg-gray-700 rounded flex items-center gap-1.5 text-sm"
                    title="Ask AI to edit selected text"
                >
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
            {linkModalState && <WebLinkModal modalState={linkModalState} onClose={() => setLinkModalState(null)} onSave={handleSaveWebLink} />}
            {linkPreviewState && <WebLinkPreview previewState={linkPreviewState} onClose={() => setLinkPreviewState(null)} />}
             {linkSearch && (
                <div 
                    className="absolute bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50 text-white text-sm w-72"
                    style={{
                        top: linkSearch.position.top + 5,
                        left: linkSearch.position.left,
                    }}
                >
                    <input type="text" readOnly value={`[[${linkSearch.query}`} className="w-full bg-gray-900 text-gray-400 px-2 py-1 rounded-t-md text-xs outline-none" />
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
            {linkEditState && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        top: linkEditState.rect.bottom + 5, 
                        left: linkEditState.rect.left 
                    }}
                    className="bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 w-64 space-y-2 animate-fade-in link-edit-popover"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <p className="text-xs font-bold text-gray-400 px-1">Edit Link</p>
                    <div>
                        <label className="text-xs text-gray-300 px-1">Display Text</label>
                        <input 
                            type="text" 
                            value={aliasText}
                            onChange={e => setAliasText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateAlias(); if (e.key === 'Escape') setLinkEditState(null); }}
                            autoFocus
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <button onClick={handleRemoveLink} className="p-1 text-gray-400 hover:text-red-400" title="Remove Link"><Trash2 className="w-4 h-4" /></button>
                        <div className="flex gap-2">
                            <button onClick={() => setLinkEditState(null)} className="px-2 py-1 text-xs bg-gray-600 rounded">Cancel</button>
                            <button onClick={handleUpdateAlias} className="px-2 py-1 text-xs bg-cyan-600 text-white rounded">Save</button>
                        </div>
                    </div>
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
                                    <button onClick={() => { onClose(); onNavigateToNote(note.id); }} className="font-semibold text-cyan-300 hover:underline text-left">
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
                    <button onClick={onClose} className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Close</button>
                    <button
                        onClick={handleSaveClick}
                        disabled={isJustSaved}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center min-w-[80px] ${
                            isJustSaved 
                                ? 'bg-green-600 text-white' 
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                    >
                        {isJustSaved ? (
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4"/>
                                Saved!
                            </span>
                        ) : (
                            'Save'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const WebLinkModal: React.FC<{
    modalState: { range: Range, existingLink?: HTMLAnchorElement | null };
    onClose: () => void;
    onSave: (url: string, alias: string, range: Range, existingLink?: HTMLAnchorElement | null) => void;
}> = ({ modalState, onClose, onSave }) => {
    const [url, setUrl] = useState('');
    const [alias, setAlias] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modalState.existingLink) {
            setUrl(modalState.existingLink.href);
            setAlias(modalState.existingLink.textContent || '');
        } else {
            setUrl('https://');
            setAlias(modalState.range.toString());
        }
    }, [modalState]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(url, alias, modalState.range, modalState.existingLink);
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-50 weblink-modal-popover" onMouseDown={onClose}>
            <div ref={modalRef} className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 w-96 space-y-4 animate-fade-in" onMouseDown={e => e.stopPropagation()}>
                <h4 className="font-bold text-lg">{modalState.existingLink ? 'Edit Web Link' : 'Add Web Link'}</h4>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="weblink-url" className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                        <input id="weblink-url" type="url" value={url} onChange={e => setUrl(e.target.value)} required autoFocus className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="weblink-alias" className="block text-sm font-medium text-gray-300 mb-1">Display Text (optional)</label>
                        <input id="weblink-alias" type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="Enter alias..." className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm"/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 bg-gray-600 rounded">Cancel</button>
                        <button type="submit" className="px-3 py-1.5 bg-cyan-600 text-white rounded">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const WebLinkPreview: React.FC<{
    previewState: { url: string, rect: DOMRect };
    onClose: () => void;
}> = ({ previewState, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsLoading(true);
    }, [previewState.url]);
    
    useEffect(() => {
        const popover = popoverRef.current;
        if (!popover) return;
        
        const { innerWidth, innerHeight } = window;
        let top = previewState.rect.bottom + 10;
        let left = previewState.rect.left;

        const popoverRect = popover.getBoundingClientRect();
        if (top + popoverRect.height > innerHeight) {
            top = previewState.rect.top - popoverRect.height - 10;
        }
        if (left + popoverRect.width > innerWidth) {
            left = innerWidth - popoverRect.width - 10;
        }
        if (left < 10) left = 10;

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
    }, [previewState.rect]);

    return (
        <div ref={popoverRef} className="link-preview-popover animate-fade-in" onMouseDown={e => e.stopPropagation()}>
            <iframe
                src={previewState.url}
                title="Web Link Preview"
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
            />
            <div className="preview-footer">
                {isLoading ? 'Loading preview...' : 'Some sites may not load due to security settings.'}
            </div>
        </div>
    );
};

export default StudioPanel;
