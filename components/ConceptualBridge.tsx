
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { D3Node, ProjectActivityType, ParsedMindMapNode, MappingSuggestion, BridgeAnalysis } from '../types';
import * as conceptualBridgeService from '../services/conceptualBridgeService';
import { X, BridgeIcon, RefreshCw, SparkleIcon, UploadCloudIcon, LinkIcon, ChevronDown } from './icons';

interface ConceptualBridgeProps {
    isOpen: boolean;
    onClose: () => void;
    ai: GoogleGenAI;
    allPhilPapersNodes: D3Node[];
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
}

const MindMapNode: React.FC<{ node: ParsedMindMapNode; selectedNodeName: string | null; onSelect: (node: ParsedMindMapNode) => void; level: number; linkedNodeNames: Set<string>; }> = ({ node, selectedNodeName, onSelect, level, linkedNodeNames }) => (
    <div style={{ marginLeft: level * 16 }}>
        <button 
            onClick={() => onSelect(node)}
            className={`w-full text-left p-1.5 rounded-md text-sm flex items-center gap-2 ${node.name === selectedNodeName ? 'bg-cyan-800 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {linkedNodeNames.has(node.name) && <LinkIcon className="w-4 h-4 text-green-400 flex-shrink-0" />}
            <span className="flex-grow">{node.name}</span>
        </button>
        {node.children.map((child, i) => <MindMapNode key={i} node={child} selectedNodeName={selectedNodeName} onSelect={onSelect} level={level + 1} linkedNodeNames={linkedNodeNames} />)}
    </div>
);


const ConceptualBridge: React.FC<ConceptualBridgeProps> = ({ isOpen, onClose, ai, allPhilPapersNodes, logActivity }) => {
    type View = 'idle' | 'parsing' | 'mapping' | 'analyzing' | 'error';
    const [view, setView] = useState<View>('idle');
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedMap, setParsedMap] = useState<ParsedMindMapNode | null>(null);
    const [selectedUserNode, setSelectedUserNode] = useState<ParsedMindMapNode | null>(null);
    const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [linkedNodes, setLinkedNodes] = useState<{ userNodeName: string; philPapersNodeName: string }[]>([]);
    const [analysis, setAnalysis] = useState<BridgeAnalysis | null>(null);

    const handleClose = () => {
        setView('idle');
        setError(null);
        setParsedMap(null);
        setSelectedUserNode(null);
        setSuggestions([]);
        setLinkedNodes([]);
        setAnalysis(null);
        onClose();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setView('parsing');
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64String = (e.target?.result as string).split(',')[1];
                try {
                    const result = await conceptualBridgeService.parseMindMapImage(ai, base64String, file.type);
                    setParsedMap(result);
                    setView('mapping');
                    logActivity('CONCEPTUAL_BRIDGE_IMAGE_PARSE', {fileName: file.name});
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to parse mind map image.");
                    setView('error');
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError("Failed to read file.");
            setView('error');
        }
    };

    const handleUserNodeSelect = async (node: ParsedMindMapNode) => {
        setSelectedUserNode(node);
        setSuggestions([]);
        setIsSuggesting(true);
        try {
            const results = await conceptualBridgeService.getMappingSuggestions(ai, node.name, allPhilPapersNodes);
            setSuggestions(results);
        } catch(err) {
            setError(`Could not fetch suggestions for "${node.name}".`);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleLink = (userNodeName: string, philPapersNodeName: string) => {
        const newLink = { userNodeName, philPapersNodeName };
        if (!linkedNodes.some(l => l.userNodeName === newLink.userNodeName && l.philPapersNodeName === newLink.philPapersNodeName)) {
            setLinkedNodes(prev => [...prev, newLink]);
        }
    };

    const handleAnalysis = async () => {
        if (!parsedMap) return;
        setView('analyzing');
        setError(null);
        try {
            const result = await conceptualBridgeService.getOverallAnalysis(ai, parsedMap, linkedNodes);
            setAnalysis(result);
            logActivity('CONCEPTUAL_BRIDGE_ANALYSIS', { nodeCount: linkedNodes.length });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to perform analysis.");
        } finally {
            setView('mapping'); // Return to mapping view to show analysis
        }
    };
    
    const linkedNodeNames = useMemo(() => new Set(linkedNodes.map(l => l.userNodeName)), [linkedNodes]);

    const renderIdle = () => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <BridgeIcon className="w-20 h-20 text-cyan-400 mb-6"/>
            <h3 className="text-2xl font-bold text-white">Ponte Conceitual</h3>
            <p className="mt-2 text-gray-400 max-w-md">Importe uma imagem do seu mapa mental para conectá-lo com a taxonomia da Nebula e obter insights analíticos da IA.</p>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-8 flex items-center gap-3 px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 transition-colors"
            >
                <UploadCloudIcon className="w-6 h-6"/>
                Importar Imagem do Mapa Mental
            </button>
        </div>
    );
    
    const renderLoading = (message: string) => (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="mt-4 text-lg text-gray-300">{message}</p>
        </div>
    );

    const renderError = () => (
         <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <h3 className="text-2xl font-bold text-red-400">Ocorreu um Erro</h3>
            <p className="mt-2 text-gray-400 max-w-md bg-red-900/50 p-3 rounded-md border border-red-700">{error}</p>
            <button onClick={handleClose} className="mt-6 px-6 py-2 bg-gray-600 rounded-md">Fechar</button>
        </div>
    );

    const renderMapping = () => (
        <div className="flex h-full">
            {/* Left Panel: User's Map */}
            <div className="w-1/3 border-r border-gray-700 flex flex-col p-4">
                <h4 className="text-lg font-bold text-white mb-2 flex-shrink-0">Seu Mapa Mental</h4>
                <div className="flex-grow overflow-y-auto pr-2">
                    {parsedMap && <MindMapNode node={parsedMap} selectedNodeName={selectedUserNode?.name || null} onSelect={handleUserNodeSelect} level={0} linkedNodeNames={linkedNodeNames} />}
                </div>
            </div>

            {/* Middle Panel: Suggestions */}
            <div className="w-1/3 border-r border-gray-700 flex flex-col p-4">
                <h4 className="text-lg font-bold text-white mb-2 flex-shrink-0">Sugestões da Nebula</h4>
                <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                    {isSuggesting ? (
                        <div className="text-gray-400">Buscando conexões...</div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map(sugg => (
                            <div key={sugg.philPapersNodeId} className="p-3 bg-gray-900/50 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-cyan-300">{sugg.philPapersNodeName}</p>
                                    <button onClick={() => handleLink(selectedUserNode!.name, sugg.philPapersNodeName)} className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-500">Ligar</button>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">{sugg.rationale}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500 text-sm italic">{selectedUserNode ? 'Nenhuma sugestão de alta confiança encontrada.' : 'Selecione um nó no seu mapa para ver as sugestões.'}</div>
                    )}
                </div>
            </div>

            {/* Right Panel: Analysis */}
            <div className="w-1/3 flex flex-col p-4">
                <div className="flex-shrink-0">
                    <h4 className="text-lg font-bold text-white mb-2">Análise da IA</h4>
                    <button onClick={handleAnalysis} disabled={!parsedMap} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-500">
                        <SparkleIcon className="w-5 h-5"/>
                        Analisar Mapa Completo
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 mt-4 space-y-4">
                    {analysis ? (
                        <>
                           <details className="group" open>
                                <summary className="font-semibold text-purple-300 cursor-pointer list-none flex items-center gap-1"><ChevronDown className="w-4 h-4 group-open:rotate-0 -rotate-90 transition-transform"/>Conceitos Não Equivalentes</summary>
                                <div className="mt-2 pl-4 border-l-2 border-gray-600 space-y-2">
                                    {analysis.nonEquivalentNodes.map((item, i) => <div key={i} className="text-sm"><p className="font-medium text-gray-200">{item.name}</p><p className="text-gray-400">{item.reason}</p></div>)}
                                </div>
                            </details>
                             <details className="group" open>
                                <summary className="font-semibold text-purple-300 cursor-pointer list-none flex items-center gap-1"><ChevronDown className="w-4 h-4 group-open:rotate-0 -rotate-90 transition-transform"/>Categorias Não Cobertas</summary>
                                <div className="mt-2 pl-4 border-l-2 border-gray-600 space-y-2">
                                    {analysis.uncoveredCategories.map((item, i) => <div key={i} className="text-sm"><p className="font-medium text-gray-200">{item.name}</p><p className="text-gray-400">{item.reason}</p></div>)}
                                </div>
                            </details>
                            <details className="group" open>
                                <summary className="font-semibold text-purple-300 cursor-pointer list-none flex items-center gap-1"><ChevronDown className="w-4 h-4 group-open:rotate-0 -rotate-90 transition-transform"/>Sugestões de Reestruturação</summary>
                                <ul className="list-disc list-inside mt-2 pl-4 space-y-1 text-sm text-gray-300">
                                    {analysis.restructuringAdvice.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </details>
                        </>
                    ) : view === 'analyzing' ? (
                         <div className="text-gray-400">Analisando...</div>
                    ) : (
                        <div className="text-gray-500 text-sm italic">Os resultados da análise aparecerão aqui.</div>
                    )}
                </div>
            </div>
        </div>
    );


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-fade-in" role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-full h-full max-w-6xl text-white flex flex-col relative">
                <button onClick={handleClose} className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full z-10" aria-label="Close Conceptual Bridge">
                    <X className="w-5 h-5"/>
                </button>
                {view === 'idle' && renderIdle()}
                {view === 'parsing' && renderLoading("Analisando e estruturando seu mapa...")}
                {(view === 'mapping' || view === 'analyzing') && renderMapping()}
                {view === 'error' && renderError()}
            </div>
        </div>
    );
};

export default ConceptualBridge;
