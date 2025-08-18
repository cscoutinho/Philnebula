import React, { useState } from 'react';
import { ChallengeSession, SuggestedConcept } from '../../types';
import { BrainCircuit, RefreshCw } from '../icons';

interface TopicSelectionViewProps {
    session: ChallengeSession;
    onBuildPath: (selectedConcepts: SuggestedConcept[]) => void;
    isLoading: boolean;
}

const TopicSelectionView: React.FC<TopicSelectionViewProps> = ({ session, onBuildPath, isLoading }) => {
    const [selectedConcepts, setSelectedConcepts] = useState<Set<number>>(new Set());

    const handleToggleConcept = (nodeId: number) => {
        setSelectedConcepts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        const conceptsToBuild = session.suggestedConcepts.filter(c => selectedConcepts.has(c.nodeId));
        onBuildPath(conceptsToBuild);
    };

    const isSelectionValid = selectedConcepts.size >= 5 && selectedConcepts.size <= 7;

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col h-full relative">
            {isLoading && (
                 <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-yellow-300">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <p className="mt-4 text-lg font-semibold">Building your personalized path...</p>
                 </div>
            )}
            <div className="flex-shrink-0 text-center">
                <h2 className="text-3xl font-bold text-cyan-300">Co-create Your Challenge Path</h2>
                <p className="mt-2 text-gray-400 max-w-2xl mx-auto">
                    The AI suggests the following topics to challenge your belief. Select <strong>5 to 7</strong> that you find most interesting or relevant to build your personalized journey.
                </p>
            </div>

            <div className="flex-grow my-8 overflow-y-auto pr-4 -mr-4">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {session.suggestedConcepts.map(concept => {
                        const isSelected = selectedConcepts.has(concept.nodeId);
                        return (
                            <li key={concept.nodeId}>
                                <button
                                    onClick={() => handleToggleConcept(concept.nodeId)}
                                    className={`w-full h-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-start gap-3 ${isSelected ? 'bg-cyan-900/50 border-cyan-500' : 'bg-gray-800/80 border-gray-700 hover:border-gray-600'}`}
                                >
                                    <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-sm border-2 flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-700 border-gray-500'}`}>
                                        {isSelected && <span className="text-black font-bold">✓</span>}
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>{concept.topicName}</h4>
                                        <p className="text-sm text-gray-400 mt-1">{concept.rationale}</p>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
            
            <div className="flex-shrink-0 pt-4">
                 <button
                    onClick={handleSubmit}
                    disabled={!isSelectionValid || isLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-600 text-white font-bold text-lg rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    <BrainCircuit className="w-6 h-6" />
                    Build My Path ({selectedConcepts.size})
                </button>
            </div>
        </div>
    );
};

export default TopicSelectionView;