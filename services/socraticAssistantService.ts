// services/socraticAssistantService.ts

import { GoogleGenAI, Type } from '@google/genai';
import type { 
    MapLink, MapNode, D3Node, SocraticSuggestion, SocraticMovementKey, 
    PhilosophicalMove, ActionContext, NodeContext, LinkContext
} from '../types';
import { getMidpoint } from '../components/MapBuilder/utils/calculations';

// --- I. ONTOLOGIA DE RELAÇÕES VIVAS E MOVIMENTOS FILOSÓFICOS ---
const MOVEMENTS: Record<SocraticMovementKey, PhilosophicalMove> = {
    'counterexample': {
        key: 'counterexample',
        suggestionText: (sourceName, targetName) => `A sua afirmação de que "${sourceName}" é condição suficiente para "${targetName}" é universal? Tente formular um contraexemplo onde o primeiro é verdadeiro, mas o segundo é falso.`,
        pedagogy: {
            title: "O Desafio do Contraexemplo",
            explanation: "Em lógica, um contraexemplo é um caso específico que refuta uma declaração universal. Se você afirma 'Todos os cisnes são brancos', encontrar um único cisne negro invalida a afirmação. Este é um dos métodos mais poderosos para testar a robustez de uma generalização."
        }
    },
    'alternative_hypothesis': {
        key: 'alternative_hypothesis',
        suggestionText: (sourceName, targetName) => `Sua afirmação de que "${sourceName}" é a 'melhor' explicação para "${targetName}" implica uma comparação. Você já considerou e descartou hipóteses alternativas?`,
        pedagogy: {
            title: "O Desafio da Hipótese Alternativa",
            explanation: "O raciocínio para a Melhor Explicação (abdução) exige que comparemos várias hipóteses concorrentes. Aceitar a primeira explicação plausível sem considerar alternativas é um erro comum. Este movimento incentiva a busca por outras explicações para garantir que a sua seja verdadeiramente a mais forte."
        }
    },
};

// --- II. HELPERS DO SERVIÇO SOCRÁTICO ---

const getNodeType = (node: MapNode): NodeContext['type'] => {
    if (typeof node.id === 'number') return 'taxonomy';
    if (node.isCitation) return 'citation';
    if (node.sourceNotes && node.sourceNotes.length > 0) return 'note_synthesis';
    if (node.isUserDefined) return 'user_defined';
    if (node.isCounterExample) return 'counterexample';
    if (node.isDialectic) return 'dialectic';
    if (node.isHistorical) return 'historical';
    if (node.isAiGenerated) return 'ai_synthesis';
    return 'user_defined';
};

const getTaxonomyPath = (node: MapNode, allNodes: D3Node[]): string[] | null => {
    if (typeof node.id !== 'number') return null;
    const taxonomyNode = allNodes.find(n => n.id === node.id);
    if (!taxonomyNode) return null;

    const path: string[] = [];
    let current: D3Node | null = taxonomyNode.parent as D3Node | null;
    while (current && current.parent) {
        path.unshift(current.name);
        current = current.parent as D3Node | null;
    }
    return path;
};

const buildContextObject = (link: MapLink, nodeMap: Map<string | number, MapNode>, allNodes: D3Node[]): ActionContext | null => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);
    if (!sourceNode || !targetNode) return null;

    const sourceNodeContext: NodeContext = {
        id: sourceNode.id, name: sourceNode.name, type: getNodeType(sourceNode),
        taxonomyPath: getTaxonomyPath(sourceNode, allNodes),
    };
    const targetNodeContext: NodeContext = {
        id: targetNode.id, name: targetNode.name, type: getNodeType(targetNode),
        taxonomyPath: getTaxonomyPath(targetNode, allNodes),
    };
    const linkContext: LinkContext = {
        relationshipTypes: link.relationshipTypes, justification: link.justification || null,
    };
    return { event: 'link_created', sourceNode: sourceNodeContext, targetNode: targetNodeContext, link: linkContext };
};

const findSuggestionForContext = (context: ActionContext, link: MapLink, nodeMap: Map<string | number, MapNode>): SocraticSuggestion | null => {
    const id = `socratic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const position = getMidpoint(link, nodeMap);
    const baseSuggestion = {
        id, triggerType: 'link' as const, triggerId: `${link.source}-${link.target}`,
        position, sourceId: link.source, targetId: link.target, 
        sourceName: context.sourceNode.name, targetName: context.targetNode.name,
    };

    if (context.link.relationshipTypes.includes('É Condição Suficiente para')) {
        return { ...baseSuggestion, movementKey: 'counterexample' };
    }
    
    if (context.link.relationshipTypes.includes('É a Melhor Explicação para')) {
        return { ...baseSuggestion, movementKey: 'alternative_hypothesis' };
    }
    
    return null;
};

// --- III. FUNÇÕES EXPORTADAS DO SERVIÇO ---

export const processLinkCreationAction = (
    link: MapLink, 
    nodeMap: Map<string | number, MapNode>,
    allNodes: D3Node[]
): SocraticSuggestion | null => {
    const context = buildContextObject(link, nodeMap, allNodes);
    if (!context) return null;
    return findSuggestionForContext(context, link, nodeMap);
};

export const getMovement = (key: SocraticMovementKey): PhilosophicalMove => MOVEMENTS[key];

export const generateCounterExample = async (
    ai: GoogleGenAI,
    sourceName: string,
    targetName: string
): Promise<{ name: string; justification: string; provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "Você é um lógico e filósofo. Sua tarefa é encontrar um contraexemplo conciso e de bom senso para uma dada afirmação filosófica e fornecer uma breve justificativa. Responda APENAS com o objeto JSON especificado.";
    const prompt = `A afirmação é: "${sourceName}" é uma condição suficiente para "${targetName}". Encontre um contraexemplo conciso para essa afirmação. Forneça o nome do contraexemplo e uma justificativa de uma frase explicando por que ele é um contraexemplo. Por exemplo, se a afirmação fosse "Ser um pássaro é uma condição suficiente para poder voar", a resposta JSON seria { "name": "Pinguim", "justification": "Um pinguim é um pássaro, mas não pode voar." }`;
    
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
    targetName: string  // The phenomenon being explained
): Promise<{ name: string; justification: string; provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "Você é um pensador crítico e criativo. Sua tarefa é propor explicações alternativas plausíveis para um determinado fenômeno, desafiando uma explicação inicial. Responda APENAS com o objeto JSON especificado.";
    const prompt = `Um usuário afirmou que "${sourceName}" é a melhor explicação para "${targetName}". Proponha uma explicação alternativa concisa e plausível para "${targetName}". Forneça o 'name' da hipótese alternativa (1-5 palavras) e uma 'justification' de uma frase explicando por que é uma alternativa viável. Por exemplo, se a afirmação fosse "Uma queda acentuada na pressão barométrica é a melhor explicação para a Tempestade", uma boa resposta seria { "name": "Intervenção Divina", "justification": "A tempestade poderia ser um ato de uma entidade sobrenatural, em vez de um evento puramente meteorológico." }`;

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