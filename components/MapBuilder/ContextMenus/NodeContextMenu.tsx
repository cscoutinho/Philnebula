

import React from 'react';
import type { MapNode } from '../../../types';
import { LinkIcon, HistoryIcon, ReplaceIcon, PaletteIcon, Trash2, NoteIcon } from '../../icons';

interface NodeContextMenuProps {
    nodeContextMenu: { x: number; y: number; nodeId: number | string; };
    node: MapNode | undefined;
    isAnalyzingGenealogy: boolean;
    setLinkingNode: (id: string | number) => void;
    setNodeContextMenu: (state: null) => void;
    handleAnalyzeGenealogy: (id: string | number) => void;
    setChangingNodeState: (state: { nodeId: string | number; x: number; y: number; }) => void;
    setColorPicker: (state: { x: number; y: number; nodeId: string | number; }) => void;
    updateNodeShape: (id: string | number, shape: 'rect' | 'circle') => void;
    deleteNode: (id: string | number) => void;
    onEditNote: (nodeId: string | number) => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
    nodeContextMenu,
    node,
    isAnalyzingGenealogy,
    setLinkingNode,
    setNodeContextMenu,
    handleAnalyzeGenealogy,
    setChangingNodeState,
    setColorPicker,
    updateNodeShape,
    deleteNode,
    onEditNote,
}) => {
    if (!node) return null;

    return (
        <div className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50 text-white text-sm animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setLinkingNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2"><LinkIcon className="w-4 h-4"/>Create Link</button>
            <div className="my-1 border-t border-gray-700"></div>
             <button onClick={() => { onEditNote(nodeContextMenu.nodeId); setNodeContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2"><NoteIcon className="w-4 h-4"/>Open Notes Studio</button>
            <button onClick={() => handleAnalyzeGenealogy(nodeContextMenu.nodeId)} disabled={isAnalyzingGenealogy} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <HistoryIcon className="w-4 h-4"/>
                {isAnalyzingGenealogy ? 'Analyzing...' : 'Analyze Genealogy'}
            </button>
            <button 
                onClick={() => {
                    setChangingNodeState({ nodeId: nodeContextMenu.nodeId, x: nodeContextMenu.x, y: nodeContextMenu.y });
                    setNodeContextMenu(null);
                }} 
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2 disabled:opacity-50"
            >
                <ReplaceIcon className="w-4 h-4"/>Change Concept
            </button>
            {node.isUserDefined && (
                <button onClick={() => { setColorPicker({ x: nodeContextMenu.x, y: nodeContextMenu.y, nodeId: nodeContextMenu.nodeId }); setNodeContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                    <PaletteIcon className="w-4 h-4"/>Change Text Color
                </button>
            )}
            <div className="my-1 border-t border-gray-700"></div>
            <button onClick={() => { updateNodeShape(nodeContextMenu.nodeId, node.shape === 'rect' ? 'circle' : 'rect'); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded">Toggle Shape</button>
            <div className="my-1 border-t border-gray-700"></div>
            <button onClick={() => deleteNode(nodeContextMenu.nodeId)} className="block w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/20 rounded flex items-center gap-2"><Trash2 className="w-4 h-4"/>Delete Node</button>
        </div>
    );
};

export default NodeContextMenu;