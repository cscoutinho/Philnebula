
import React from 'react';
import type { D3Node } from '../types';

interface SearchResultsDropdownProps {
    results: D3Node[];
    onSelect: (node: D3Node) => void;
}

const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({ results, onSelect }) => {
    return (
        <div 
            className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto z-30"
            role="listbox"
        >
            <ul>
                {results.map(node => (
                    <li key={node.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(node)}
                            className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
                            role="option"
                            aria-selected="false"
                        >
                            {node.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SearchResultsDropdown;