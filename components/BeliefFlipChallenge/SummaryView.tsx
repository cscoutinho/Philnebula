import React from 'react';
import { ChallengeSession } from '../../types';
import ConfidenceChart from './ConfidenceChart';
import { RefreshCw } from '../icons';

interface SummaryViewProps {
    session: ChallengeSession;
    onFinish: () => void;
    isGeneratingSynthesis: boolean;
}

const SummaryView: React.FC<SummaryViewProps> = ({ session, onFinish, isGeneratingSynthesis }) => {
    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
            <div className="flex-shrink-0 text-center">
                <h2 className="text-3xl font-bold text-green-300">Challenge Completed!</h2>
                <p className="mt-2 text-gray-400">
                    Here is a summary of your intellectual journey.
                </p>
            </div>

            <div className="flex-grow my-6 overflow-y-auto pr-4 -mr-4 space-y-6">
                <div className="w-full p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold text-yellow-300 mb-2">Your Belief's Journey</h3>
                    <p className="text-sm text-gray-400 mb-4 italic">"{session.beliefStatement.belief}"</p>
                    <ConfidenceChart session={session} />
                </div>

                <div className="w-full p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold text-cyan-300 mb-4">AI Synthesis</h3>
                    {isGeneratingSynthesis ? (
                        <div className="flex items-center justify-center gap-3 text-gray-400">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Generating your personalized summary...</span>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm text-gray-300 max-w-none">
                           {session.finalSynthesis?.split('\n').map((line, i) => {
                                const trimmedLine = line.trim();
                                
                                // Handle headings (e.g., **Objective Synthesis**)
                                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                                    const content = trimmedLine.substring(2, trimmedLine.length - 2);
                                    return <h4 key={i} className="font-semibold text-cyan-200 mt-4 mb-1">{content}</h4>;
                                }

                                // Handle lists (bulleted or numbered)
                                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || /^\d+\.\s/.test(trimmedLine)) {
                                    const content = trimmedLine.replace(/^\s*(\*|-|\d+\.)\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                    const bullet = trimmedLine.startsWith('*') || trimmedLine.startsWith('-') ? '•' : (trimmedLine.match(/^\d+/)?.[0] ?? '') + '.';
                                    return <p key={i} className="!my-1 ml-4" dangerouslySetInnerHTML={{ __html: `<span class="mr-2 tabular-nums">${bullet}</span>${content}` }} />;
                                }

                                // Handle empty lines as spacers
                                if(trimmedLine === '') {
                                    return <div key={i} className="h-2"></div>;
                                }

                                // Handle regular paragraphs with bolding
                                const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                return <p key={i} className="!my-2" dangerouslySetInnerHTML={{ __html: content }} />;
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-shrink-0 pt-4">
                <button
                    onClick={onFinish}
                    className="w-full px-6 py-3 bg-gray-600 text-white font-bold text-lg rounded-lg hover:bg-gray-500 transition-colors"
                >
                    Finish & Close
                </button>
            </div>
        </div>
    );
};

export default SummaryView;