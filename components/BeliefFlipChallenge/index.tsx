import React, { useState } from 'react';
import { ChallengeSession, SuggestedConcept } from '../../types';
import EntryView from './EntryView';
import StepperView from './StepperView';
import SummaryView from './SummaryView';
import TopicSelectionView from './TopicSelectionView';
import { X, SparkleIcon } from '../icons';

interface BeliefFlipChallengeProps {
    isOpen: boolean;
    onClose: () => void;
    activeChallenge: ChallengeSession | null;
    isGeneratingSuggestions: boolean;
    isBuildingPath: boolean;
    isGeneratingSynthesis: boolean;
    startChallenge: (belief: string, initialConfidence: number) => Promise<void>;
    buildPath: (selectedConcepts: SuggestedConcept[]) => Promise<void>;
    updateStepConfidence: (stepIndex: number, confidence: number) => void;
    endChallenge: () => void;
    discardChallenge: () => void;
}

const BeliefFlipChallenge: React.FC<BeliefFlipChallengeProps> = ({
    isOpen,
    onClose,
    activeChallenge,
    isGeneratingSuggestions,
    isBuildingPath,
    isGeneratingSynthesis,
    startChallenge,
    buildPath,
    updateStepConfidence,
    endChallenge,
    discardChallenge,
}) => {
    const [error, setError] = useState<string | null>(null);

    const handleStart = async (belief: string, confidence: number) => {
        setError(null);
        try {
            await startChallenge(belief, confidence);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        }
    };

     const handleBuildPath = async (selectedConcepts: SuggestedConcept[]) => {
        setError(null);
        try {
            await buildPath(selectedConcepts);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        }
    };
    
    const handleClose = () => {
        discardChallenge();
        setError(null);
        onClose();
    }

    if (!isOpen) return null;

    const renderContent = () => {
        if (activeChallenge) {
            switch (activeChallenge.status) {
                case 'generating_suggestions':
                    return (
                        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
                            <SparkleIcon className="w-12 h-12 text-yellow-300 animate-spin" />
                            <h2 className="mt-6 text-3xl font-bold text-yellow-300">Finding Challenging Concepts...</h2>
                            <p className="mt-2 text-gray-400">
                                The AI is analyzing your belief and searching the philosophical taxonomy for relevant counterpoints.
                            </p>
                        </div>
                    );
                case 'topic_selection':
                    return (
                        <TopicSelectionView
                            session={activeChallenge}
                            onBuildPath={handleBuildPath}
                            isLoading={isBuildingPath}
                        />
                    );
                case 'active':
                    return (
                        <StepperView
                            session={activeChallenge} 
                            onUpdateConfidence={updateStepConfidence}
                            onComplete={endChallenge}
                        />
                    );
                case 'completed':
                    return (
                        <SummaryView 
                            session={activeChallenge}
                            isGeneratingSynthesis={isGeneratingSynthesis}
                            onFinish={handleClose}
                        />
                    );
                default:
                    return <EntryView onStart={handleStart} isLoading={isGeneratingSuggestions} />;
            }
        }
        return (
            <EntryView 
                onStart={handleStart} 
                isLoading={isGeneratingSuggestions}
            />
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-fade-in"
            aria-modal="true"
            role="dialog"
        >
            <div className="absolute top-5 right-5">
                <button
                    onClick={handleClose}
                    className="p-2 bg-gray-700/50 text-gray-300 hover:bg-gray-600/80 hover:text-white rounded-full transition-colors"
                    aria-label="Close Belief Flip Challenge"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="w-full h-full flex items-center justify-center">
                 {error && (
                    <div className="absolute top-20 bg-red-900/80 border border-red-700 text-red-200 px-4 py-2 rounded-md text-center">
                        <p><strong>Error:</strong> {error}</p>
                        <button onClick={() => setError(null)} className="mt-1 text-xs underline">Dismiss</button>
                    </div>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

export default BeliefFlipChallenge;