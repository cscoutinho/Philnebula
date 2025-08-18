

import React, { useState, useEffect } from 'react';
import type { D3Node, TrackedFeed } from '../types';
import { PlusCircle, RssIcon, ChevronRight } from './icons';

interface InfoPanelProps {
    node: D3Node | null;
    onFindRelated: () => void;
    isLoading: boolean;
    relatedConcepts: { node: D3Node; justification: string; connectionType: string; confidence: number; }[];
    onConceptSelect: (node: D3Node) => void;
    setHoveredNode: (node: D3Node | null) => void;
    searchAttempted: boolean;
    onAddToMapTray: (node: D3Node) => void;
    onAddFeed: (node: D3Node, url: string) => Promise<void>;
    trackedFeeds: TrackedFeed[];
    nodeIdsWithNewPublications: Set<number>;
    onGoToFeed: () => void;
}

const getConnectionTypeClasses = (type: string): string => {
    switch (type) {
        case 'Historical Influence': return 'bg-blue-400/10 text-blue-300 ring-blue-400/30';
        case 'Conceptual Contrast': return 'bg-red-400/10 text-red-300 ring-red-400/30';
        case 'Shared Problem': return 'bg-purple-400/10 text-purple-300 ring-purple-400/30';
        case 'Methodological Parallel': return 'bg-green-400/10 text-green-300 ring-green-400/30';
        case 'Extends/Refines': return 'bg-yellow-400/10 text-yellow-300 ring-yellow-400/30';
        case 'Provides Foundation For': return 'bg-indigo-400/10 text-indigo-300 ring-indigo-400/30';
        default: return 'bg-gray-400/10 text-gray-300 ring-gray-400/30';
    }
};

