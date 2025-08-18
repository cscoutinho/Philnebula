

import { GoogleGenAI, Type } from '@google/genai';
import { D3Node, DefinitionResult, CounterExampleResult } from '../types';

export interface RelatedConceptResponse {
    conceptName: string;
    justification: string;
    connectionType: string;
    confidence: number;
}

export const findRelatedConcepts = async (
    ai: GoogleGenAI,
    selectedNode: D3Node,
    allNodes: D3Node[]
): Promise<{ 
    rawResponse: string; 
    data: RelatedConceptResponse[];
    systemInstruction: string;
    promptForLogging: string;
    model: string;
    usageMetadata: any;
}> => {
    const childIds = new Set(selectedNode.children.map(c => c.id));
    const siblingIds = new Set(selectedNode.parent ? (selectedNode.parent as D3Node).children.map(c => c.id) : []);
    const ancestorIds = new Set<number>();
    let current: D3Node | null = selectedNode.parent as D3Node;
    while(current) {
        ancestorIds.add(current.id);
        current = current.parent as D3Node | null;
    }

    const miscPattern = /misc/i;

    let allNodeNames = allNodes
        .filter(n =>
            n.id !== selectedNode.id &&
            !ancestorIds.has(n.id) &&
            !childIds.has(n.id) &&
            !siblingIds.has(n.id) &&
            !miscPattern.test(n.name)
        )
        .map(n => n.name);
    
    if (allNodeNames.length > 1500) {
        // Simple shuffle and slice for performance
        for (let i = allNodeNames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allNodeNames[i], allNodeNames[j]] = [allNodeNames[j], allNodeNames[i]];
        }
        allNodeNames = allNodeNames.slice(0, 1500);
    }
    
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are an expert philosophical research assistant. Your task is to identify a few (up to 5) substantively related philosophical concepts from a given list, based on a target concept. The connection must be non-obvious but also intellectually robust and non-trivial. For each suggestion, you MUST provide the type of connection, a justification, and a confidence score. Crucially, AVOID forcing tenuous or superficial links. Return ONLY suggestions with a confidence score of 3 or higher. It is better to return zero suggestions than to suggest a forced connection.`;
    const prompt = `From the following list of philosophical topics, find up to 5 topics that are substantively related to "${selectedNode.name}". For each, provide its name, a justification explaining the nature of the relationship, the type of connection, and a confidence score from 1-5. Respond ONLY with a JSON array of objects. Here is the list of topics to search within: ${JSON.stringify(allNodeNames)}`;
    const promptForLogging = `From the following list of philosophical topics, find up to 5 topics that are substantively related to "${selectedNode.name}". ... Here is the list of topics to search within: [List of ${allNodeNames.length} topics]`;
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            conceptName: { type: Type.STRING },
                            justification: { type: Type.STRING },
                            connectionType: { type: Type.STRING },
                            confidence: { type: Type.NUMBER }
                        },
                        required: ['conceptName', 'justification', 'connectionType', 'confidence']
                    }
                }
            }
        });

        let relatedData: RelatedConceptResponse[] = [];
        try {
             relatedData = JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse AI response as JSON:", response.text, e);
        }

        return {
            rawResponse: response.text,
            data: relatedData,
            systemInstruction,
            promptForLogging,
            model,
            usageMetadata: response.usageMetadata,
        };
    } catch (error) {
        console.error("Error in findRelatedConcepts service:", error);
        throw error;
    }
};

export const fetchDefinitions = async (
    ai: GoogleGenAI,
    conceptName: string
): Promise<{ rawResponse: string, data: DefinitionResult[], systemInstruction: string, prompt: string, model: string, usageMetadata: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "Você é um historiador da filosofia. Sua tarefa é recuperar definições distintas e significativas de um determinado conceito filosófico. Responda APENAS no formato JSON especificado.";
    const prompt = `Para o conceito "${conceptName}", forneça 3-4 definições distintas e influentes de diferentes contextos (por exemplo, filosófico, científico, legal). Para cada uma, forneça a 'source' (o autor ou campo, como 'Aristóteles' ou 'Biologia Moderna') e um 'summary' conciso de uma frase da definição. Retorne um array JSON de objetos, cada um com as chaves "source" e "summary".`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        source: { type: Type.STRING },
                        summary: { type: Type.STRING }
                    },
                    required: ["source", "summary"]
                }
            }
        }
    });

    return {
        rawResponse: response.text,
        data: JSON.parse(response.text),
        systemInstruction,
        prompt,
        model,
        usageMetadata: response.usageMetadata
    };
};

export const fetchCounterExamples = async (
    ai: GoogleGenAI,
    sourceConcept: string,
    targetConcept: string,
    definition: DefinitionResult
): Promise<{ rawResponse: string, data: CounterExampleResult[], systemInstruction: string, prompt: string, model: string, usageMetadata: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "Você é um lógico socrático rigoroso. Sua tarefa é testar a suficiência de uma definição encontrando contra-exemplos. Seja preciso e evite exemplos triviais. Responda APENAS no formato JSON especificado.";
    const prompt = `Dado que "${sourceConcept}" é definido como "${definition.summary}" (segundo ${definition.source}), encontre até 3 contra-exemplos poderosos que desafiam a classificação de "${targetConcept}" como um tipo de "${sourceConcept}". Um contra-exemplo deve se encaixar na definição, mas não ser um "${targetConcept}", ou ser um "${targetConcept}" que não se encaixa na definição. Para cada um, forneça o 'counterExample' (nome) e a 'justification' (explicação). Retorne um array JSON de objetos. Se você não encontrar contra-exemplos fortes, retorne um array vazio.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        counterExample: { type: Type.STRING },
                        justification: { type: Type.STRING }
                    },
                    required: ["counterExample", "justification"]
                }
            }
        }
    });

    return {
        rawResponse: response.text,
        data: JSON.parse(response.text),
        systemInstruction,
        prompt,
        model,
        usageMetadata: response.usageMetadata
    };
};