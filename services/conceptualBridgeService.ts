
import { GoogleGenAI, Type } from '@google/genai';
import { D3Node, ParsedMindMapNode, BridgeAnalysis, MappingSuggestion } from '../types';

export const parseMindMapImage = async (
    ai: GoogleGenAI,
    imageBase64: string,
    mimeType: string
): Promise<ParsedMindMapNode> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are a multimodal analysis engine. Your task is to accurately convert an image of a mind map into a structured, recursive JSON object. Respond ONLY with the JSON object.";
    const prompt = `Analise esta imagem de um mapa mental. Identifique todos os nós de texto e sua estrutura hierárquica. O nó raiz é o nó mais central ou superior. Sua saída DEVE ser um único objeto JSON representando o nó raiz, com todos os sub-nós aninhados recursivamente em arrays de 'children'. O formato de cada nó deve ser { "name": "Texto do Nó", "children": [...] }.`;
    
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    };
    
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
          systemInstruction,
          responseMimeType: 'application/json',
      }
    });

    try {
        if (!response.text) {
            throw new Error("AI response is empty");
        }
        
        const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        const parsedJson = JSON.parse(cleanedText);
        
        // Função recursiva para garantir que todos os nós tenham children como array
        const validateAndFixNode = (node: any): ParsedMindMapNode => {
            if (typeof node.name !== 'string') {
                throw new Error("Node name must be a string");
            }
            
            return {
                name: node.name,
                children: Array.isArray(node.children) 
                    ? node.children.map(validateAndFixNode)
                    : []
            };
        };
        
        if (typeof parsedJson.name === 'string') {
            return validateAndFixNode(parsedJson);
        }
        throw new Error("Parsed JSON does not match expected structure.");
    } catch (e) {
        console.error("Failed to parse mind map JSON:", e);
        console.error("Raw response from AI:", response.text);
        throw new Error("The AI returned an invalid structure for the mind map.");
    }
};

export const getMappingSuggestions = async (
    ai: GoogleGenAI,
    userNodeName: string,
    allPhilPapersNodes: D3Node[]
): Promise<MappingSuggestion[]> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are a philosophical librarian. Your task is to find the most relevant categories in the PhilPapers taxonomy for a user's concept. Prioritize substantive connections. Respond ONLY with the specified JSON.";
    
    const nodeNames = allPhilPapersNodes.filter(n => !/misc/i.test(n.name)).map(n => n.name);

    const prompt = `Given the user's concept "${userNodeName}", find the 3 most relevant matching or related concepts from the following list of PhilPapers categories. For each, provide a one-sentence rationale.
    
    PhilPapers Categories:
    ${JSON.stringify(nodeNames.slice(0, 1500))}

    Respond ONLY with a JSON array of objects, each with 'philPapersNodeName' and 'rationale'.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        philPapersNodeName: { type: Type.STRING },
                        rationale: { type: Type.STRING }
                    },
                    required: ["philPapersNodeName", "rationale"]
                }
            }
        }
    });

    if (!response.text) {
        throw new Error("AI response is empty");
    }

    const results = JSON.parse(response.text);
    const nodeMap = new Map(allPhilPapersNodes.map(n => [n.name, n]));

    return results.map((r: { philPapersNodeName: string; rationale: string; }) => {
        const node = nodeMap.get(r.philPapersNodeName);
        return node ? { ...r, philPapersNodeId: node.id } : null;
    }).filter((r: any): r is MappingSuggestion => r !== null);
};

export const getOverallAnalysis = async (
    ai: GoogleGenAI,
    userMap: ParsedMindMapNode,
    establishedLinks: { userNodeName: string; philPapersNodeName: string }[]
): Promise<BridgeAnalysis> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are a meta-philosophical analyst. Your role is to compare a user's conceptual map against the formal PhilPapers taxonomy and provide constructive feedback for research and learning. Be specific and insightful. Respond ONLY with the specified JSON object.";
    
    const prompt = `A user has created a mind map and linked some of its concepts to the PhilPapers taxonomy.
    
    User's full mind map structure (for context): ${JSON.stringify(userMap)}
    User's established links: ${JSON.stringify(establishedLinks)}
    
    Provide a concise analysis with three parts:
    1.  'nonEquivalentNodes': Identify up to 3 concepts from the user's map that seem personal, idiosyncratic, or don't have a clear 1-to-1 equivalent in a standard philosophical taxonomy. For each, give a brief 'reason'.
    2.  'uncoveredCategories': Based on the user's map themes, suggest up to 3 important, related PhilPapers categories they haven't covered yet. For each, give a brief 'reason' for its relevance.
    3.  'restructuringAdvice': Provide 2-3 actionable suggestions for how the user could restructure their map to better align with or create a useful dialogue with the PhilPapers taxonomy. These should be strings in an array.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nonEquivalentNodes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { name: { type: Type.STRING }, reason: { type: Type.STRING } },
                            required: ["name", "reason"]
                        }
                    },
                    uncoveredCategories: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { name: { type: Type.STRING }, reason: { type: Type.STRING } },
                            required: ["name", "reason"]
                        }
                    },
                    restructuringAdvice: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["nonEquivalentNodes", "uncoveredCategories", "restructuringAdvice"]
            }
        }
    });

    if (!response.text) {
        throw new Error("AI response is empty");
    }

    return JSON.parse(response.text);
};
