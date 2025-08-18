import React from 'react';
import type { MapLink, LogicalWorkbenchState } from '../../../types';
import { FlaskConicalIcon, ScaleIcon, MessageSquareQuote, SparkleIcon, Trash2, BookOpenIcon, LightbulbIcon } from '../../icons';

interface LinkContextMenuProps {
    linkContextMenu: { x: number; y: number; link: MapLink; };
    setLogicalWorkbench: (state: LogicalWorkbenchState) => void;
    handleFormalizeArgument: (state: LogicalWorkbenchState) => void;
    setLinkContextMenu: (state: null) => void;
    setDialecticAnalysis: (state: { link: MapLink; x: number; y: number; }) => void;
    handleAnalyzeArgument: (link: MapLink) => void;
    handleExploreImplications: (link: MapLink) => void;
    generateJustification: (link: MapLink) => void;
    setEditLinkTypesMenu: (state: { anchorEl: HTMLElement, link: MapLink }) => void;
    updateLinkPathStyle: (link: MapLink, pathStyle: 'straight' | 'curved') => void;
    deleteLink: (link: MapLink) => void;
    handleAnalyzeDefinition: (link: MapLink, x: number, y: number) => void;
    onChallengeBelief: (link: MapLink, x: number, y: number) => void;
}

const challengeableTypes = new Set([
    'Dedutivamente Implica',
    'Indutivamente Sugere',
    'É a Melhor Explicação para',
    'Contradiz Logicamente',
    'Apresenta um Contraexemplo para',
    'Leva a uma Reductio ad Absurdum de',
    'Oferece uma Crítica Radical a',
]);

const analyzableTypes = new Set([
    'É uma Propriedade de', 
    'É um Tipo de', 
    'É um Token de', 
    'É uma Distinção entre', 
    'É Condição Necessária para', 
    'É Condição Suficiente para'
]);


const LinkContextMenu: React.FC<LinkContextMenuProps> = ({
    linkContextMenu,
    setLogicalWorkbench,
    handleFormalizeArgument,
    setLinkContextMenu,
    setDialecticAnalysis,
    handleAnalyzeArgument,
    handleExploreImplications,
    generateJustification,
    setEditLinkTypesMenu,
    updateLinkPathStyle,
    deleteLink,
    handleAnalyzeDefinition,
    onChallengeBelief
}) => {
    const isAnalyzable = linkContextMenu.link.relationshipTypes.some(type => analyzableTypes.has(type));
    const isChallengeable = linkContextMenu.link.relationshipTypes.some(type => challengeableTypes.has(type));

    return (
        <div className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 z-50 text-white text-sm animate-fade-in" onClick={e => e.stopPropagation()}>
            {isChallengeable && (
                <>
                    <button onClick={() => { onChallengeBelief(linkContextMenu.link, linkContextMenu.x, linkContextMenu.y); setLinkContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                        <LightbulbIcon className="w-4 h-4 text-yellow-400"/>Challenge Belief
                    </button>
                    <div className="my-1 border-t border-gray-700"></div>
                </>
            )}
            {isAnalyzable && (
                <>
                    <button onClick={() => { handleAnalyzeDefinition(linkContextMenu.link, linkContextMenu.x, linkContextMenu.y); setLinkContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                        <BookOpenIcon className="w-4 h-4 text-amber-400"/>Analyze Definition
                    </button>
                    <div className="my-1 border-t border-gray-700"></div>
                </>
            )}
            <button onClick={(e) => { const state: LogicalWorkbenchState = { mode: 'link', link: linkContextMenu.link, x: e.clientX, y: e.clientY }; setLogicalWorkbench(state); handleFormalizeArgument(state); setLinkContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                <FlaskConicalIcon className="w-4 h-4 text-teal-400"/>Logical Workbench
            </button>
            <button onClick={() => { setDialecticAnalysis({ link: linkContextMenu.link, x: linkContextMenu.x, y: linkContextMenu.y }); handleAnalyzeArgument(linkContextMenu.link); setLinkContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                <ScaleIcon className="w-4 h-4 text-lime-400"/>Analyze Argument
            </button>
            <button onClick={() => handleExploreImplications(linkContextMenu.link)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-purple-400"/>Explore Implications
            </button>
            <button onClick={() => { generateJustification(linkContextMenu.link); setLinkContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded flex items-center gap-2">
                <SparkleIcon className="w-4 h-4 text-indigo-400"/>Generate Justification
            </button>
            <div className="my-1 border-t border-gray-700"></div>
            <button onClick={(e) => { setEditLinkTypesMenu({ anchorEl: e.currentTarget, link: linkContextMenu.link }); setLinkContextMenu(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded">Edit Types</button>
            <button onClick={() => updateLinkPathStyle(linkContextMenu.link, linkContextMenu.link.pathStyle === 'straight' ? 'curved' : 'straight')} className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 rounded">Toggle Path</button>
            <div className="my-1 border-t border-gray-700"></div>
            <button onClick={() => deleteLink(linkContextMenu.link)} className="block w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/20 rounded flex items-center gap-2"><Trash2 className="w-4 h-4"/>Delete Link</button>
        </div>
    );
};

export default LinkContextMenu;