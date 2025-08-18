

import React, { useRef, useEffect } from 'react';
import type { DefinitionAnalysisState, DefinitionResult, CounterExampleResult } from '../../../types';
import { X, BookOpenIcon, SparkleIcon, PlusCircle, RefreshCw } from '../../icons';

interface DefinitionAnalysisPanelProps {
    state: DefinitionAnalysisState | null;
    onClose: () => void;
    onHuntForCounterExamples: (definition: DefinitionResult) => void;
    onAddCounterExampleNode: (item: CounterExampleResult, definition: DefinitionResult) => void;
}

const DefinitionAnalysisPanel: React.FC<DefinitionAnalysisPanelProps> = ({
    state,
    onClose,
    onHuntForCounterExamples,
    onAddCounterExampleNode,
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (state && panelRef.current) {
            const element = panelRef.current;
            const { innerWidth, innerHeight } = window;
            const elementRect = element.getBoundingClientRect();

            let top = state.y - 100;
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

    const { sourceNodeName, loadingState, definitions, counterExamples, error } = state;

    return (
        <div
            ref={panelRef}
            style={{ opacity: 0, position: 'fixed', pointerEvents: 'none', visibility: 'hidden', transition: 'opacity 0.1s ease-out' }}
            className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white w-full max-w-lg animate-fade-in flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
        >
            <div ref={headerRef} className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing">
                <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2"><BookOpenIcon /> Definition Analysis: {sourceNodeName}</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 overflow-y-auto">
                {loadingState === 'loadingDefinitions' && (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-64">
                        <SparkleIcon className="w-12 h-12 text-amber-400 animate-spin" />
                        <p className="mt-4 text-lg">Fetching definitions...</p>
                    </div>
                )}
                {error && <p className="text-red-400 p-4">{error}</p>}
                {loadingState !== 'loadingDefinitions' && definitions.length === 0 && !error && (
                    <div className="p-8 text-center text-gray-400">No definitions found.</div>
                )}
                {definitions.length > 0 && (
                    <ul className="space-y-4">
                        {definitions.map((def, i) => {
                            const examples = counterExamples.get(def);
                            const isHunting = loadingState === 'loadingCounterExamples' && examples?.length === 0 && counterExamples.has(def);
                            
                            return (
                                <li key={i} className="bg-gray-800/50 p-4 rounded-lg">
                                    <div className="font-semibold text-gray-100">{def.source}</div>
                                    <p className="text-sm text-gray-300 italic mt-1">"{def.summary}"</p>
                                    <div className="mt-3">
                                        <button 
                                            onClick={() => onHuntForCounterExamples(def)} 
                                            disabled={isHunting || !!examples}
                                            className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-1.5"
                                        >
                                            {isHunting ? <RefreshCw className="w-3 h-3 animate-spin"/> : <SparkleIcon className="w-3 h-3"/>}
                                            {isHunting ? 'Hunting...' : 'Hunt for Counter-Examples'}
                                        </button>
                                    </div>
                                    {examples && examples.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                                            {examples.map((ex, j) => (
                                                <div key={j} className="group p-2 bg-red-900/20 rounded-md">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-semibold text-red-200 flex-grow pr-2">{ex.counterExample}</p>
                                                        <button onClick={() => onAddCounterExampleNode(ex, def)} title="Add to Map" className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-red-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <PlusCircle className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">{ex.justification}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                     {examples && examples.length === 0 && !isHunting && (
                                         <p className="text-xs text-gray-500 mt-2">No strong counter-examples found for this definition.</p>
                                     )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DefinitionAnalysisPanel;