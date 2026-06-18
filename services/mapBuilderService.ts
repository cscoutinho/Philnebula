import { GoogleGenAI } from '@google/genai';
import { KindleNote, ImportedNoteSource } from '../types';

export const synthesizeNoteTitle = async (
    ai: GoogleGenAI,
    note: KindleNote,
    source: ImportedNoteSource | undefined,
    existingMapConcepts: string[]
): Promise<{ title: string, provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are a philosophy research assistant specializing in conceptual cartography. Your task is to analyze a note and suggest a concise, academic title for it, suitable for a concept map.

RULES:
- The title MUST be a noun phrase representing a stable philosophical concept.
- The title should be 1-4 words long.
- Prioritize established philosophical terminology where appropriate.
- Avoid generic phrases (e.g., "Main Idea"), questions, or full sentences.
- Respond ONLY with the title itself, without any extra formatting, quotation marks, or explanations.`;

    let context = '';
    if (source) {
        context += `SOURCE CONTEXT:\n- From the ${source.publicationType} "${source.title}" by ${source.author}.\n`;
    }
    if (existingMapConcepts.length > 0) {
        context += `EXISTING CONCEPTS ON MAP:\n- ${existingMapConcepts.join(', ')}\nThis should help you understand the project's focus and choose a consistent level of abstraction.\n`;
    }

    const examples = `EXAMPLES:
1.  Source: 'Phenomenology of Perception' by Maurice Merleau-Ponty
    Note: "the phenomenon of the world is one that is always already there before any reflection or analysis"
    Output: The Primacy of Perception

2.  Source: 'Groundwork of the Metaphysics of Morals' by Immanuel Kant
    Note: "an act is moral only if the rule that governs it can be universalized"
    Output: The Categorical Imperative

3.  Source: 'On Liberty' by John Stuart Mill
    Note: "the only purpose for which power can be rightfully exercised over any member of a civilized community, against his will, is to prevent harm to others"
    Output: The Harm Principle`;

    const prompt = `${context ? `${context}\n---\n` : ''}${examples}\n---\nTASK:\nDistill the core idea of the following note into a conceptual title, following all rules.\n\nNote: "${note.text}"\nOutput:`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { systemInstruction }
        });

        const title = response.text.trim().replace(/^["']|["']$/g, '');
        
        const { usageMetadata } = response;
        const provenance = {
            prompt,
            systemInstruction,
            rawResponse: response.text,
            model,
            inputTokens: usageMetadata?.promptTokenCount,
            outputTokens: usageMetadata?.candidatesTokenCount,
            totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
        };
        
        return { title: title || "Untitled Concept", provenance };
    } catch (error) {
        console.error("Error synthesizing note title:", error);
        throw error;
    }
};
