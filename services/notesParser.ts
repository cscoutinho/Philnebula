import { KindleNote } from '../types';

function hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
}

export function parseKindleHTML(htmlString: string): { title: string, author: string, notes: Omit<KindleNote, 'sourceId'>[] } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const title = doc.querySelector('.bookTitle')?.textContent?.trim() || 'Untitled';
    const author = doc.querySelector('.authors')?.textContent?.trim() || 'Unknown Author';

    const notes: Omit<KindleNote, 'sourceId'>[] = [];
    const bodyContainer = doc.querySelector('.bodyContainer');
    if (!bodyContainer) {
        return { title, author, notes: [] };
    }

    let currentSection = "General Notes"; // Default section for notes before any heading

    Array.from(bodyContainer.children).forEach(element => {
        if (element.classList.contains('sectionHeading')) {
            currentSection = element.textContent?.trim() || "Untitled Section";
        } else if (element.classList.contains('noteHeading')) {
            const headingEl = element;
            const nextEl = headingEl.nextElementSibling;
            
            if (nextEl && nextEl.classList.contains('noteText')) {
                const headingTextContent = headingEl.textContent || '';
                const headingText = headingTextContent.replace(/\s\([^)]+\)/, '').trim();
                const noteText = nextEl.textContent || '';

                if (noteText.trim()) {
                    const pageMatch = headingText.match(/(?:Página|Posição)\s(\d+)/);
                    const page = pageMatch ? parseInt(pageMatch[1], 10) : null;

                    const type = /nota/i.test(headingTextContent) ? 'note' : 'highlight';
                    
                    const note: Omit<KindleNote, 'sourceId'> = {
                        id: `${page || 'N'}-${hashCode(noteText.substring(0, 50))}`,
                        heading: headingText,
                        text: noteText,
                        page,
                        type,
                        section: currentSection,
                    };
                    notes.push(note);
                }
            }
        }
    });

    return { title, author, notes };
}