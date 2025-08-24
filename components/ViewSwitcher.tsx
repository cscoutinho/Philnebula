import React from 'react';
import { BrainCircuit, Network, RssIcon, NexusIcon } from './icons';

interface ViewSwitcherProps {
    currentView: 'nebula' | 'map' | 'feed' | 'nexus';
    setView: (view: 'nebula' | 'map' | 'feed' | 'nexus') => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, setView }) => {
    const baseClasses = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
    const activeClasses = "bg-cyan-500 text-white shadow-lg";
    const inactiveClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";

    return (
        <div className="flex p-1 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-600">
            <button 
                onClick={() => setView('nebula')} 
                className={`${baseClasses} ${currentView === 'nebula' ? activeClasses : inactiveClasses}`}
                aria-pressed={currentView === 'nebula'}
            >
                <Network className="w-5 h-5" />
                <span>Nebula</span>
            </button>
            <button 
                onClick={() => setView('map')} 
                className={`${baseClasses} ${currentView === 'map' ? activeClasses : inactiveClasses}`}
                aria-pressed={currentView === 'map'}
            >
                <BrainCircuit className="w-5 h-5" />
                <span>Map</span>
            </button>
            <button
                onClick={() => setView('nexus')}
                className={`${baseClasses} ${currentView === 'nexus' ? activeClasses : inactiveClasses}`}
                aria-pressed={currentView === 'nexus'}
            >
                <NexusIcon className="w-5 h-5" />
                <span>Nexus</span>
            </button>
            <button
                onClick={() => setView('feed')}
                className={`${baseClasses} ${currentView === 'feed' ? activeClasses : inactiveClasses}`}
                aria-pressed={currentView === 'feed'}
            >
                <RssIcon className="w-5 h-5" />
                <span>Feed</span>
            </button>
        </div>
    );
};

export default ViewSwitcher;
