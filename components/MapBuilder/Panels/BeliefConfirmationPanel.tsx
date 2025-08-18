import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { BeliefConfirmationState, ProjectActivityType } from '../../../types';
import ConfidenceSlider from '../../BeliefFlipChallenge/ConfidenceSlider';
import { X, LightbulbIcon, SparkleIcon, RefreshCw } from '../../icons';

interface BeliefConfirmationPanelProps {
    state: BeliefConfirmationState | null;
    onClose: () => void;
    onStartChallenge: (belief: string, confidence: number) => void;
    sourceName: string;
    targetName: string;
    ai: GoogleGenAI;
    logActivity: (type: ProjectActivityType, payload: { [key: string]: any }) => void;
}

const BeliefConfirmationPanel: React.FC<BeliefConfirmationPanelProps> = ({ state, onClose, onStartChallenge, sourceName, targetName, ai, logActivity }) => {
    const [belief, setBelief] = useState('');
    const [confidence, setConfidence] = useState(75);
    const [isLoading, setIsLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const generateBelief = async () => {
            if (!state || !sourceName || !targetName) return;
            setIsLoading(true);
            setBelief('');

            const model = 'gemini-2.5-flash';
            const systemInstruction = "You are a succinct philosophical analyst. Your job is to translate a structured conceptual link into a natural language belief statement. Respond ONLY with the belief statement itself, without any extra text or quotes.";
            const prompt = `A user has created a link: from "${sourceName}" to "${targetName}", with the relationship type(s) "${state.link.relationshipTypes.join(', ')}". Formulate a clear, affirmative, and concise belief statement that this link represents.`;

            try {
                const response = await ai.models.generateContent({ model, contents: prompt, config: { systemInstruction }});
                const generatedText = response.text.trim();
                setBelief(generatedText);

                const { usageMetadata } = response;
                logActivity('INITIATE_BELIEF_CHALLENGE_FROM_MAP', {
                    sourceName: sourceName,
                    targetName: targetName,
                    relationship: state.link.relationshipTypes.join(', '),
                    generatedBelief: generatedText,
                     provenance: { 
                        prompt, 
                        systemInstruction, 
                        rawResponse: response.text, 
                        model,
                        inputTokens: usageMetadata?.promptTokenCount,
                        outputTokens: usageMetadata?.candidatesTokenCount,
                        totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
                    }
                });

            } catch (error) {
                console.error("Error generating belief statement:", error);
                setBelief("Could not generate belief statement.");
            } finally {
                setIsLoading(false);
            }
        };

        generateBelief();
    }, [state, sourceName, targetName, ai, logActivity]);

    const handleSubmit = () => {
        const dragEndTime = (window as any).__mapDragEndTime || 0;
        if (Date.now() - dragEndTime < 100) {
            return;
        }
        if (belief.trim()) {
            onStartChallenge(belief, confidence);
            onClose();
        }
    };

    if (!state) return null;

    return (
        <div 
            ref={panelRef}
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 text-white w-full max-w-lg animate-fade-in flex flex-col"
            onClick={e => e.stopPropagation()}
        >
             <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg">
                <h3 className="text-lg font-bold text-yellow-300 flex items-center gap-2"><LightbulbIcon/> Confirm Belief for Challenge</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-gray-400 h-24">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Generating belief statement...</span>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="belief-statement" className="block text-sm font-medium text-gray-300 mb-2">
                            Refine the belief you want to challenge:
                        </label>
                        <textarea
                            id="belief-statement"
                            value={belief}
                            onChange={(e) => setBelief(e.target.value)}
                            className="w-full h-28 p-3 bg-gray-800 border border-gray-600 rounded-md text-base focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-y"
                        />
                    </div>
                )}
                
                <ConfidenceSlider
                    value={confidence}
                    onChange={setConfidence}
                    label="How confident are you in this belief?"
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading || !belief.trim()}
                        className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-md hover:bg-yellow-400 flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        <SparkleIcon className="w-5 h-5"/>
                        Start Challenge
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BeliefConfirmationPanel;
