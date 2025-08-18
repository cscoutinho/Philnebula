
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
    const noteHeadings = doc.querySelectorAll('.noteHeading');

    noteHeadings.forEach(headingEl => {
        const nextEl = headingEl.nextElementSibling;
        if (nextEl && nextEl.classList.contains('noteText')) {
            const headingTextContent = headingEl.textContent || '';
            // Remove color parenthetical, e.g., " (yellow)"
            const headingText = headingTextContent.replace(/\s\([^)]+\)/, '').trim();
            const noteText = nextEl.textContent || '';

            if (noteText.trim()) {
                const pageMatch = headingText.match(/Página (\d+)/);
                const page = pageMatch ? parseInt(pageMatch[1], 10) : null;

                const type = /nota/i.test(headingTextContent) ? 'note' : 'highlight';
                
                const note: Omit<KindleNote, 'sourceId'> = {
                    id: `${page || 'N'}-${hashCode(noteText.substring(0, 50))}`,
                    heading: headingText,
                    text: noteText,
                    page,
                    type,
                };
                notes.push(note);
            }
        }
    });

    return { title, author, notes };
}
