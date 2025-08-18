
import React from 'react';
import { ZoomInIcon, ZoomOutIcon, DownloadIcon, CombineIcon } from '../icons';

interface MapToolbarProps {
    isExportingImg: boolean;
    isExportingJson: boolean;
    onImageExport: (format: 'png' | 'jpeg') => void;
    onJsonExport: () => void;
    isLogicVizVisible: boolean;
    setIsLogicVizVisible: (visible: boolean) => void;
    zoomLevel: number;
    setZoomLevel: React.Dispatch<React.SetStateAction<number>>; // Only for display, not control
}

const MapToolbar: React.FC<MapToolbarProps> = ({
    isExportingImg,
    isExportingJson,
    onImageExport,
    onJsonExport,
    isLogicVizVisible,
    setIsLogicVizVisible,
    zoomLevel
}) => {
    // The actual zoom action is handled by the useMapInteraction hook via mouse/trackpad.
    // These buttons are kept for accessibility and convenience, but they won't directly call handleZoom.
    // Direct d3 zoom control from React buttons is complex, so we leave it to the user's direct interaction.

    return (
        <div className="absolute bottom-5 right-5 z-40 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg p-1">
                <button 
                    onClick={() => setIsLogicVizVisible(!isLogicVizVisible)} 
                    className={`p-1.5 rounded-md ${isLogicVizVisible ? 'text-teal-300 bg-teal-800/50' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`} 
                    title="Toggle Logic Visualization"
                >
                    <CombineIcon className="w-5 h-5"/>
                </button>
                <div className="w-px h-5 bg-gray-600"></div>
                <button className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md" aria-label="Zoom out" title="Use scroll/pinch to zoom out"><ZoomOutIcon className="w-5 h-5"/></button>
                <span className="text-xs font-mono text-gray-300 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md" aria-label="Zoom in" title="Use scroll/pinch to zoom in"><ZoomInIcon className="w-5 h-5"/></button>
            </div>
             <div className="group relative">
                 <button className="p-2.5 bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700" aria-label="Export map"><DownloadIcon className="w-5 h-5"/></button>
                <div className="absolute bottom-full right-0 mb-2 w-40 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50 text-white text-sm invisible group-hover:visible" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onImageExport('png')} disabled={isExportingImg} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded disabled:opacity-50">Export as PNG</button>
                    <button onClick={() => onImageExport('jpeg')} disabled={isExportingImg} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded disabled:opacity-50">Export as JPG</button>
                    <div className="my-1 border-t border-gray-700"></div>
                    <button onClick={onJsonExport} disabled={isExportingJson} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded disabled:opacity-50">{isExportingJson ? 'Exporting...' : 'Export as JSON'}</button>
                </div>
            </div>
        </div>
    );
};

export default MapToolbar;
