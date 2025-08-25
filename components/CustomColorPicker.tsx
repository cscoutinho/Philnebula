
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Color conversion utilities
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
};

const rgbToHsv = ({ r, g, b }: { r: number; g: number; b: number }) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = ({ h, s, v }: { h: number; s: number; v: number }) => {
    s /= 100; v /= 100;
    const i = Math.floor((h / 360) * 6);
    const f = (h / 360) * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r=0, g=0, b=0;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
    '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

const Slider: React.FC<{ label: string, background: string, value: number, onValueChange: (value: number) => void, max: number, 'aria-label': string }> = 
    ({ label, background, value, onValueChange, max, 'aria-label': ariaLabel }) => {
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleInteraction = useCallback((e: React.PointerEvent | PointerEvent) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const newValue = Math.max(0, Math.min(max, ((e.clientX - rect.left) / rect.width) * max));
        onValueChange(newValue);
    }, [max, onValueChange]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        sliderRef.current?.setPointerCapture(e.pointerId);
        handleInteraction(e);
        
        const handlePointerMove = (moveEvent: PointerEvent) => {
            handleInteraction(moveEvent);
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            sliderRef.current?.releasePointerCapture(upEvent.pointerId);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }, [handleInteraction]);

    const thumbPosition = `${(value / max) * 100}%`;

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300">{label}</label>
            <div
                ref={sliderRef}
                onPointerDown={handlePointerDown}
                className="relative w-full h-6 rounded-md cursor-pointer mt-1"
                style={{ background }}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-label={ariaLabel}
                tabIndex={0}
            >
                <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-gray-300 shadow-lg"
                    style={{ left: thumbPosition }}
                />
            </div>
        </div>
    );
};


interface CustomColorPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSetColor: (color: string) => void;
    initialColor: string;
}

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ isOpen, onClose, onSetColor, initialColor }) => {
    const [hsv, setHsv] = useState({ h: 0, s: 100, v: 100 });

    useEffect(() => {
        if (isOpen) {
            setHsv(rgbToHsv(hexToRgb(initialColor)));
        }
    }, [isOpen, initialColor]);

    if (!isOpen) return null;
    
    const currentColorHex = rgbToHex(hsvToRgb(hsv));
    const pureHueHex = rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 }));

    const handleSet = () => {
        onSetColor(currentColorHex);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-picker-title"
        >
            <div 
                className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-full max-w-xs text-white p-4 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h2 id="color-picker-title" className="text-lg font-bold">Select Color</h2>
                
                <Slider 
                    label="Hue"
                    background="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
                    value={hsv.h}
                    onValueChange={h => setHsv(prev => ({ ...prev, h }))}
                    max={360}
                    aria-label="Hue"
                />
                <Slider 
                    label="Saturation"
                    background={`linear-gradient(to right, #fff, ${pureHueHex})`}
                    value={hsv.s}
                    onValueChange={s => setHsv(prev => ({ ...prev, s }))}
                    max={100}
                    aria-label="Saturation"
                />
                <Slider 
                    label="Value"
                    background={`linear-gradient(to right, #000, ${pureHueHex})`}
                    value={hsv.v}
                    onValueChange={v => setHsv(prev => ({ ...prev, v }))}
                    max={100}
                    aria-label="Value"
                />

                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-400">Chosen Color</span>
                    <div className="w-10 h-10 rounded-md border border-gray-500" style={{ backgroundColor: currentColorHex }} />
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700 font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSet} className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-700 font-semibold transition-colors">
                        Set
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomColorPicker;
