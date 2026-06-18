
import { useState, useCallback } from 'react';
import { D3Node, Publication, AppSessionData, TrackedFeed, ProjectActivityType } from '../types';
import * as feedService from '../services/feedService';

export const useFeedManager = (
    activeProjectData: AppSessionData | null,
    updateActiveProjectData: (updater: (d: AppSessionData) => AppSessionData) => void,
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void,
) => {
    const [allPublications, setAllPublications] = useState<Publication[]>([]);
    const [isFeedLoading, setIsFeedLoading] = useState(false);

    const handleAddFeed = useCallback(async (node: D3Node, url: string) => {
        if (!activeProjectData) return;
        if (activeProjectData.trackedFeeds.some(f => f.url === url)) {
            throw new Error("This feed is already being tracked in this project.");
        }

        const newTrackedFeed: TrackedFeed = { id: url, url, nodeId: node.id, nodeName: node.name, error: null, isLoading: true };
        updateActiveProjectData(d => ({...d, trackedFeeds: [...d.trackedFeeds, newTrackedFeed] }));

        try {
            const { publications } = await feedService.fetchSingleFeed(url, node.name);
            const publicationsWithStatus = publications.map(p => ({ ...p, isNew: !new Set(activeProjectData.seenPublicationIds).has(p.link) }));

            setAllPublications(prev => [...publicationsWithStatus, ...prev].sort((a, b) => a.sourceNodeName.localeCompare(b.sourceNodeName)));
            updateActiveProjectData(d => ({...d, trackedFeeds: d.trackedFeeds.map(f => f.url === url ? { ...f, error: null, isLoading: false } : f) }));
            logActivity('ADD_FEED', { conceptName: node.name });
        } catch (error) {
            console.error(`Failed to fetch feed ${url}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateActiveProjectData(d => ({ ...d, trackedFeeds: d.trackedFeeds.map(f => f.url === url ? { ...f, error: errorMessage, isLoading: false } : f) }));
            throw error;
        }
    }, [activeProjectData, updateActiveProjectData, logActivity]);

    const handleRemoveFeed = useCallback((url: string) => {
        updateActiveProjectData(d => ({...d, trackedFeeds: d.trackedFeeds.filter(f => f.url !== url)}));
        setAllPublications(prev => prev.filter(p => p.sourceUrl !== url));
    }, [updateActiveProjectData]);

    const handleRefreshFeeds = useCallback(async (isProjectSwitch = false) => {
        if (!activeProjectData || activeProjectData.trackedFeeds.length === 0) return;
    
        let seenIdsForRefresh = new Set(activeProjectData.seenPublicationIds);
        if (!isProjectSwitch) {
            const currentPublicationLinks = allPublications.map(p => p.link);
            currentPublicationLinks.forEach(link => seenIdsForRefresh.add(link));
            updateActiveProjectData(d => ({ ...d, seenPublicationIds: Array.from(seenIdsForRefresh) }));
        }
    
        setIsFeedLoading(true);
        setAllPublications([]);
    
        const sortedFeeds = [...activeProjectData.trackedFeeds].sort((a, b) => a.nodeName.localeCompare(b.nodeName));
        
        let currentPublications: Publication[] = [];
    
        for (const feed of sortedFeeds) {
            let feedError: string | null = null;
            try {
                const { publications } = await feedService.fetchSingleFeed(feed.url, feed.nodeName);
                const publicationsWithStatus = publications.map(p => ({...p, isNew: !seenIdsForRefresh.has(p.link) }));
                currentPublications.push(...publicationsWithStatus);
            } catch (error) {
                console.error(`Failed to refresh feed ${feed.url}:`, error);
                feedError = error instanceof Error ? error.message : 'Unknown error';
            }
            
            updateActiveProjectData(d => ({
                ...d,
                trackedFeeds: d.trackedFeeds.map(f => f.id === feed.id ? { ...f, error: feedError } : f)
            }));
            
            setAllPublications([...currentPublications].sort((a, b) => a.sourceNodeName.localeCompare(b.sourceNodeName)));
        }
        
        setIsFeedLoading(false);
    }, [activeProjectData, allPublications, updateActiveProjectData]);

    const handleRefreshSingleFeed = useCallback(async (feedId: string) => {
        if (!activeProjectData) return;
        const feedToRefresh = activeProjectData.trackedFeeds.find(f => f.id === feedId);
        if (!feedToRefresh || feedToRefresh.isLoading) return;

        updateActiveProjectData(d => ({...d, trackedFeeds: d.trackedFeeds.map(f => f.id === feedId ? { ...f, isLoading: true, error: null } : f)}));
        try {
            const { publications } = await feedService.fetchSingleFeed(feedToRefresh.url, feedToRefresh.nodeName);
            const publicationsWithStatus = publications.map(p => ({ ...p, isNew: !new Set(activeProjectData.seenPublicationIds).has(p.link) }));

            setAllPublications(prev => [
                ...prev.filter(p => p.sourceUrl !== feedToRefresh.url),
                ...publicationsWithStatus
            ].sort((a, b) => a.sourceNodeName.localeCompare(b.sourceNodeName)));

        } catch (error) {
            console.error(`Failed to refresh single feed ${feedToRefresh.url}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateActiveProjectData(d => ({...d, trackedFeeds: d.trackedFeeds.map(f => f.id === feedId ? { ...f, error: errorMessage } : f) }));
        } finally {
            updateActiveProjectData(d => ({...d, trackedFeeds: d.trackedFeeds.map(f => f.id === feedId ? { ...f, isLoading: false } : f) }));
        }
    }, [activeProjectData, updateActiveProjectData]);

    const handleMarkAsSeen = useCallback((publicationLink: string) => {
        setAllPublications(prev => prev.map(p => (p.link === publicationLink ? { ...p, isNew: false } : p)));
        updateActiveProjectData(d => {
            const newSeen = new Set(d.seenPublicationIds);
            newSeen.add(publicationLink);
            return {...d, seenPublicationIds: Array.from(newSeen)};
        });
    }, [updateActiveProjectData]);

    return {
        allPublications,
        setAllPublications,
        isFeedLoading,
        handleAddFeed,
        handleRemoveFeed,
        handleRefreshFeeds,
        handleRefreshSingleFeed,
        handleMarkAsSeen,
    };
};
