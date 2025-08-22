

import React, { useMemo, useState, useEffect } from 'react';
import { TrackedFeed, Publication, ProjectActivityType } from '../types';
import { X, RssIcon, RefreshCw, BrainCircuit, GraduationCapIcon } from './icons';

interface FeedPageProps {
    trackedFeeds: TrackedFeed[];
    publications: Publication[];
    isLoading: boolean;
    onRemoveFeed: (url: string) => void;
    onRefreshFeeds: () => void;
    onRefreshSingleFeed: (feedId: string) => void;
    onMarkAsSeen: (link: string) => void;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
    onAnalyzeResearch: (feed: TrackedFeed) => void;
}

const FeedPage: React.FC<FeedPageProps> = ({ trackedFeeds, publications, isLoading, onRemoveFeed, onRefreshFeeds, onRefreshSingleFeed, onMarkAsSeen, logActivity, onAnalyzeResearch }) => {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, feed: TrackedFeed } | null>(null);
    const [selectedFeedUrl, setSelectedFeedUrl] = useState<string | null>(null);
    
    const sortedTrackedFeeds = useMemo(() => {
        return [...trackedFeeds].sort((a, b) => a.nodeName.localeCompare(b.nodeName));
    }, [trackedFeeds]);

    const selectedFeed = useMemo(() => {
        return selectedFeedUrl ? trackedFeeds.find(f => f.url === selectedFeedUrl) : null;
    }, [selectedFeedUrl, trackedFeeds]);

    const filteredPublications = useMemo(() => {
        if (!selectedFeedUrl) {
            return publications;
        }
        return publications.filter(p => p.sourceUrl === selectedFeedUrl);
    }, [selectedFeedUrl, publications]);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        window.addEventListener('contextmenu', handleClick, { capture: true });

        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('contextmenu', handleClick, { capture: true });
        };
    }, []);

    const handleContextMenu = (e: React.MouseEvent, feed: TrackedFeed) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, feed });
    };

    return (
        <div className="w-full h-full bg-gray-900 text-white px-8 pb-8 pt-24 flex flex-col gap-8">
            <header className="flex-shrink-0">
                <h1 className="text-4xl font-bold text-cyan-300 mb-4 flex items-center gap-3">
                    <RssIcon className="w-10 h-10" />
                    Publications Feed
                </h1>
                <p className="text-gray-400 max-w-2xl">
                    This is your unified feed of the latest publications from the concepts you are tracking. Add more concepts from the Nebula view.
                </p>
            </header>

            <main className="flex-grow flex gap-8 overflow-hidden">
                {/* Left Panel for Managing Feeds */}
                <aside className="w-1/3 flex flex-col gap-4 flex-shrink-0">
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex-grow flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-yellow-300">Tracked Concepts ({trackedFeeds.length})</h2>
                            <button
                                onClick={onRefreshFeeds}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-black rounded-md hover:bg-yellow-400 disabled:bg-gray-500 disabled:text-white disabled:cursor-not-allowed transition-colors text-sm font-bold"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                {isLoading ? 'Refreshing' : 'Refresh All'}
                            </button>
                        </div>
                        {sortedTrackedFeeds.length > 0 ? (
                            <ul className="flex-grow space-y-2 overflow-y-auto -mr-2 pr-2">
                                <li>
                                    <button
                                        onClick={() => setSelectedFeedUrl(null)}
                                        className={`w-full text-left p-3 rounded-md transition-colors flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${!selectedFeedUrl ? 'bg-cyan-800/80' : 'bg-gray-900/70 hover:bg-gray-700/80'}`}
                                        aria-pressed={!selectedFeedUrl}
                                    >
                                        <RssIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                        <span className="text-base text-cyan-200 font-bold">All Publications</span>
                                    </button>
                                </li>
                                <hr className="border-gray-700 my-2" />
                                {sortedTrackedFeeds.map(feed => {
                                    const isSelected = selectedFeedUrl === feed.url;
                                    return (
                                        <li key={feed.id} onContextMenu={(e) => handleContextMenu(e, feed)} className="rounded-md">
                                            <div className="group relative flex items-center">
                                                <button
                                                    onClick={() => setSelectedFeedUrl(feed.url)}
                                                    className={`w-full text-left p-3 rounded-md transition-colors flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isSelected ? 'bg-cyan-800/50' : 'bg-gray-900/70 hover:bg-gray-700/80'}`}
                                                    aria-label={`View feed for ${feed.nodeName}`}
                                                    aria-pressed={isSelected}
                                                >
                                                    {feed.isLoading ? (
                                                        <RefreshCw className="w-5 h-5 text-yellow-400 flex-shrink-0 animate-spin" />
                                                    ) : (
                                                        <BrainCircuit className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                                    )}
                                                    <span className="text-base text-cyan-200">{feed.nodeName}</span>
                                                </button>
                                                <button
                                                    onClick={() => onRemoveFeed(feed.url)}
                                                    className="absolute right-2 p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity rounded-full hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    aria-label={`Remove feed for ${feed.nodeName}`}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {feed.error && (
                                                <p className="text-xs text-red-400 mt-1.5 px-3" role="alert">
                                                    <strong>Error:</strong> {feed.error}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 text-sm text-center">
                                <RssIcon className="w-12 h-12 mb-4 text-gray-600" />
                                <p className="font-semibold">No concepts are being tracked yet.</p>
                                <p className="mt-1">Select a concept in the Nebula view to add its RSS feed.</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Right Panel for Displaying Publications */}
                <section className="w-2/3 bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
                     <div className="flex-shrink-0 mb-6 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{selectedFeed ? selectedFeed.nodeName : 'All Publications'}</h2>
                            <p className="text-sm text-gray-400">
                                {selectedFeed 
                                    ? `Showing ${filteredPublications.length} most recent items.` 
                                    : `Showing ${filteredPublications.length} most recent items from ${trackedFeeds.length} tracked concepts.`}
                            </p>
                        </div>
                        {selectedFeed && (
                            <button
                                onClick={() => onAnalyzeResearch(selectedFeed)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors text-sm font-bold"
                            >
                                <GraduationCapIcon className="w-5 h-5" />
                                Area Overview
                            </button>
                        )}
                    </div>
                    <div className="flex-grow overflow-y-auto -mr-3 pr-3">
                        {isLoading && filteredPublications.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <RefreshCw className="w-8 h-8 animate-spin mr-4" />
                                <p className="text-xl">Fetching publications...</p>
                            </div>
                        ) : filteredPublications.length > 0 ? (
                            <ul className="space-y-6">
                                {filteredPublications.map((pub, index) => (
                                    <li key={`${pub.link}-${index}`} className="border-b border-gray-700 pb-6 last:border-b-0">
                                        {selectedFeedUrl === null && <p className="text-xs text-green-300 font-semibold mb-1">{pub.sourceNodeName}</p>}
                                        <div className="flex items-center gap-3">
                                            {pub.isNew && (
                                                <span 
                                                    className="flex-shrink-0 w-2.5 h-2.5 bg-cyan-400 rounded-full" 
                                                    title="New publication" 
                                                    aria-label="New">
                                                </span>
                                            )}
                                            <a
                                                href={pub.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-lg font-bold text-cyan-200 hover:underline"
                                                onClick={() => {
                                                    onMarkAsSeen(pub.link);
                                                    logActivity('VIEW_PUBLICATION', {
                                                        publicationTitle: pub.title,
                                                        publicationLink: pub.link,
                                                        sourceNodeName: pub.sourceNodeName,
                                                    });
                                                }}
                                            >
                                                {pub.title}
                                            </a>
                                        </div>
                                        {pub.author && (
                                            <p className="text-sm text-gray-300 mt-2">
                                                by <span className="font-medium text-gray-100">{pub.author}</span>
                                            </p>
                                        )}
                                        {pub.publicationInfo && (
                                            <p className="text-sm text-gray-400 mt-1 italic">
                                                {pub.publicationInfo}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-center">
                                <div>
                                    <h2 className="text-2xl font-bold">No Publications Found</h2>
                                     <p className="mt-2">
                                        {selectedFeedUrl 
                                            ? 'This feed might be empty or is having trouble loading. Try refreshing it.' 
                                            : 'Add some RSS feeds from the Nebula view and click "Refresh All" to see publications.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            {contextMenu && (
                <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="absolute z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 text-white text-sm animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            if (contextMenu.feed) {
                                onRefreshSingleFeed(contextMenu.feed.id);
                            }
                            setContextMenu(null);
                        }}
                        disabled={contextMenu.feed.isLoading}
                        className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Update Concept</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FeedPage;