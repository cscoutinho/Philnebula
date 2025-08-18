import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { ProjectActivityType, KindleNote } from '../../../types';
import { X, NoteIcon, DownloadIcon, UndoIcon, RedoIcon, BoldIcon, ItalicIcon, SparkleIcon, Check, PaletteIcon, FontSizeIcon, RefreshCw, CopyIcon, InsertBelowIcon, FlaskConicalIcon, SendIcon } from '../../icons';

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
    initialNotes: string;
    nodeName: string;
    onClose: () => void;
    onUpdateContent: (nodeId: string | number, content: string) => void;
    onLogEdit: (nodeId: string | number) => void;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
    ai: GoogleGenAI;
    analysisMode?: boolean;
    onDeconstruct?: (result: { premises: string[], conclusion: string }) => void;
    sourceNotes?: KindleNote[];
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
        
        const formulaRegex = /(\$[^$]+\$)|((?:\b[A-Z][A-Z0-9_]*|[()~¬])(?:[ \t]*(?:\\(?:rightarrow|leftrightarrow|land|lor)|_\{[^}]+\}|_[A-Z0-9_]+)[ \t]*(?:\(.*\)|[A-Z][A-Z0-9_]*|[()~¬])?)+)/g;
        
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
    initialNotes, 
    nodeName, 
    onClose, 
    onUpdateContent, 
    onLogEdit, 
    logActivity,
    ai,
    analysisMode = false,
    onDeconstruct,
    sourceNotes,
}) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 600, height: 450 });
    const [content, setContent, undo, redo, canUndo, canRedo] = useHistoryState(initialNotes || '<p><br></p>');
    const [madeChanges, setMadeChanges] = useState(false);
    const [aiPrompt, setAiPrompt] = useState<{ text: string, rect: DOMRect, userInput: string } | null>(null);
    const [aiConversation, setAiConversation] = useState<{ range: Range, history: { role: 'user' | 'model', content: string }[] } | null>(null);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [followUpInput, setFollowUpInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isFontSizePickerOpen, setIsFontSizePickerOpen] = useState(false);
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const [analysisText, setAnalysisText] = useState('');
    const [aiConvoPosition, setAiConvoPosition] = useState<{ x: number; y: number } | null>(null);
    const [aiConvoSize, setAiConvoSize] = useState({ width: 448, height: 384 });

    const panelRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const aiToolbarRef = useRef<HTMLDivElement>(null);
    const aiConversationRef = useRef<HTMLDivElement>(null);
    const aiConvoHeaderRef = useRef<HTMLDivElement>(null);
    const savedRange = useRef<Range | null>(null);
    const conversationEndRef = useRef<HTMLDivElement>(null);

    const handleToolbarMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    // Effect to save content automatically
    useEffect(() => {
        if (analysisMode) return;
        const handler = setTimeout(() => {
            if (content !== initialNotes) {
                onUpdateContent(state.nodeId, content);
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [content, initialNotes, onUpdateContent, state.nodeId, analysisMode]);

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
    
    // Effect to sync editor content with history state
    useEffect(() => {
        if (analysisMode) return;
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            const currentSelection = window.getSelection();
            const range = currentSelection && currentSelection.rangeCount > 0 ? currentSelection.getRangeAt(0) : null;
            const startOffset = range?.startOffset;
            const startContainer = range?.startContainer;
            
            editorRef.current.innerHTML = content;

            if(startContainer && startOffset !== undefined) {
                 try {
                    const newRange = document.createRange();
                    newRange.setStart(startContainer, Math.min(startOffset, startContainer.nodeValue?.length ?? 0));
                    newRange.collapse(true);
                    currentSelection?.removeAllRanges();
                    currentSelection?.addRange(newRange);
                } catch(e) {
                    console.warn("Could not restore cursor position after undo/redo.", e);
                }
            }
        }
    }, [content, analysisMode]);

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


    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML;
        cleanupAiInteraction();
        setContent(newContent);
        if (!madeChanges && newContent !== initialNotes) {
            setMadeChanges(true);
        }
    };

    const handleExecCommand = useCallback((command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            setContent(newContent, true);
            if (!madeChanges && newContent !== initialNotes) {
                setMadeChanges(true);
            }
        }
        setIsColorPickerOpen(false);
        setIsFontSizePickerOpen(false);
        cleanupAiInteraction();
    }, [setContent, cleanupAiInteraction, initialNotes, madeChanges]);
    
    const handleClose = useCallback(() => {
        if (!analysisMode && madeChanges) {
            // Final save before closing to catch any non-debounced changes
            onUpdateContent(state.nodeId, content);
            onLogEdit(state.nodeId);
        }
        onClose();
    }, [analysisMode, madeChanges, onLogEdit, onClose, state.nodeId, onUpdateContent, content]);

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
                setIsColorPickerOpen(false);
                setIsFontSizePickerOpen(false);
                setIsDownloadMenuOpen(false);
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
        if (editorRef.current) setContent(editorRef.current.innerHTML, true);
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
    
        setContent(editor.innerHTML, true);
    };
    
    const handleCopy = () => {
        const latestResponse = getLatestModelResponse();
        if (!latestResponse) return;
        navigator.clipboard.writeText(latestResponse).catch(err => {
            console.error('Failed to copy text: ', err);
        });
        cleanupAiInteraction();
    };

    const handleDownload = (format: 'md' | 'txt') => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const fileContent = format === 'txt' ? (tempDiv.textContent || tempDiv.innerText || '') : content;
        const blob = new Blob([fileContent], { type: format === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nodeName.replace(/ /g, '_')}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsDownloadMenuOpen(false);
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

    if (analysisMode) {
        return (
             <div
                ref={panelRef}
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 450 }}
                className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white flex flex-col select-text"
            >
                <div ref={headerRef} className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing flex-shrink-0">
                    <h3 className="text-md font-bold text-cyan-300 flex items-center gap-2 pl-2"><FlaskConicalIcon className="w-5 h-5"/> Argument Analysis Studio</h3>
                    <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><X className="w-5 h-5"/></button>
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
    
    return (
        <div
            ref={panelRef}
            style={{ top: position.y, left: position.x, width: size.width, height: size.height, minWidth: 400, minHeight: 300 }}
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
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <button onMouseDown={handleToolbarMouseDown} onClick={() => setIsDownloadMenuOpen(p => !p)} title="Download" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><DownloadIcon className="w-4 h-4"/></button>
                        {isDownloadMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50">
                                <button onMouseDown={handleToolbarMouseDown} onClick={() => handleDownload('md')} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded text-sm">Save as Markdown</button>
                                <button onMouseDown={handleToolbarMouseDown} onClick={() => handleDownload('txt')} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded text-sm">Save as Plain Text</button>
                            </div>
                        )}
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><X className="w-5 h-5"/></button>
                </div>
            </div>

            <div className="flex items-center p-2 border-b border-gray-700 bg-gray-800/50 flex-shrink-0 gap-1">
                <button onMouseDown={handleToolbarMouseDown} onClick={undo} disabled={!canUndo} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded disabled:opacity-50" title="Undo"><UndoIcon className="w-4 h-4"/></button>
                <button onMouseDown={handleToolbarMouseDown} onClick={redo} disabled={!canRedo} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded disabled:opacity-50" title="Redo"><RedoIcon className="w-4 h-4"/></button>
                <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <button onMouseDown={handleToolbarMouseDown} onClick={() => handleExecCommand('bold')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Bold"><BoldIcon className="w-4 h-4"/></button>
                <button onMouseDown={handleToolbarMouseDown} onClick={() => handleExecCommand('italic')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Italic"><ItalicIcon className="w-4 h-4"/></button>
                <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <div className="relative">
                    <button onMouseDown={handleToolbarMouseDown} onClick={() => { setIsColorPickerOpen(p => !p); setIsFontSizePickerOpen(false); }} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Text Color"><PaletteIcon className="w-4 h-4"/></button>
                    {isColorPickerOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 flex gap-2">
                            {textColors.map(color => <button key={color} onMouseDown={handleToolbarMouseDown} onClick={() => handleExecCommand('foreColor', color)} className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white" style={{ backgroundColor: color }} />)}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button onMouseDown={handleToolbarMouseDown} onClick={() => { setIsFontSizePickerOpen(p => !p); setIsColorPickerOpen(false); }} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded" title="Font Size"><FontSizeIcon className="w-4 h-4"/></button>
                    {isFontSizePickerOpen && (
                        <div className="absolute top-full left-0 mt-1 w-28 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50">
                            {fontSizes.map(size => <button key={size.name} onMouseDown={handleToolbarMouseDown} onClick={() => handleExecCommand('fontSize', size.value)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded text-sm">{size.name}</button>)}
                        </div>
                    )}
                </div>
                <div className="w-px h-5 bg-gray-600 mx-1"></div>
                <button onMouseDown={handleToolbarMouseDown} onClick={handleAiSelection} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded flex items-center gap-1.5 text-sm" title="Ask AI to edit selected text">
                    <SparkleIcon className="w-4 h-4 text-purple-400"/>
                    Ask AI
                </button>
            </div>

            {!analysisMode && sourceNotes && sourceNotes.length > 0 && (
                <div className="flex-shrink-0 p-4 border-b border-gray-700 bg-gray-800/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">Source Note(s) ({sourceNotes.length})</h4>
                    <div className="text-sm text-gray-300 max-h-28 overflow-y-auto pr-2 space-y-3">
                        {sourceNotes.map((note, index) => (
                             <div key={index} className="border-b border-gray-700/50 last:border-b-0 pb-3 last:pb-0">
                                <p className="italic">"{note.text}"</p>
                                <p className="text-right text-xs text-gray-500 mt-1">{note.heading}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-grow p-4 overflow-y-auto" onClick={() => { editorRef.current?.focus(); cleanupAiInteraction(); }}>
                <div
                    ref={editorRef}
                    contentEditable={true}
                    onInput={handleInput}
                    suppressContentEditableWarning={true}
                    className="w-full h-full bg-transparent text-gray-200 outline-none resize-none leading-relaxed prose prose-invert prose-sm max-w-none"
                />
            </div>

            {aiPrompt && !aiConversation && (
                <div ref={aiToolbarRef} style={{ top: aiPrompt.rect.bottom + window.scrollY + 5, left: aiPrompt.rect.left + window.scrollX }} className="fixed z-[60] flex items-center gap-2 p-1 bg-gray-800 border border-gray-600 text-white rounded-lg shadow-lg animate-fade-in">
                    <SparkleIcon className="w-4 h-4 text-purple-400 flex-shrink-0 ml-1" />
                    <input
                        type="text"
                        value={aiPrompt.userInput}
                        onChange={(e) => setAiPrompt(p => p ? {...p, userInput: e.target.value} : null)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        placeholder="Ask AI"
                        className="bg-transparent outline-none text-sm w-48"
                        autoFocus
                    />
                    <button onClick={handleAskAI} disabled={isAiLoading} className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded-md disabled:bg-gray-500">
                        {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                    </button>
                </div>
            )}
            {aiConversation && (
                 <div
                    ref={aiConversationRef}
                    style={{
                        top: aiConvoPosition ? aiConvoPosition.y : 0,
                        left: aiConvoPosition ? aiConvoPosition.x : 0,
                        width: aiConvoSize.width,
                        height: aiConvoSize.height,
                        minWidth: 350,
                        minHeight: 250,
                        visibility: aiConvoPosition ? 'visible' : 'hidden'
                    }}
                    className="fixed z-[60] bg-gray-800 border border-purple-500 rounded-lg shadow-xl animate-fade-in flex flex-col resize overflow-hidden select-text"
                    onMouseUp={() => {
                        if (aiConversationRef.current) {
                            const rect = aiConversationRef.current.getBoundingClientRect();
                            if(rect.width !== aiConvoSize.width || rect.height !== aiConvoSize.height) {
                                setAiConvoSize({ width: rect.width, height: rect.height });
                            }
                        }
                    }}
                >
                    <div ref={aiConvoHeaderRef} className="flex-shrink-0 p-2 flex justify-between items-center border-b border-gray-700 cursor-grab active:cursor-grabbing">
                        <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                            <SparkleIcon className="w-4 h-4"/>
                            AI Assistant
                        </h4>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-3 p-3">
                        {aiConversation.history.map((msg, index) => (
                            <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] prose prose-invert prose-sm break-words rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-purple-800 text-white' : 'bg-gray-700'}`}>
                                    <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.content) }} />
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                             <div className="flex justify-start">
                                <div className="bg-gray-700 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                         <div ref={conversationEndRef} />
                    </div>
                    <div className="flex-shrink-0 border-t border-gray-700">
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={followUpInput}
                                    onChange={(e) => setFollowUpInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleFollowUp(); }}
                                    placeholder="Follow-up..."
                                    disabled={isAiLoading}
                                    className="flex-grow bg-gray-700 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                />
                                <button onClick={handleFollowUp} disabled={isAiLoading || !followUpInput.trim()} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                    <SendIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-3 border-t border-gray-700 bg-gray-900/50 rounded-b-lg">
                            <button onClick={cleanupAiInteraction} className="px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded">Dismiss</button>
                            <button onClick={handleCopy} className="px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded flex items-center gap-1"><CopyIcon className="w-3 h-3"/>Copy</button>
                            <button onClick={handleInsertBelow} className="px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded flex items-center gap-1"><InsertBelowIcon className="w-3 h-3"/>Insert Below</button>
                            <button onClick={handleReplace} className="px-3 py-1 text-xs bg-purple-600 text-white hover:bg-purple-700 rounded flex items-center gap-1"><Check className="w-3 h-3"/>Replace</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudioPanel;