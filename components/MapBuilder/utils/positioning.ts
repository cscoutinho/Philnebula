
import { useState, useRef, useEffect } from 'react';

export function useFloatingPosition(
    state: { x: number; y: number } | { anchorEl: HTMLElement } | null,
    options: { offsetX?: number; offsetY?: number; centered?: boolean, strategy?: 'flip' | 'push' } = {}
) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        position: 'fixed',
        pointerEvents: 'none',
        visibility: 'hidden',
        transition: 'opacity 0.1s ease-out',
    });

    useEffect(() => {
        if (!state || !elementRef.current) {
            setStyle(prev => ({ ...prev, opacity: 0, pointerEvents: 'none', visibility: 'hidden' }));
            return;
        }
        
        const timer = setTimeout(() => {
            if (!elementRef.current) return;
            
            const element = elementRef.current;
            const elementRect = element.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;
            const { offsetX = 0, offsetY = 0, centered = false, strategy = 'push' } = options;

            let anchorRect: { top: number, right: number, bottom: number, left: number, width: number, height: number };
            if ('anchorEl' in state) {
                anchorRect = state.anchorEl.getBoundingClientRect();
            } else {
                anchorRect = { top: state.y, right: state.x, bottom: state.y, left: state.x, width: 0, height: 0 };
            }

            let top = anchorRect.top + offsetY;
            let left = 'anchorEl' in state ? anchorRect.right + offsetX : anchorRect.left + offsetX;
            
            if (centered) {
                 top = anchorRect.top - elementRect.height / 2;
                 left = anchorRect.left - elementRect.width / 2;
            }

            if (strategy === 'flip') {
                 const overflowsRight = left + elementRect.width > innerWidth - 10;
                 const canFlipLeft = ('anchorEl' in state) && (anchorRect.left - elementRect.width - offsetX > 10);
                 if (overflowsRight && canFlipLeft) {
                    left = anchorRect.left - elementRect.width - offsetX;
                 }
            }

            if (left + elementRect.width > innerWidth - 10) {
                left = innerWidth - elementRect.width - 10;
            }
            if (top + elementRect.height > innerHeight - 10) {
                top = innerHeight - elementRect.height - 10;
            }
            if (left < 10) left = 10;
            if (top < 10) top = 10;

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                opacity: 1,
                pointerEvents: 'auto',
                visibility: 'visible',
                transition: 'opacity 0.1s ease-out',
            });
        }, 0); // Use timeout to allow element to render and get its rect

        return () => clearTimeout(timer);
    }, [state, options.offsetX, options.offsetY, options.centered, options.strategy]);

    return { ref: elementRef, style };
}