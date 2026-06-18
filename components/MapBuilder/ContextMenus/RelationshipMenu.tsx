import React from 'react';
import { RelationshipType, RelationshipTypeInfo } from '../../../types';

interface RelationshipMenuProps {
    relationshipMenu: { sourceId: string | number, targetId: string | number, x: number, y: number };
    relationshipTypes: RelationshipTypeInfo[];
    createLink: (sourceId: string | number, targetId: string | number, relationshipTypes: RelationshipType[]) => void;
}

const RelationshipMenu: React.FC<RelationshipMenuProps> = ({ relationshipMenu, relationshipTypes, createLink }) => {
    return (
        <div className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 text-white text-sm animate-fade-in w-64">
            <p className="font-bold mb-2 px-1">Select Relationship Type:</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
                {relationshipTypes.map(relType => (
                    <button
                        key={relType.type}
                        onClick={() => createLink(relationshipMenu.sourceId, relationshipMenu.targetId, [relType.type])}
                        className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-gray-700"
                        title={relType.description}
                    >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: relType.color }}></div>
                        <span>{relType.type}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RelationshipMenu;