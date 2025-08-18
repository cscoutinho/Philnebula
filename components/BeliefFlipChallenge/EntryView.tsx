import React, { useState } from 'react';
import ConfidenceSlider from './ConfidenceSlider';
import { SparkleIcon } from '../icons';

interface EntryViewProps {
    onStart: (belief: string, confidence: number) => void;
    isLoading: boolean;
}

const EntryView: React.FC<EntryViewProps> = ({ onStart, isLoading }) => {
    const [belief, setBelief] = useState('');
    const [confidence, setConfidence] = useState(75);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (belief.trim()) {
            onStart(belief.trim(), confidence);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-bold text-yellow-300">Belief Flip Challenge</h2>
            <p className="mt-2 text-gray-400 text-center">
                State a belief you hold. Our AI will guide you through a series of challenging concepts to test its foundations.
            </p>

            <form onSubmit={handleSubmit} className="w-full mt-8 space-y-6">
                <textarea
                    value={belief}
                    onChange={(e) => setBelief(e.target.value)}
                    placeholder="e.g., 'Free will is an illusion.' or 'Utilitarianism is the most ethical framework.'"
                    className="w-full h-32 p-4 bg-gray-900 border border-gray-700 rounded-lg text-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none"
                    aria-label="Your belief"
                />

                <ConfidenceSlider
                    value={confidence}
                    onChange={setConfidence}
                    label="How confident are you in this belief right now?"
                />

                <button
                    type="submit"
                    disabled={!belief.trim() || isLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-yellow-500 text-black font-bold text-lg rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <SparkleIcon className="w-6 h-6 animate-spin" />
                            Generating Your Path...
                        </>
                    ) : (
                        <>
                            <SparkleIcon className="w-6 h-6" />
                            Start Challenge
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default EntryView;
