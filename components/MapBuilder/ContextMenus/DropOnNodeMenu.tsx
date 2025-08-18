import React from 'react';
import type { DropOnNodeMenuState, KindleNote } from '../../../types';
import { PlusCircle, MessageSquarePlus } from '../../icons';

interface DropOnNodeMenuProps {
    menuState: DropOnNodeMenuState;
    onAttach: (nodeId: string | number, notes: KindleNote[]) => void;
    onAppend: (nodeId: string | number, notes: KindleNote[]) => void;
    onClose: () => void;
}

const DropOnNodeMenu: React.FC<DropOnNodeMenuProps> = ({ menuState, onAttach, onAppend, onClose }) => {
    return (
        <div 
            className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50 text-white text-sm animate-fade-in" 
            onClick={e => e.stopPropagation()}
        >
            <button 
                onClick={() => { onAttach(menuState.targetNodeId, menuState.droppedNotes); onClose(); }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2"
            >
                <PlusCircle className="w-4 h-4 text-green-400"/> Attach as Source Note
            </button>
            <button 
                onClick={() => { onAppend(menuState.targetNodeId, menuState.droppedNotes); onClose(); }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2"
            >
                <MessageSquarePlus className="w-4 h-4 text-cyan-400"/> Append as Blockquote
            </button>
        </div>
    );
};

export default DropOnNodeMenu;