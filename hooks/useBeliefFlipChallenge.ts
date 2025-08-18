import { useState, useCallback } from 'react';
import { AppSessionData, ChallengeSession, ChallengeStep, D3Node, ProjectActivityType, SuggestedConcept } from '../types';
import * as dialecticService from '../services/dialecticService';
import { GoogleGenAI } from '@google/genai';

export const useBeliefFlipChallenge = (
    ai: GoogleGenAI,
    activeProjectData: AppSessionData | null,
    updateActiveProjectData: (updater: (d: AppSessionData) => AppSessionData) => void,
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void,
    allNodes: D3Node[] | null
) => {
    const [activeChallenge, setActiveChallenge] = useState<ChallengeSession | null>(null);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [isBuildingPath, setIsBuildingPath] = useState(false);
    const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);

    const startChallenge = useCallback(async (belief: string, initialConfidence: number, sourceNodeIds: (string | number)[] = []) => {
        if (!allNodes) return;
        
        const loadingSession: ChallengeSession = {
            id: `challenge_${Date.now()}`,
            startTime: Date.now(),
            beliefStatement: { belief, initialConfidence },
            suggestedConcepts: [],
            challengePath: [],
            status: 'generating_suggestions',
        };
        setActiveChallenge(loadingSession);
        setIsGeneratingSuggestions(true);

        try {
            const { suggestions, provenance } = await dialecticService.suggestChallengeTopics(ai, belief, allNodes, sourceNodeIds);
            
            // Post-filter the suggestions to ensure source nodes are excluded, even if the AI includes them.
            const sourceIdsSet = new Set(sourceNodeIds);
            const filteredSuggestions = suggestions.filter(s => !sourceIdsSet.has(s.nodeId));

            if (filteredSuggestions.length < 5) {
                throw new Error("The AI could not generate enough distinct challenging topics. It may have focused too heavily on the source concepts.");
            }

            setActiveChallenge(prev => prev ? ({ 
                ...prev, 
                suggestedConcepts: filteredSuggestions,
                status: 'topic_selection'
            }) : null);
            
            // Aggregate provenance for detailed logging
            const aggregatedProvenance = provenance.reduce((acc, curr) => {
                acc.inputTokens += curr.inputTokens || 0;
                acc.outputTokens += curr.outputTokens || 0;
                acc.totalTokens += curr.totalTokens || 0;
                acc.rawResponse += `\n\n--- Step: ${curr.step} ---\n${curr.rawResponse}`;
                return acc;
            }, {
                prompt: `[Multi-step suggestion generation for belief: "${belief}"]`,
                systemInstruction: "[Combined system instructions for deconstruction, selection, and rationale generation]",
                rawResponse: "",
                model: provenance[0]?.model || 'gemini-2.5-flash',
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
            });
            // Trim leading newlines from rawResponse
            aggregatedProvenance.rawResponse = aggregatedProvenance.rawResponse.trim();

            logActivity('START_BELIEF_CHALLENGE', {
                belief,
                provenance: aggregatedProvenance
            });
        } catch (error) {
            console.error("Failed to start challenge:", error);
            setActiveChallenge(null);
            throw error;
        } finally {
            setIsGeneratingSuggestions(false);
        }
    }, [ai, allNodes, logActivity]);

    const buildPath = useCallback(async (selectedConcepts: SuggestedConcept[]) => {
        if (!activeChallenge) return;
        setIsBuildingPath(true);
        try {
            const { path: challengePath, provenance } = await dialecticService.buildChallengePathFromSelection(ai, activeChallenge.beliefStatement.belief, selectedConcepts);
            
            setActiveChallenge(prev => prev ? ({ ...prev, challengePath, status: 'active' }) : null);

            logActivity('BUILD_BELIEF_CHALLENGE_PATH', {
                belief: activeChallenge.beliefStatement.belief,
                conceptCount: selectedConcepts.length,
                concepts: selectedConcepts.map(c => c.topicName),
                provenance,
            });

        } catch (error) {
            console.error("Failed to build challenge path:", error);
            throw error;
        } finally {
            setIsBuildingPath(false);
        }
    }, [activeChallenge, ai, logActivity]);


    const updateStepConfidence = useCallback((stepIndex: number, confidence: number) => {
        setActiveChallenge(prev => {
            if (!prev) return null;
            const newPath = [...prev.challengePath];
            newPath[stepIndex] = { ...newPath[stepIndex], userConfidence: confidence, status: 'completed' };
            return { ...prev, challengePath: newPath };
        });
    }, []);

    const endChallenge = useCallback(async () => {
        if (!activeChallenge) return;

        setIsGeneratingSynthesis(true);
        const sessionForSummaryView: ChallengeSession = {
            ...activeChallenge,
            status: 'completed',
            endTime: Date.now(),
            finalSynthesis: "", 
        };
        setActiveChallenge(sessionForSummaryView);

        try {
            const { synthesis: finalSynthesis, provenance } = await dialecticService.generateFinalSynthesis(ai, activeChallenge);
            
            const finalCompletedSession: ChallengeSession = {
                ...sessionForSummaryView,
                finalSynthesis
            };

            setActiveChallenge(finalCompletedSession);
            updateActiveProjectData(d => ({
                ...d,
                beliefFlipChallenges: [...(d.beliefFlipChallenges || []), finalCompletedSession]
            }));
            logActivity('COMPLETE_BELIEF_CHALLENGE', {
                 belief: activeChallenge.beliefStatement.belief,
                 provenance
            });
        } catch (error) {
            console.error("Failed to generate synthesis:", error);
            const sessionWithError: ChallengeSession = {
                ...sessionForSummaryView,
                finalSynthesis: "Could not generate a final summary for this session."
            };
            setActiveChallenge(sessionWithError);
            updateActiveProjectData(d => ({
                ...d,
                beliefFlipChallenges: [...(d.beliefFlipChallenges || []), sessionWithError]
            }));
        } finally {
            setIsGeneratingSynthesis(false);
        }
    }, [activeChallenge, ai, updateActiveProjectData, logActivity]);
    
    const discardChallenge = useCallback(() => {
        if (!activeChallenge) return;
        if(activeChallenge.challengePath.some(p => p.status === 'completed')) {
             const discardedSession: ChallengeSession = {
                ...activeChallenge,
                status: 'discarded',
                endTime: Date.now(),
            };
             updateActiveProjectData(d => ({
                ...d,
                beliefFlipChallenges: [...(d.beliefFlipChallenges || []), discardedSession]
            }));
        }
        setActiveChallenge(null);
    }, [activeChallenge, updateActiveProjectData]);
    
    const resumeChallenge = useCallback((sessionId: string) => {
        const challengeToResume = activeProjectData?.beliefFlipChallenges?.find(c => c.id === sessionId);
        if (challengeToResume) {
            setActiveChallenge(challengeToResume);
        }
    }, [activeProjectData]);

    return {
        activeChallenge,
        isGeneratingSuggestions,
        isBuildingPath,
        isGeneratingSynthesis,
        startChallenge,
        buildPath,
        updateStepConfidence,
        endChallenge,
        discardChallenge,
        resumeChallenge,
        closeChallenge: () => setActiveChallenge(null)
    };
};