const InfoPanel: React.FC<InfoPanelProps> = ({ 
    node, 
    onFindRelated, 
    isLoading, 
    relatedConcepts, 
    onConceptSelect, 
    setHoveredNode, 
    searchAttempted, 
    onAddToMapTray,
    onAddFeed,
    trackedFeeds,
    nodeIdsWithNewPublications,
    onGoToFeed
}) => {
    const [rssUrl, setRssUrl] = useState('');
    const [isAddingFeed, setIsAddingFeed] = useState(false);
    const [addFeedError, setAddFeedError] = useState<string | null>(null);

    useEffect(() => {
        // Reset form when node changes
        setRssUrl('');
        setAddFeedError(null);
        setIsAddingFeed(false);
    }, [node]);

    if (!node) {
        return null;
    }

    const isTracked = trackedFeeds.some(f => f.nodeId === node.id);
    const hasNewPublications = nodeIdsWithNewPublications.has(node.id);

    const handleAddFeedClick = async () => {
        if (!rssUrl) {
            setAddFeedError("URL cannot be empty.");
            return;
        }
        setIsAddingFeed(true);
        setAddFeedError(null);
        try {
            await onAddFeed(node, rssUrl);
            setRssUrl('');
        } catch (error) {
            setAddFeedError(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsAddingFeed(false);
        }
    };

    const getPathNodes = (): D3Node[] => {
        const path: D3Node[] = [];
        let current: D3Node | null = node.parent as D3Node | null;
        while (current && current.parent) { // Exclude the root node
            path.unshift(current);
            current = current.parent as D3Node | null;
        }
        return path;
    };

    const getSiblingNodes = (): D3Node[] => {
        if (!node.parent) return [];
        return (node.parent as D3Node).children
            .filter(c => c.id !== node.id);
    };

    const handleAddAllToTray = () => {
        relatedConcepts.forEach(item => {
            onAddToMapTray(item.node);
        });
    };

    const siblingNodes = getSiblingNodes();
    const displaySiblings = siblingNodes.slice(0, 5);

    return (
        <div 
            id="info-panel" 
            className="absolute bottom-5 left-5 bg-black/70 p-4 rounded-lg border border-gray-600 max-w-md max-h-[80vh] flex flex-col z-10 text-white shadow-lg backdrop-blur-sm"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div className='flex-shrink-0'>
                <h3 className="text-xl font-bold text-yellow-300 mb-2">{node.name}</h3>
                <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                        <span className="font-semibold text-gray-100 mr-2">Path:</span>
                        {getPathNodes().map((pathNode) => (
                            <React.Fragment key={pathNode.id}>
                                <button
                                    onClick={() => onConceptSelect(pathNode)}
                                    className="text-cyan-300 hover:text-cyan-100 hover:underline focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm transition-colors"
                                    aria-label={`Go to category ${pathNode.name}`}
                                >
                                    {pathNode.name}
                                </button>
                                <span className="mx-1.5 text-gray-500 select-none" aria-hidden="true">&gt;</span>
                            </React.Fragment>
                        ))}
                        <span className="text-white font-medium" aria-current="page">{node.name}</span>
                    </div>
                    <p className="text-sm text-gray-300">
                        <span className="font-semibold text-gray-100">Subcategories:</span> {node.children.length}
                    </p>
                    <p className="text-sm text-gray-300">
                        <span className="font-semibold text-gray-100 mr-2">Siblings:</span>
                        {siblingNodes.length > 0 ? (
                            <>
                                {displaySiblings.map((sibling, index) => (
                                    <React.Fragment key={sibling.id}>
                                        <button
                                            onClick={() => onConceptSelect(sibling)}
                                            className="text-cyan-300 hover:text-cyan-100 hover:underline focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm transition-colors"
                                            aria-label={`Go to category ${sibling.name}`}
                                        >
                                            {sibling.name}
                                        </button>
                                        {index < displaySiblings.length - 1 && <span className="text-gray-500">, </span>}
                                    </React.Fragment>
                                ))}
                                {siblingNodes.length > 5 && <span className="text-gray-500">...</span>}
                            </>
                        ) : (
                            <span className="text-gray-400">None</span>
                        )}
                    </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                        onClick={onFindRelated}
                        disabled={isLoading}
                        className="w-full text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    >
                        {isLoading ? 'AI is searching...' : 'Find Related'}
                    </button>
                    <button
                        onClick={() => onAddToMapTray(node)}
                        className="w-full text-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center justify-center gap-2 text-sm"
                        aria-label="Add to Map Tray"
                    >
                         <PlusCircle className="w-4 h-4" />
                         Add to Tray
                    </button>
                </div>
                 <p className="text-xs text-gray-400 mt-2 text-center">
                    Collect concepts in the tray to build your own map.
                </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-600 flex-grow flex flex-col min-h-0">
                <details className="mb-4 flex-shrink-0 group">
                    <summary className="font-bold text-lg text-green-300 flex items-center gap-2 cursor-pointer list-none">
                        <RssIcon className="w-5 h-5"/>
                        Track RSS Feed
                        <ChevronRight className="w-5 h-5 ml-auto text-gray-400 group-open:rotate-90 transition-transform duration-200" />
                    </summary>
                    <div className="pl-7 mt-2">
                        {isTracked ? (
                            <div className={`p-3 bg-green-900/50 border rounded-md text-sm text-green-200 transition-all ${hasNewPublications ? 'border-cyan-400' : 'border-green-500'}`}>
                                <p>This concept is already being tracked in your feed.</p>
                                {hasNewPublications && (
                                    <button
                                        onClick={onGoToFeed}
                                        className="mt-2 flex items-center gap-3 text-left w-full p-2 bg-cyan-600/30 rounded-md hover:bg-cyan-600/50"
                                        aria-label="View new publications in the feed"
                                    >
                                        <span className="relative flex h-3 w-3 flex-shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                                        </span>
                                        <span className="font-bold text-white">View new publications</span>
                                    </button>
                            )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-xs text-gray-400 mb-2">Add a PhilPapers RSS link to track recent publications for this topic.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={rssUrl}
                                        onChange={(e) => setRssUrl(e.target.value)}
                                        placeholder="Paste RSS feed URL here..."
                                        className="flex-grow p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        disabled={isAddingFeed}
                                        aria-label="RSS Feed URL"
                                    />
                                    <button
                                        onClick={handleAddFeedClick}
                                        disabled={isAddingFeed}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                                    >
                                        {isAddingFeed ? 'Adding...' : 'Add'}
                                    </button>
                                </div>
                                {addFeedError && <p className="text-sm text-red-400 mt-2">{addFeedError}</p>}
                            </div>
                        )}
                    </div>
                </details>

                {(isLoading || (searchAttempted && relatedConcepts.length >= 0)) && (
                    <div className="flex-grow overflow-y-auto pr-2">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-lg text-purple-300">Related Concepts</h4>
                            {relatedConcepts.length > 0 && !isLoading && (
                                <button
                                    onClick={handleAddAllToTray}
                                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-cyan-300 bg-purple-900/50 rounded-md hover:bg-purple-800/80 transition-colors"
                                    title="Add all related concepts to the map tray"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>Add All</span>
                                </button>
                            )}
                        </div>
                        {isLoading ? (
                            <p className="text-sm text-gray-300">Searching for connections...</p>
                        ) : (
                            relatedConcepts.length > 0 ? (
                                <ul className="space-y-4">
                                    {relatedConcepts.map(item => {
                                        const typeClasses = getConnectionTypeClasses(item.connectionType);
                                        return (
                                            <li key={item.node.id}>
                                                <div className="flex items-center justify-between group">
                                                    <button
                                                        onClick={() => onConceptSelect(item.node)}
                                                        onMouseEnter={() => setHoveredNode(item.node)}
                                                        onMouseLeave={() => setHoveredNode(null)}
                                                        className="flex-grow text-left p-1 text-base text-cyan-200 rounded-sm hover:text-cyan-100 hover:underline focus:text-cyan-100 focus:underline focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors"
                                                    >
                                                        {item.node.name}
                                                    </button>
                                                    <button
                                                        onClick={() => onAddToMapTray(item.node)}
                                                        className="ml-2 flex-shrink-0 p-1.5 text-gray-400 hover:text-cyan-300 transition-colors rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-purple-800/80"
                                                        aria-label={`Add ${item.node.name} to Map Tray`}
                                                        title="Add to Map Tray"
                                                    >
                                                        <PlusCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="mt-1">
                                                     <span 
                                                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${typeClasses}`}
                                                        title={`Connection Type: ${item.connectionType}`}
                                                    >
                                                        {item.connectionType}
                                                    </span>
                                                    <p className="text-sm text-left text-gray-300 mt-2 leading-relaxed">
                                                        {item.justification}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                searchAttempted && <p className="text-sm text-gray-400">No distinct, high-confidence concepts found.</p>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfoPanel;