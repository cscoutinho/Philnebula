
import type { MapLink, MapNode } from '../../../types';
import { calculateLinkPath } from './pathGenerators';

export const getMidpoint = (link: MapLink, nodeMap: Map<string | number, MapNode>): {x: number, y: number} => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };
    const { x: x1, y: y1 } = sourceNode;
    const { x: x2, y: y2 } = targetNode;

    if (link.relationshipTypes.includes('Oppositional') || link.relationshipTypes.includes('Refutes') || link.pathStyle === 'curved') {
        const t = 0.5;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', calculateLinkPath(link, nodeMap));
        try {
            return path.getPointAtLength(path.getTotalLength() * t);
        } catch(e) {
            // This can happen if path has 0 length
            return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
        }
    }
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
};