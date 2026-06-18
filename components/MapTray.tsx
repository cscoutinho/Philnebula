
import React, { useState } from 'react';
import type { D3Node } from '../types';
import { X, ChevronRight, BrainCircuit } from './icons';

interface MapTrayProps {
    concepts: D3Node[];
    onRemove: (nodeId: number) => void;
    onAdd: (node: D3Node) => void;
}

const MapTray: React.FC<MapTrayProps> = ({ concepts, onRemove, onAdd }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, node: D3Node) => {
        const simplifiedNode = {
            id: node.id,
            name: node.name,
        };
        e.dataTransfer.setData('application/json', JSON.stringify(simplifiedNode));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <>
            <div className={`absolute top-0 right-0 h-full bg-black/80 backdrop-blur-md border-l border-gray-600 z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-72 flex flex-col`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-600 flex-shrink-0">
                    <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6"/>
                        Map Tray
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
                {concepts.length > 0 ? (
                    <ul className="p-2 overflow-y-auto flex-grow">
                        {concepts.map(node => (
                            <li
                                key={node.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, node)}
                                onDoubleClick={() => onAdd(node)}
                                title="Drag or double-click to add to map"
                                className="group flex justify-between items-center p-2 mb-1.5 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                            >
                                <span className="text-sm text-gray-200 flex-grow">{node.name}</span>
                                <button onClick={() => onRemove(node.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity flex-shrink-0 ml-2">
                                    <X className="w-4 h-4"/>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 text-center text-gray-400 text-sm flex-grow flex flex-col items-center justify-center">
                        <p>Your collected concepts will appear here.</p>
                        <p className="mt-2 text-xs">Go to the Nebula, select a concept, and click "Add to Tray".</p>
                    </div>
                )}
            </div>
            {!isOpen && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 z-30">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="relative bg-cyan-600/90 hover:bg-cyan-500/90 p-2 rounded-l-lg transition-colors"
                        aria-label={`Open Map Tray, ${concepts.length} items`}
                    >
                        <BrainCircuit className="w-6 h-6 text-white"/>
                        {concepts.length > 0 && (
                            <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center pointer-events-none ring-2 ring-black">
                                {concepts.length}
                            </div>
                        )}
                    </button>
                </div>
            )}
        </>
    );
};

export default MapTray;
