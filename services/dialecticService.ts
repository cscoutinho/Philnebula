import { GoogleGenAI, Type } from '@google/genai';
import { D3Node, ChallengeStep, ChallengeSession, SuggestedConcept } from '../types';

export const suggestChallengeTopics = async (
    ai: GoogleGenAI,
    belief: string,
    allNodes: D3Node[],
    sourceNodeIds: (string | number)[] = []
): Promise<{suggestions: SuggestedConcept[], provenance: any[]}> => {
    const model = 'gemini-2.5-flash';
    const provenanceLogs = [];

    // Step 1: Deconstruct the belief into core assumptions.
    const deconstructionSystemInstruction = "You are an expert philosophical analyst. Your task is to deconstruct a user's belief into its fundamental philosophical presuppositions. Respond ONLY with a JSON object.";
    const deconstructionPrompt = `A user holds the belief: "${belief}". Deconstruct this belief into its core philosophical presuppositions. Identify up to 3 distinct assumptions (e.g., metaphysical, axiological, epistemological). For each, provide a concise 'assumption' string. Respond ONLY with a JSON array of objects, each containing an 'assumption' key.`;

    const deconstructionResponse = await ai.models.generateContent({
        model,
        contents: deconstructionPrompt,
        config: {
            systemInstruction: deconstructionSystemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        assumption: { type: Type.STRING }
                    },
                    required: ["assumption"]
                }
            }
        }
    });

    const { usageMetadata: deconstructUsage } = deconstructionResponse;
    provenanceLogs.push({
        step: "Deconstruction",
        prompt: deconstructionPrompt, systemInstruction: deconstructionSystemInstruction, rawResponse: deconstructionResponse.text,
        model, inputTokens: deconstructUsage?.promptTokenCount, outputTokens: deconstructUsage?.candidatesTokenCount, totalTokens: (deconstructUsage?.promptTokenCount || 0) + (deconstructUsage?.candidatesTokenCount || 0),
    });

    const assumptionsResult = JSON.parse(deconstructionResponse.text) as { assumption: string }[];
    const assumptions = assumptionsResult.map(a => a.assumption);
    if (assumptions.length === 0) {
        throw new Error("The AI could not deconstruct the belief into underlying assumptions.");
    }
    
    // Step 2: Select the most potent challenges from the entire taxonomy.
    const selectionSystemInstruction = "You are a semantic search engine specialized in philosophy. Your task is to select the most relevant topics from a provided list that challenge a set of assumptions. Ignore weak, overly abstract, or methodological connections. Prioritize specific arguments or schools of thought.";

    const sourceIdsSet = new Set(sourceNodeIds);
    const allNodeNames = allNodes
        .filter(n =>
            !/misc|miscellaneous/i.test(n.name) &&
            !sourceIdsSet.has(n.id)
        )
        .map(n => n.name);

    const selectionPrompt = `A user holds the belief: "${belief}".
This belief rests on the following assumptions:
${JSON.stringify(assumptions)}

From the complete list of philosophical topics provided below, you MUST select the 10-15 topics that are the MOST direct and potent challenges to one or more of these assumptions.

Respond ONLY with a JSON array of strings, where each string is the exact name of a selected topic from the list.

LIST OF ALL TOPICS:
${JSON.stringify(allNodeNames)}
`;
    
    const selectionResponse = await ai.models.generateContent({
        model,
        contents: selectionPrompt,
        config: {
            systemInstruction: selectionSystemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    
    const { usageMetadata: selectionUsage } = selectionResponse;
    provenanceLogs.push({
        step: "Selection",
        prompt: `... [selection prompt with ${allNodeNames.length} topics]`, // Truncated for logging
        systemInstruction: selectionSystemInstruction, 
        rawResponse: selectionResponse.text,
        model, 
        inputTokens: selectionUsage?.promptTokenCount, 
        outputTokens: selectionUsage?.candidatesTokenCount, 
        totalTokens: (selectionUsage?.promptTokenCount || 0) + (selectionUsage?.candidatesTokenCount || 0),
    });
    
    const selectedTopicNames = JSON.parse(selectionResponse.text) as string[];
    const matchedNodes = allNodes.filter(node => selectedTopicNames.includes(node.name));
    
    if (matchedNodes.length < 5) {
        throw new Error("Could not find enough relevant concepts in the taxonomy to build a challenge path.");
    }
    
    // Step 3: Generate a rationale for why each matched concept is a good challenger.
    const rationaleSystemInstruction = "You are a philosophy educator. For each topic provided, explain in one concise sentence why it would challenge a specific user belief by targeting one of its core assumptions. Respond ONLY in JSON.";
    const rationalePrompt = `A user holds the belief: "${belief}". This belief rests on assumptions like: ${JSON.stringify(assumptions)}.

For each of the following topics, provide a one-sentence 'rationale' explaining how it challenges the user's belief, ideally by referencing one of the assumptions.
    
Topics: ${JSON.stringify(matchedNodes.map(n => n.name))}
    
Respond with a JSON array of objects, each containing 'topicName' and 'rationale'.`;

    const rationaleResponse = await ai.models.generateContent({
        model,
        contents: rationalePrompt,
        config: {
            systemInstruction: rationaleSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topicName: { type: Type.STRING },
                        rationale: { type: Type.STRING }
                    },
                    required: ["topicName", "rationale"]
                }
            }
        }
    });

    const { usageMetadata: rUsage } = rationaleResponse;
    provenanceLogs.push({
        step: "Rationale Generation",
        prompt: rationalePrompt, systemInstruction: rationaleSystemInstruction, rawResponse: rationaleResponse.text,
        model, inputTokens: rUsage?.promptTokenCount, outputTokens: rUsage?.candidatesTokenCount, totalTokens: (rUsage?.promptTokenCount || 0) + (rUsage?.candidatesTokenCount || 0),
    });

    const rationalesData = JSON.parse(rationaleResponse.text) as { topicName: string; rationale: string }[];
    const rationaleMap = new Map<string, string>(rationalesData.map((item) => [item.topicName, item.rationale]));
    
    const suggestions: SuggestedConcept[] = matchedNodes.map(node => ({
        nodeId: node.id,
        topicName: node.name,
        rationale: rationaleMap.get(node.name) || "This concept offers a valuable alternative perspective."
    }));

    return { suggestions, provenance: provenanceLogs };
};


