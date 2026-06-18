
import React from 'react';

interface ColorPickerProps {
    colorPicker: { x: number; y: number; nodeId: number | string; };
    textColors: string[];
    handleTextColorChange: (nodeId: string | number, color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ colorPicker, textColors, handleTextColorChange }) => {
    return (
        <div className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 flex gap-2 animate-fade-in" onClick={e => e.stopPropagation()}>
            {textColors.map(color => (
                <button
                    key={color}
                    onClick={() => handleTextColorChange(colorPicker.nodeId, color)}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white"
                    style={{ backgroundColor: color }}
                    aria-label={`Set text color to ${color}`}
                />
            ))}
        </div>
    );
};

export default ColorPicker;