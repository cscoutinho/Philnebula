


import { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { D3Node, D3Link, ProjectActivityType } from '../types';
import * as nebulaService from '../services/nebulaService';

export const useNebula = (
    data: { nodes: D3Node[], links: D3Link[] } | null,
    ai: GoogleGenAI,
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void
) => {
    const [selectedNode, setSelectedNode] = useState<D3Node | null>(null);
    const [focusedNode, setFocusedNode] = useState<D3Node | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<D3Node[]>([]);
    const [crossLinks, setCrossLinks] = useState<D3Link[]>([]);
    const [isLoadingCrossLinks, setIsLoadingCrossLinks] = useState(false);
    const [relatedConcepts, setRelatedConcepts] = useState<{ node: D3Node; justification: string; connectionType: string; confidence: number; }[]>([]);
    const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);
    const [searchAttempted, setSearchAttempted] = useState(false);

    useEffect(() => {
        setCrossLinks([]);
        setRelatedConcepts([]);
        setSearchAttempted(false);
    }, [selectedNode]);

    const findRelatedConcepts = useCallback(async () => {
        if (!selectedNode || !data || isLoadingCrossLinks) return;

        setIsLoadingCrossLinks(true);
        setSearchAttempted(true);
        setCrossLinks([]);
        setRelatedConcepts([]);

        try {
            const { rawResponse, data: relatedData, systemInstruction, promptForLogging, model, usageMetadata } = await nebulaService.findRelatedConcepts(ai, selectedNode, data.nodes);

            logActivity('FIND_RELATED', {
                conceptName: selectedNode.name,
                conceptId: selectedNode.id,
                provenance: {
                    prompt: promptForLogging,
                    systemInstruction,
                    rawResponse,
                    model,
                    inputTokens: usageMetadata?.promptTokenCount,
                    outputTokens: usageMetadata?.candidatesTokenCount,
                    totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
                }
            });

            const newRelatedConcepts = relatedData
                .filter(item => item.confidence && item.confidence >= 3)
                .map(item => {
                    const node = data.nodes.find(n => n.name === item.conceptName);
                    if (node) return { node, justification: item.justification, connectionType: item.connectionType, confidence: item.confidence };
                    return null;
                })
                .filter((item): item is { node: D3Node; justification: string; connectionType: string; confidence: number } => !!item)
                .sort((a, b) => b.confidence - a.confidence);
            
            setRelatedConcepts(newRelatedConcepts);

            const newCrossLinks = newRelatedConcepts.map(item => ({
                source: selectedNode.id,
                target: item.node.id,
            }));

            setCrossLinks(newCrossLinks);

        } catch (error) {
            console.error("Error finding related concepts:", error);
        } finally {
            setIsLoadingCrossLinks(false);
        }
    }, [selectedNode, data, isLoadingCrossLinks, ai, logActivity]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        if (data) {
            const lcQuery = query.toLowerCase();
            const foundNodes = data.nodes
                .filter(n => n.name.toLowerCase().includes(lcQuery))
                .sort((a, b) => {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const getScore = (name: string) => {
                        if (name === lcQuery) return 5;
                        const words = name.replace(/[:(),]/g, '').split(/[\s-]+/);
                        if (words.includes(lcQuery)) return 4;
                        if (name.startsWith(lcQuery)) return 3;
                        return 2;
                    };
                    const scoreA = getScore(aName);
                    const scoreB = getScore(bName);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
                    if (a.depth !== b.depth) return a.depth - b.depth;
                    return a.name.localeCompare(b.name);
                })
                .slice(0, 15);
            setSearchResults(foundNodes);
        }
    }, [data]);

    return {
        selectedNode, setSelectedNode,
        focusedNode, setFocusedNode,
        searchQuery, setSearchQuery,
        searchResults, setSearchResults,
        crossLinks, setCrossLinks,
        isLoadingCrossLinks, setIsLoadingCrossLinks,
        relatedConcepts, setRelatedConcepts,
        hoveredNode, setHoveredNode,
        searchAttempted, setSearchAttempted,
        findRelatedConcepts,
        handleSearchChange,
    };
};