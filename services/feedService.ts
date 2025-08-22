

import { Publication, ResearchAnalysisData } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

export const parseFeedXml = (xmlText: string, sourceUrl: string, nodeName: string, limit: number = 5): Publication[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    const errorNode = xmlDoc.querySelector("parsererror");
    const isRss = xmlDoc.querySelector("rss, channel");
    const isAtom = xmlDoc.querySelector("feed");

    if (errorNode || (!isRss && !isAtom)) {
        console.error("Failed to parse XML. Content may be HTML or invalid XML.", errorNode?.textContent);
        throw new Error("Failed to parse feed. The URL does not point to a valid RSS or Atom XML feed.");
    }

    let items = Array.from(xmlDoc.querySelectorAll("item"));
    if (items.length === 0) {
        items = Array.from(xmlDoc.querySelectorAll("entry"));
    }
    items = items.slice(0, limit);

    const publications: Publication[] = items.map(item => {
        const rawTitle = item.querySelector("title")?.textContent || 'No Title';
        const linkNode = item.querySelector("link");
        const link = linkNode?.getAttribute('href') || linkNode?.textContent?.trim() || '#';
        let fullDescription = item.querySelector("description")?.textContent ||
                              item.querySelector("summary")?.textContent ||
                              item.querySelector("content")?.textContent ||
                              '';

        let author: string | null = null;
        let title: string = rawTitle;
        const titleParts = rawTitle.split(/:\s(.+)/);
        if (titleParts.length > 1) {
            author = titleParts[0];
            title = titleParts[1];
        }
        
        const tempEl = document.createElement('div');
        tempEl.innerHTML = fullDescription;
        const linkDiv = tempEl.querySelector('div:last-child > a');
        if (linkDiv) {
            linkDiv.parentElement?.remove();
        }
        const cleanDescription = (tempEl.textContent || '').trim();

        let publicationInfo: string | null = null;
        const yearMatch = cleanDescription.match(/\b(19|20)\d{2}\b/);
        if (yearMatch && yearMatch.index !== undefined) {
            const endIndex = yearMatch.index + 4;
            publicationInfo = cleanDescription.substring(0, endIndex).trim();
        } else if (cleanDescription.length < 250 && !cleanDescription.includes(' ')) {
             publicationInfo = cleanDescription;
        }

        return { title, author, publicationInfo, link, sourceNodeName: nodeName, sourceUrl };
    });

    return publications;
};

export const fetchSingleFeed = async (url: string, nodeName: string): Promise<{ publications: Publication[] }> => {
    try {
        new URL(url);
    } catch (_) {
        throw new Error("The provided URL is not valid.");
    }

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    let response;

    try {
        response = await fetch(proxyUrl);
    } catch (error) {
        console.error("Network error during fetch:", error);
        throw new Error("Network request failed. This could be due to a connection issue, or the CORS proxy might be down.");
    }

    if (!response.ok) {
        throw new Error(`The request failed. The server responded with status: ${response.status}. The URL may be incorrect or the target server is down.`);
    }

    const xmlText = await response.text();
    if (!xmlText.trim()) {
        throw new Error("Received an empty response. The feed might be empty or the URL is incorrect.");
    }

    const publications = parseFeedXml(xmlText, url, nodeName);
    return { publications };
};

export const fetchFullFeed = async (url: string, nodeName: string, limit: number = 50): Promise<{ publications: Publication[] }> => {
    try {
        new URL(url);
    } catch (_) {
        throw new Error("The provided URL is not valid.");
    }

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    let response;
    try {
        response = await fetch(proxyUrl);
    } catch (error) {
        console.error("Network error during fetch:", error);
        throw new Error("Network request failed. This could be due to a connection issue, or the CORS proxy might be down.");
    }
    if (!response.ok) {
        throw new Error(`The request failed with status: ${response.status}. The URL may be incorrect or the server is down.`);
    }
    const xmlText = await response.text();
    if (!xmlText.trim()) {
        throw new Error("Received an empty response.");
    }
    const publications = parseFeedXml(xmlText, url, nodeName, limit);
    return { publications };
};

export const analyzeResearchTrends = async (
    ai: GoogleGenAI,
    nodeName: string,
    publications: { title: string, author: string | null }[]
): Promise<{ data: ResearchAnalysisData, provenance: any }> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = "You are a senior academic philosopher, an expert in analyzing research trends. Your task is to analyze a list of recent publications from a specific field and provide a concise, insightful overview of the current state of research, based solely on the provided titles and authors.";
    const prompt = `Based on the following list of 50 recent publications in the category of '${nodeName}', generate an analysis that includes:
- General Summary: A paragraph synthesizing the overall research focus.
- Key Themes: Identify 3-5 recurring themes. For each theme, provide a brief description and list 2-3 representative publication titles.
- Potential Debates: If the titles suggest any debates, describe the tension.
- Notable Authors: List any authors appearing more than once.
- Future Questions: Suggest 2-3 future research questions.

Publication List:
${JSON.stringify(publications)}

Your response MUST be a single JSON object, strictly following this schema:`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        generalSummary: { type: Type.STRING },
                        keyThemes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    theme: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    representativeTitles: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["theme", "description", "representativeTitles"]
                            }
                        },
                        potentialDebates: { type: Type.STRING },
                        notableAuthors: { type: Type.ARRAY, items: { type: Type.STRING } },
                        futureQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["generalSummary", "keyThemes", "potentialDebates", "notableAuthors", "futureQuestions"]
                }
            }
        });

        const data = JSON.parse(response.text);
        const { usageMetadata } = response;
        const provenance = {
            prompt: `... [prompt with ${publications.length} publications for ${nodeName}]`,
            systemInstruction,
            rawResponse: response.text,
            model,
            inputTokens: usageMetadata?.promptTokenCount,
            outputTokens: usageMetadata?.candidatesTokenCount,
            totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
        };

        return { data, provenance };
    } catch (error) {
        console.error("Error analyzing research trends:", error);
        throw error;
    }
};