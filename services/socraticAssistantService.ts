// services/socraticAssistantService.ts

import { GoogleGenAI, Type } from '@google/genai';
import { MapLink, MapNode, D3Node, SocraticSuggestion, PhilosophicalMove } from '../types';
import { getMidpoint } from '../components/MapBuilder/utils/calculations';

// --- III. FUNÇÕES EXPORTADAS DO SERVIÇO ---

export const generateCounterExample = async (
    ai: GoogleGenAI,
    sourceName: string,
    targetName: string,
    existingCounterExamples: string[]
): Promise<{ name: string; justification: string; provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "Você é um lógico e filósofo. Sua tarefa é encontrar um contraexemplo conciso e de bom senso para uma dada afirmação filosófica e fornecer uma breve justificativa. Responda APENAS com o objeto JSON especificado.";
    
    const exclusionClause = existingCounterExamples.length > 0
        ? ` Por favor, forneça um contraexemplo diferente que não esteja nesta lista: [${existingCounterExamples.join(', ')}].`
        : '';

    const prompt = `A afirmação é: "${sourceName}" é uma condição suficiente para "${targetName}". Encontre um contraexemplo conciso para essa afirmação.${exclusionClause} Forneça o nome do contraexemplo e uma justificativa de uma frase explicando por que ele é um contraexemplo. Por exemplo, se a afirmação fosse "Ser um pássaro é uma condição suficiente para poder voar", a resposta JSON seria { "name": "Pinguim", "justification": "Um pinguim é um pássaro, mas não pode voar." }`;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                systemInstruction, 
                temperature: 0.2,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        justification: { type: Type.STRING }
                    },
                    required: ["name", "justification"]
                }
            }
        });

        const result = JSON.parse(response.text);
        const { name, justification } = result;

        if (!name || !justification) {
            throw new Error("A IA retornou uma resposta inválida para o contraexemplo.");
        }

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
        
        return { name, justification, provenance };
    } catch (error) {
        console.error("Erro ao gerar contraexemplo:", error);
        throw error;
    }
};

export const generateAlternativeHypothesis = async (
    ai: GoogleGenAI,
    sourceName: string, // The original explanation
    targetName: string,  // The phenomenon being explained
    existingAlternatives: string[]
): Promise<{ name: string; justification: string; provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "Você é um pensador crítico e criativo. Sua tarefa é propor explicações alternativas plausíveis para um determinado fenômeno, desafiando uma explicação inicial. Responda APENAS com o objeto JSON especificado.";

    const exclusionClause = existingAlternatives.length > 0
        ? ` Por favor, forneça uma hipótese alternativa diferente que não esteja nesta lista: [${existingAlternatives.join(', ')}].`
        : '';
        
    const prompt = `Um usuário afirmou que "${sourceName}" é a melhor explicação para "${targetName}". Proponha uma explicação alternativa concisa e plausível para "${targetName}".${exclusionClause} Forneça o 'name' da hipótese alternativa (1-5 palavras) e uma 'justification' de uma frase explicando por que é uma alternativa viável. Por exemplo, se a afirmação fosse "Uma queda acentuada na pressão barométrica é a melhor explicação para a Tempestade", uma boa resposta seria { "name": "Intervenção Divina", "justification": "A tempestade poderia ser um ato de uma entidade sobrenatural, em vez de um evento puramente meteorológico." }`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.7,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        justification: { type: Type.STRING }
                    },
                    required: ["name", "justification"]
                }
            }
        });

        const result = JSON.parse(response.text);
        const { name, justification } = result;

        if (!name || !justification) {
            throw new Error("A IA retornou uma resposta inválida para a hipótese alternativa.");
        }

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
        
        return { name, justification, provenance };
    } catch (error) {
        console.error("Erro ao gerar hipótese alternativa:", error);
        throw error;
    }
};

// --- SOCRATIC ASSISTANT LOGIC ---

// Helper function to check for specific relationship types
const hasType = (link: MapLink, type: string) => link.relationshipTypes.includes(type);

const philosophicalMoves: PhilosophicalMove[] = [
    {
        key: 'counterexample',
        name: 'Test with Counterexample',
        description: 'A "Sufficient Condition" claim can be tested by searching for counterexamples.',
        condition: (link) => hasType(link, 'É Condição Suficiente para'),
        getSuggestion: (link, sourceNode, targetNode, position) => ({
            id: `sugg_${link.source}_${link.target}_counter`,
            movementKey: 'counterexample',
            triggerType: 'link',
            triggerId: `${link.source}-${link.target}`,
            sourceName: sourceNode.name,
            targetName: targetNode.name,
            position,
            availableActions: ['add_counterexample', 'remove_link'],
            description: `Is "${sourceNode.name}" truly sufficient for "${targetNode.name}"? Consider generating a counterexample.`
        })
    },
    {
        key: 'alternative_hypothesis',
        name: 'Propose Alternative Hypothesis',
        description: 'A "Best Explanation" claim invites consideration of alternative explanations for the same phenomenon.',
        condition: (link) => hasType(link, 'É a Melhor Explicação para'),
        getSuggestion: (link, sourceNode, targetNode, position) => ({
            id: `sugg_${link.source}_${link.target}_althypo`,
            movementKey: 'alternative_hypothesis',
            triggerType: 'link',
            triggerId: `${link.source}-${link.target}`,
            sourceName: sourceNode.name,
            targetName: targetNode.name,
            position,
            availableActions: ['add_alternative_hypothesis', 'remove_link'],
            description: `Is "${sourceNode.name}" the only explanation for "${targetNode.name}"? Consider generating an alternative hypothesis.`
        })
    }
];

export const processLinkCreationAction = (
    link: MapLink,
    nodeMap: Map<string | number, MapNode>,
    allNodes: D3Node[]
): SocraticSuggestion | null => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);

    if (!sourceNode || !targetNode) return null;

    for (const move of philosophicalMoves) {
        if (move.condition(link)) {
            const position = getMidpoint(link, nodeMap);
            return move.getSuggestion(link, sourceNode, targetNode, position);
        }
    }

    return null;
};