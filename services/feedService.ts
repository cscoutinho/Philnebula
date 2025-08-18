
import { Publication } from '../types';

export const parseFeedXml = (xmlText: string, sourceUrl: string, nodeName: string): Publication[] => {
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
    items = items.slice(0, 5);

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