export const buildChallengePathFromSelection = async (
    ai: GoogleGenAI,
    belief: string,
    selectedConcepts: SuggestedConcept[]
): Promise<{ path: ChallengeStep[], provenance: any }> => {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = "You are an expert educator. Your task is to organize a list of challenging topics into a logical pedagogical sequence and create learning materials for each. Respond ONLY with a JSON array.";
    const prompt = `A user holds the belief: "${belief}". They have selected the following topics to build their challenge path. Your task is to:
1. Re-order these topics into the most logical learning sequence, from foundational to more advanced.
2. For each topic in the sequence, generate:
   - a concise one-sentence 'summary' of the concept.
   - a single 'provocativeQuestion' to make the user reflect on their belief in light of this concept.
Here is the list of user-selected topics: ${JSON.stringify(selectedConcepts.map(c => c.topicName))}`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.8,
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topicName: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        provocativeQuestion: { type: Type.STRING },
                    },
                    required: ["topicName", "summary", "provocativeQuestion"]
                }
            }
        }
    });

    const sequencedPathData = JSON.parse(response.text);

    const conceptMap = new Map(selectedConcepts.map(c => [c.topicName, c]));
    const challengePath: ChallengeStep[] = sequencedPathData.map((step: any) => ({
        nodeId: conceptMap.get(step.topicName)!.nodeId,
        topicName: step.topicName,
        summary: step.summary,
        provocativeQuestion: step.provocativeQuestion,
        rationale: conceptMap.get(step.topicName)!.rationale,
        status: 'pending' as const
    })).filter((step: ChallengeStep) => step.nodeId !== undefined);
    
    const { usageMetadata } = response;
    const provenance = {
        step: "Path Building",
        prompt, systemInstruction, rawResponse: response.text,
        model, inputTokens: usageMetadata?.promptTokenCount, outputTokens: usageMetadata?.candidatesTokenCount, totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
    };
    
    return { path: challengePath, provenance };
};

export const generateFinalSynthesis = async (
    ai: GoogleGenAI,
    session: ChallengeSession
): Promise<{synthesis: string, provenance: any}> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are an objective philosophical analyst. Your role is to provide a neutral and insightful meta-analysis of a user's intellectual journey. Avoid praise, personal opinions, or colloquial language. Focus on identifying patterns, inflection points, and proposing reflective questions. The response must be structured and academic, using markdown for formatting.";
    
    const confidenceJourney = session.challengePath
        .filter(step => step.status === 'completed' && step.userConfidence !== undefined)
        .map(step => ` - After considering **${step.topicName}**, confidence shifted to ${step.userConfidence}/100.`)
        .join('\n');

    const prompt = `A user started with the belief "${session.beliefStatement.belief}" with an initial confidence of ${session.beliefStatement.initialConfidence}/100.
Their confidence evolved as follows through a series of conceptual challenges:
${confidenceJourney}

Perform a meta-analysis of this intellectual journey. Your response must be structured using markdown and include the following sections, using bold for headings:

**Objective Synthesis**
A single sentence summarizing the overall change in confidence.

**Trajectory Analysis**
A bulleted list identifying patterns or key moments in their confidence shifts. Note if certain types of concepts (e.g., epistemological, ethical) had more impact than others.

**Pivotal Concept**
Identify the single concept that caused the most significant change. Hypothesize why this concept was so impactful for their stated belief.

**Questions for Future Reflection**
A numbered list of 2-3 new, insightful philosophical questions that arise from the user's specific trajectory, encouraging further thought.

Do not use a congratulatory or emotional tone. Maintain a neutral, analytical perspective.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
            systemInstruction,
            temperature: 0.7
        }
    });
    
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
    
    return { synthesis: response.text, provenance };
};