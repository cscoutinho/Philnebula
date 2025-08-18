import { GoogleGenAI } from '@google/genai';

export const synthesizeNoteTitle = async (
    ai: GoogleGenAI,
    noteText: string
): Promise<{ title: string, provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are an expert academic synthesizer. Your task is to distill the core idea of a text into a concise, 1-3 word conceptual title. Respond ONLY with the title itself, without any extra formatting or quotation marks.";
    const prompt = `Distill the core idea of the following text into a 1-3 word conceptual title:
---
"${noteText}"
---
Title:`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { systemInstruction }
        });

        const title = response.text.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        
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
        
        return { title, provenance };
    } catch (error) {
        console.error("Error synthesizing note title:", error);
        throw error;
    }
};
