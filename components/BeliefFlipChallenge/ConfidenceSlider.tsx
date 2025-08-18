import React from 'react';

interface ConfidenceSliderProps {
    value: number;
    onChange: (value: number) => void;
    label: string;
}

const ConfidenceSlider: React.FC<ConfidenceSliderProps> = ({ value, onChange, label }) => {
    const percentage = value;
    const color = `hsl(${percentage * 1.2}, 70%, 50%)`; // Hue from 0 (red) to 120 (green)

    return (
        <div className="w-full">
            <label htmlFor="confidence-slider" className="block text-sm font-medium text-gray-300 text-center mb-2">{label}</label>
            <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">Not Confident</span>
                <div className="flex-grow">
                    <input
                        id="confidence-slider"
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{'--thumb-color': color} as React.CSSProperties}
                    />
                    <style>{`
                        input[type=range]::-webkit-slider-thumb { background: var(--thumb-color); }
                        input[type=range]::-moz-range-thumb { background: var(--thumb-color); }
                    `}</style>
                </div>
                 <span className="text-xs text-gray-400">Very Confident</span>
            </div>
            <div className="text-center text-lg font-bold mt-2" style={{ color }}>{value}%</div>
        </div>
    );
};

export default ConfidenceSlider;
