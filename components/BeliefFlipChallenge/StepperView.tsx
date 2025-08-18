import React, { useState, useEffect, useRef } from 'react';
import { ChallengeSession } from '../../types';
import ConfidenceSlider from './ConfidenceSlider';
import { BrainCircuit, Check, ChevronLeft } from '../icons';

interface StepperViewProps {
    session: ChallengeSession;
    onUpdateConfidence: (stepIndex: number, confidence: number) => void;
    onComplete: () => void;
}

const StepperView: React.FC<StepperViewProps> = ({ session, onUpdateConfidence, onComplete }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [confidence, setConfidence] = useState(50);
    const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [whyThisVisible, setWhyThisVisible] = useState(false);

    const listRef = useRef<HTMLUListElement>(null);
    
    useEffect(() => {
        const firstPendingIndex = session.challengePath.findIndex(step => step.status === 'pending');
        if (firstPendingIndex !== -1) {
            setCurrentStepIndex(firstPendingIndex);
        } else if (session.challengePath.length > 0) {
            // All steps are done, stay on the last one to prevent errors
            setCurrentStepIndex(session.challengePath.length - 1);
        }
    }, [session]);

    useEffect(() => {
        const lastConfidence = [...session.challengePath].slice(0, currentStepIndex).reverse().find(s => s.userConfidence !== undefined)?.userConfidence;
        setConfidence(lastConfidence ?? session.beliefStatement.initialConfidence);
        setWhyThisVisible(false); // Reset rationale visibility on step change
    }, [currentStepIndex, session]);

    const handleNext = () => {
        onUpdateConfidence(currentStepIndex, confidence);
        if (!isLastStep) {
            // The useEffect will handle setting the next step index
        } else {
            onComplete();
        }
    };

    const handleMouseEnter = (e: React.MouseEvent, index: number) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({ top: rect.top, left: rect.right + 10 });
        setHoveredStepIndex(index);
    };

    const currentStep = session.challengePath[currentStepIndex];
    if (!currentStep) return null;

    const completedSteps = session.challengePath.filter(s => s.status === 'completed').length;
    const isLastStep = completedSteps === session.challengePath.length - 1 && currentStep.status === 'pending';

    return (
        <div className="w-full h-full flex gap-8 relative">
            {/* Sidebar */}
            <aside className="w-1/4 flex-shrink-0 border-r border-gray-700 pr-8">
                <h3 className="text-lg font-bold text-yellow-300 mb-4">Your Belief:</h3>
                <p className="text-gray-300 italic mb-6">"{session.beliefStatement.belief}"</p>
                <h3 className="text-lg font-bold text-yellow-300 mb-4">Challenge Path</h3>
                <ul className="space-y-3" ref={listRef}>
                    {session.challengePath.map((step, index) => (
                        <li 
                            key={step.nodeId} 
                            className="flex items-center gap-3 cursor-pointer"
                            onMouseEnter={(e) => handleMouseEnter(e, index)}
                            onMouseLeave={() => setHoveredStepIndex(null)}
                            onClick={() => { if (step.status !== 'pending') setCurrentStepIndex(index); }}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                                index === currentStepIndex ? 'bg-yellow-500 text-black' : 
                                step.status === 'completed' ? 'bg-green-700 text-green-200' : 
                                'bg-gray-700 text-gray-300'
                            }`}>
                                {step.status === 'completed' ? <Check className="w-4 h-4"/> : index + 1}
                            </div>
                            <span className={`transition-colors ${index === currentStepIndex ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                {step.topicName}
                            </span>
                        </li>
                    ))}
                </ul>
            </aside>
            
            {/* Main Content */}
            <main className="w-3/4 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <BrainCircuit className="w-8 h-8 text-cyan-400" />
                        <h2 className="text-3xl font-bold text-cyan-300">{currentStep.topicName}</h2>
                    </div>
                    <div className="space-y-6 text-lg">
                        <div>
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-gray-400 text-sm uppercase tracking-wider mb-2">Summary</h4>
                                <button onClick={() => setWhyThisVisible(!whyThisVisible)} className="text-xs text-cyan-400 hover:text-cyan-200 hover:underline">Why this concept?</button>
                            </div>
                            <p className="text-gray-200 leading-relaxed">{currentStep.summary}</p>
                            {whyThisVisible && (
                                <div className="mt-3 p-3 bg-gray-900/50 border-l-2 border-cyan-500 text-sm animate-fade-in">
                                    <p className="text-gray-400"><strong>AI Rationale:</strong> <span className="italic">{currentStep.rationale}</span></p>
                                </div>
                            )}
                        </div>
                         <div>
                            <h4 className="font-semibold text-gray-400 text-sm uppercase tracking-wider mb-2">Question for Reflection</h4>
                            <p className="text-yellow-200 italic leading-relaxed">{currentStep.provocativeQuestion}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700">
                    <ConfidenceSlider
                        value={confidence}
                        onChange={setConfidence}
                        label="Having considered this, how confident are you now in your original belief?"
                    />
                    <div className="flex items-center justify-between mt-6 gap-4">
                        <button
                            onClick={() => setCurrentStepIndex(i => i-1)}
                            disabled={currentStepIndex === 0}
                            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            <ChevronLeft className="w-4 h-4"/>
                            Previous
                        </button>

                        <button
                            onClick={handleNext}
                            className="flex-grow px-6 py-3 bg-cyan-600 text-white font-bold text-lg rounded-lg hover:bg-cyan-500 transition-colors"
                        >
                            {isLastStep ? "Complete Challenge & See Summary" : "Next Step"}
                        </button>
                    </div>
                </div>
            </main>

            {hoveredStepIndex !== null && (
                <div 
                    style={{ top: tooltipPos.top, left: tooltipPos.left }}
                    className="fixed bg-gray-900/80 backdrop-blur-md border border-gray-600 rounded-lg shadow-lg p-3 z-50 text-white text-sm max-w-xs animate-fade-in pointer-events-none"
                >
                    <h4 className="font-bold mb-1">{session.challengePath[hoveredStepIndex].topicName}</h4>
                    <p className="text-gray-300">{session.challengePath[hoveredStepIndex].summary}</p>
                </div>
            )}
        </div>
    );
};

export default StepperView;