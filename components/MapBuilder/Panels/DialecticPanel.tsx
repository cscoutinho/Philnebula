import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { AnalysisResult, Counterargument, DialecticAnalysisState, KeyVoice } from '../../../types';
import { SparkleIcon, ScaleIcon, X, PlusCircle } from '../../icons';

interface DialecticPanelProps {
    state: DialecticAnalysisState | null;
    onClose: () => void;
    isAnalyzing: boolean;
    analysisResult: AnalysisResult | null;
    onAddNode: (item: Counterargument | KeyVoice, type: 'counter' | 'proponent' | 'opponent') => void;
}

const DialecticPanel: React.FC<DialecticPanelProps> = ({
    state,
    onClose,
    isAnalyzing,
    analysisResult,
    onAddNode
}) => {
    const panelRef = React.useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (state && panelRef.current) {
            const element = panelRef.current;
            const { innerWidth, innerHeight } = window;
            const elementRect = element.getBoundingClientRect();

            let top = state.y - elementRect.height / 2;
            let left = state.x - elementRect.width / 2;

            if (left + elementRect.width > innerWidth - 10) left = innerWidth - elementRect.width - 10;
            if (top + elementRect.height > innerHeight - 10) top = innerHeight - elementRect.height - 10;
            if (left < 10) left = 10;
            if (top < 10) top = 10;
            
            element.style.top = `${top}px`;
            element.style.left = `${left}px`;
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
            element.style.visibility = 'visible';
        } else if (panelRef.current) {
            panelRef.current.style.opacity = '0';
            panelRef.current.style.pointerEvents = 'none';
            panelRef.current.style.visibility = 'hidden';
        }
    }, [state]);

    useEffect(() => {
        const header = headerRef.current;
        const panel = panelRef.current;
        if (!header || !panel || !state) return;
        
        let initialX: number, initialY: number, panelX: number, panelY: number;

        const onPointerMove = (e: PointerEvent) => {
            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            panel.style.left = `${panelX + dx}px`;
            panel.style.top = `${panelY + dy}px`;
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            initialX = e.clientX;
            initialY = e.clientY;
            const rect = panel.getBoundingClientRect();
            panelX = rect.left;
            panelY = rect.top;
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp, { once: true });
        };

        header.addEventListener('pointerdown', onPointerDown);

        return () => {
            header.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [state]);

    if (!state) return null;

    return (
        <div 
            ref={panelRef} 
            style={{
                opacity: 0,
                position: 'fixed',
                pointerEvents: 'none',
                visibility: 'hidden',
                transition: 'opacity 0.1s ease-out'
            }}
            className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white w-full max-w-lg animate-fade-in flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
        >
            <div 
                ref={headerRef}
                className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing"
            >
                <h3 className="text-lg font-bold text-lime-300 flex items-center gap-2"><ScaleIcon/> Dialectic Engine</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            {isAnalyzing ? (
                 <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-64">
                    <SparkleIcon className="w-12 h-12 text-lime-400 animate-spin" />
                    <p className="mt-4 text-lg">Analyzing argument...</p>
                 </div>
            ) : analysisResult ? (
                <div className="p-4 overflow-y-auto">
                   <div className="mb-4">
                        <h4 className="font-semibold text-md text-red-400 mb-2">Potential Counterarguments</h4>
                        <ul className="space-y-3">
                            {analysisResult.counterarguments.map((counter, i) => (
                                <li key={`counter-${i}`} className="group p-3 bg-red-900/20 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-gray-100 flex-grow pr-2">{counter.title}</p>
                                        <button onClick={() => onAddNode(counter, 'counter')} title="Add to Map" className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-red-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><PlusCircle className="w-4 h-4"/></button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{counter.description}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-md text-cyan-300 mb-2">Key Voices in the Discourse</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h5 className="font-bold text-green-400 text-sm mb-2">Proponents</h5>
                                <ul className="space-y-2">
                                    {analysisResult.keyVoices.proponents.map((voice, i) => (
                                        <li key={`pro-${i}`} className="group p-2 bg-green-900/20 rounded-md">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-gray-100">{voice.name}</p>
                                                <button onClick={() => onAddNode(voice, 'proponent')} title="Add to Map" className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-green-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><PlusCircle className="w-4 h-4"/></button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{voice.relevance}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                             <div>
                                <h5 className="font-bold text-red-400 text-sm mb-2">Opponents</h5>
                                <ul className="space-y-2">
                                    {analysisResult.keyVoices.opponents.map((voice, i) => (
                                        <li key={`opp-${i}`} className="group p-2 bg-red-900/20 rounded-md">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-gray-100">{voice.name}</p>
                                                <button onClick={() => onAddNode(voice, 'opponent')} title="Add to Map" className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-red-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><PlusCircle className="w-4 h-4"/></button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{voice.relevance}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="p-8 text-center text-gray-400">Analysis failed or returned no results.</div>
            )}
        </div>
    );
};

export default DialecticPanel;