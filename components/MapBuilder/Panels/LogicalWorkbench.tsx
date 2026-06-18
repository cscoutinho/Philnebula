import React, { useRef, useEffect } from 'react';
import type { LogicalWorkbenchState } from '../../../types';
import type { FormalizationResult } from '../../../types';
import { SparkleIcon, FlaskConicalIcon, X, PlusCircle } from '../../icons';

interface LogicalWorkbenchProps {
    isOpen: boolean;
    onClose: () => void;
    initialState: LogicalWorkbenchState | null;
    isFormalizing: boolean;
    formalizationResult: FormalizationResult | null;
    selectedFormalizationIndex: number;
    setSelectedFormalizationIndex: (index: number) => void;
    onConfirm: () => void;
    onFormalize: () => void;
}

const LogicalWorkbench: React.FC<LogicalWorkbenchProps> = ({
    isOpen,
    onClose,
    initialState,
    isFormalizing,
    formalizationResult,
    selectedFormalizationIndex,
    setSelectedFormalizationIndex,
    onConfirm,
    onFormalize
}) => {
    const panelRef = React.useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && initialState && panelRef.current) {
            const element = panelRef.current;
            const { innerWidth, innerHeight } = window;
            
            // Initial render might not have correct size, so we guess and then adjust.
            const initialWidth = 700;
            const initialHeight = 500;
            element.style.width = `${initialWidth}px`;
            element.style.height = `${initialHeight}px`;

            let top = initialState.y - initialHeight / 2;
            let left = initialState.x - initialWidth / 2;

            if (left + initialWidth > innerWidth - 10) left = innerWidth - initialWidth - 10;
            if (top + initialHeight > innerHeight - 10) top = innerHeight - initialHeight - 10;
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
    }, [isOpen, initialState]);
    
    useEffect(() => {
        const header = headerRef.current;
        const panel = panelRef.current;
        if (!header || !panel || !isOpen) return;
        
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
    }, [isOpen]);
    
    if (!isOpen || !initialState) return null;

    const renderContent = () => {
        if (isFormalizing) {
            return (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-96">
                   <SparkleIcon className="w-12 h-12 text-teal-400 animate-spin" />
                   <p className="mt-4 text-lg">Formalizing argument...</p>
                </div>
           );
        }

        if (initialState.mode === 'text-to-map' && !formalizationResult) {
            const { deconstructed } = initialState;
            return (
                <div className="p-6 max-h-[70vh] overflow-y-auto flex flex-col">
                    <div className="flex-grow space-y-4">
                        <div>
                            <h4 className="font-semibold text-md text-gray-300 mb-2">Identified Premises</h4>
                            <ul className="space-y-2 text-sm bg-black/30 p-3 rounded-md list-disc list-inside">
                                {deconstructed.premises.map((p, i) => <li key={i} className="text-gray-200">{p}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-md text-gray-300 mb-2">Identified Conclusion</h4>
                            <p className="text-gray-200 text-sm bg-black/30 p-3 rounded-md">{deconstructed.conclusion}</p>
                        </div>
                    </div>
                     <div className="pt-4 border-t border-gray-700 mt-4 flex-shrink-0 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700">Cancel</button>
                        <button onClick={onFormalize} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-md hover:bg-teal-700">Confirm & Formalize</button>
                    </div>
                </div>
            );
        }

        if (formalizationResult) {
             return (
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-md text-gray-300 mb-2">Formalization Choices</h4>
                            <div className="space-y-3">
                                {formalizationResult.choices.map((choice, index) => (
                                    <div key={index} className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${selectedFormalizationIndex === index ? 'bg-teal-900/50 border-teal-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}`} onClick={() => setSelectedFormalizationIndex(index)}>
                                        <div className="flex items-start gap-3">
                                            <input type="radio" name="formalization-choice" checked={selectedFormalizationIndex === index} readOnly className="mt-1.5 form-radio h-4 w-4 bg-gray-900 border-gray-600 text-teal-500 focus:ring-teal-500"/>
                                            <div>
                                                <p className="font-mono text-lg text-teal-200">{choice.formalRepresentation}</p>
                                                <p className="text-xs text-gray-400 mt-1">System: <span className="font-semibold text-gray-300">{choice.suggestedSystem}</span></p>
                                                <p className="text-sm text-gray-300 mt-2">{choice.rationale}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-md text-gray-300 mb-2">Propositions</h4>
                                <ul className="space-y-1 text-sm bg-black/30 p-3 rounded-md">
                                    {formalizationResult.propositions.map((p, i) => (
                                        <li key={`prop-${i}`} className="flex items-baseline gap-2">
                                            <span className="font-mono text-teal-300">{p.variable} =</span>
                                            <span className="text-gray-200">{p.meaning}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-md text-gray-300 mb-2">Structural Critique</h4>
                                <p className="text-gray-200 text-sm bg-black/30 p-3 rounded-md leading-relaxed">{formalizationResult.critique}</p>
                            </div>
                        </div>
                        <div>
                            <button onClick={onConfirm} className="w-full px-4 py-2 bg-teal-600 text-white font-bold rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                                <PlusCircle className="w-5 h-5" />
                                Create Logical Construct on Map
                            </button>
                        </div>
                   </div>
                </div>
            );
        }

        return <div className="p-8 text-center text-gray-400">Analysis failed or returned no results.</div>;
    }

    return (
        <div 
            ref={panelRef} 
            style={{
                opacity: 0,
                position: 'fixed',
                pointerEvents: 'none',
                visibility: 'hidden',
                transition: 'opacity 0.1s ease-out',
            }}
            className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white w-full max-w-xl animate-fade-in flex flex-col"
            onClick={e => e.stopPropagation()}
        >
            <div 
                ref={headerRef}
                className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing"
            >
                <h3 className="text-lg font-bold text-teal-300 flex items-center gap-2"><FlaskConicalIcon/> Logical Workbench</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            {renderContent()}
        </div>
    );
};

export default LogicalWorkbench;