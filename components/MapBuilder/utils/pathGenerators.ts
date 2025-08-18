import type { MapLink, MapNode } from '../../../types';

const critiqueTypes = new Set([
    'Contradiz Logicamente',
    'Apresenta um Contraexemplo para',
    'Leva a uma Reductio ad Absurdum de',
    'Oferece uma Crítica Radical a'
]);

const generateJaggedPath = (link: MapLink, sourceNode: MapNode, targetNode: MapNode): string => {
    const { x: x1, y: y1 } = sourceNode;
    const { x: x2, y: y2 } = targetNode;
    
    const seedSrc = typeof link.source === 'string' ? link.source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : link.source;
    const seedTgt = typeof link.target === 'string' ? link.target.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : link.target;
    const seed = seedSrc + seedTgt;

    const pseudoRandom = (s: number) => {
        let x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;

    const perpX = -dy;
    const perpY = dx;
    const perpLength = Math.sqrt(perpX*perpX + perpY*perpY) || 1;
    
    const jagAmount = (link.relationshipTypes.includes('Apresenta um Contraexemplo para') || link.relationshipTypes.includes('Leva a uma Reductio ad Absurdum de') ? 20 : 15) / perpLength;
    const offsetFactor = (pseudoRandom(seed) - 0.5) * 2; 

    return `M ${x1},${y1} Q ${midX + perpX * jagAmount * offsetFactor},${midY + perpY * jagAmount * offsetFactor} ${x2},${y2}`;
};

export const calculateLinkPath = (link: MapLink, nodeMap: Map<string | number, MapNode>): string => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);
    if (!sourceNode || !targetNode) return '';
    
    if (link.relationshipTypes.some(type => critiqueTypes.has(type))) {
        return generateJaggedPath(link, sourceNode, targetNode);
    }

    const { x: x1, y: y1 } = sourceNode;
    const { x: x2, y: y2 } = targetNode;

    if (link.pathStyle === 'curved') {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const curveFactor = 0.25;
        const cx = (x1 + x2) / 2 - dy * curveFactor;
        const cy = (y1 + y2) / 2 + dx * curveFactor;
        return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
    }
    return `M ${x1},${y1} L ${x2},${y2}`;
};