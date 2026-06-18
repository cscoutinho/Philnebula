

import { Publication, ResearchAnalysisData } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

const PROXY_EXECUTORS = [
    // 1. AllOrigins JSON API - wraps response in JSON, bypassing raw request filters and CORS blocks
    async (url: string): Promise<string> => {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error(`AllOrigins GET status: ${response.status}`);
        }
        const json = await response.json();
        if (json && json.contents) {
            return json.contents;
        }
        throw new Error("AllOrigins GET returned empty contents");
    },
    // 2. Corsproxy.io - official URL-parameter based CORS proxy
    async (url: string): Promise<string> => {
        const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error(`Corsproxy status: ${response.status}`);
        }
        return await response.text();
    },
    // 3. AllOrigins Raw API - direct raw proxy fetch
    async (url: string): Promise<string> => {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error(`AllOrigins Raw status: ${response.status}`);
        }
        return await response.text();
    },
    // 4. Codetabs proxy - reliable fallback proxy
    async (url: string): Promise<string> => {
        const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error(`Codetabs status: ${response.status}`);
        }
        return await response.text();
    }
];

const fetchFromProxies = async (url: string): Promise<string> => {
    let lastError: Error | null = null;
    
    // 1. First and most reliable option: Our own local server-side proxy
    try {
        console.log(`Attempting to fetch via local Express server proxy: ${url}`);
        const localProxyUrl = `/api/feed?url=${encodeURIComponent(url)}`;
        const response = await fetch(localProxyUrl);
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim()) {
                const upperText = text.toUpperCase();
                if (
                    upperText.includes('<ITEM') || 
                    upperText.includes('<ENTRY') || 
                    upperText.includes('&LT;ITEM') || 
                    upperText.includes('<CHANNEL') || 
                    upperText.includes('<FEED') ||
                    upperText.includes('<RDF') ||
                    text.trim().startsWith('<?xml') || 
                    text.trim().startsWith('<')
                ) {
                    console.log(`Successfully fetched feed from local Express proxy.`);
                    return text;
                }
            }
        } else {
            console.warn(`Local Express proxy returned status ${response.status}`);
        }
    } catch (err) {
        console.warn(`Local Express proxy fetch failed:`, err);
    }
    
    // 2. Fallbacks to public client-side CORS proxies
    for (const executor of PROXY_EXECUTORS) {
        try {
            const text = await executor(url);
            if (text && text.trim()) {
                const upperText = text.toUpperCase();
                // Check if the response contains actual RSS/Atom/RDF feed elements
                if (
                    upperText.includes('<ITEM') || 
                    upperText.includes('<ENTRY') || 
                    upperText.includes('&LT;ITEM') || 
                    upperText.includes('<CHANNEL') || 
                    upperText.includes('<FEED') ||
                    upperText.includes('<RDF')
                ) {
                    return text;
                } else if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
                    // Lenient fallback for other valid XML files
                    return text;
                } else {
                    throw new Error("Response does not appear to be a valid Atom/RSS XML feed");
                }
            }
        } catch (err) {
            console.warn(`Fetch failed for proxy:`, err);
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }
    
    // 3. As a final fallback, try direct fetch without proxy
    try {
        const response = await fetch(url);
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim()) {
                return text;
            }
        }
    } catch (err) {
        console.warn(`Direct fetch failed:`, err);
    }

    throw lastError || new Error("All CORS proxies failed to retrieve the feed.");
};

const parseFeedWithRegex = (xmlText: string, sourceUrl: string, nodeName: string, limit: number = 5): Publication[] => {
    const publications: Publication[] = [];
    const itemRegex = /<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) !== null && count < limit) {
        const itemContent = match[2];
        
        const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(itemContent);
        let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : 'No Title';
        rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

        let link = '#';
        const linkHrefMatch = /<link[^>]+href=["']([^"']+)["']/i.exec(itemContent);
        if (linkHrefMatch) {
            link = linkHrefMatch[1];
        } else {
            const linkTextMatch = /<link[^>]*>([\s\S]*?)<\/link>/i.exec(itemContent);
            if (linkTextMatch) {
                link = linkTextMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
            }
        }

        const descMatch = /<(description|summary|content)[^>]*>([\s\S]*?)<\/\1>/i.exec(itemContent);
        const fullDescription = descMatch ? descMatch[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';

        let author: string | null = null;
        let title: string = rawTitle;
        const titleParts = rawTitle.split(/:\s(.+)/);
        if (titleParts.length > 1) {
            author = titleParts[0];
            title = titleParts[1];
        }

        let cleanDescription = '';
        if (fullDescription) {
            const tempEl = document.createElement('div');
            tempEl.innerHTML = fullDescription;
            cleanDescription = (tempEl.textContent || '').trim();
        }

        let publicationInfo: string | null = null;
        const yearMatch = cleanDescription.match(/\b(19|20)\d{2}\b/);
        if (yearMatch && yearMatch.index !== undefined) {
            const endIndex = yearMatch.index + 4;
            publicationInfo = cleanDescription.substring(0, endIndex).trim();
        }

        publications.push({ title, author, publicationInfo, link, sourceNodeName: nodeName, sourceUrl });
        count++;
    }

    return publications;
};

export const parseFeedXml = (xmlText: string, sourceUrl: string, nodeName: string, limit: number = 5): Publication[] => {
    const parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xmlText, "application/xml");

    const errorNode = xmlDoc.querySelector("parsererror");
    const isRss = xmlDoc.querySelector("rss, channel");
    const isAtom = xmlDoc.querySelector("feed");

    if (errorNode || (!isRss && !isAtom)) {
        console.warn("DOMParser application/xml failed or invalid feed. Trying fallback text/html parser...");
        xmlDoc = parser.parseFromString(xmlText, "text/html");
    }

    let items = Array.from(xmlDoc.querySelectorAll("item, entry, [localName='item'], [localName='entry']"));

    if (items.length === 0) {
        console.warn("DOMParser failed to find items/entry elements. Falling back to regex parsing...");
        return parseFeedWithRegex(xmlText, sourceUrl, nodeName, limit);
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

    const xmlText = await fetchFromProxies(url);
    const publications = parseFeedXml(xmlText, url, nodeName);
    return { publications };
};

export const fetchFullFeed = async (url: string, nodeName: string, limit: number = 50): Promise<{ publications: Publication[] }> => {
    try {
        new URL(url);
    } catch (_) {
        throw new Error("The provided URL is not valid.");
    }

    const xmlText = await fetchFromProxies(url);
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