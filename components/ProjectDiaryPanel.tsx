import React, { useState, useMemo, useEffect } from 'react';
import { ProjectActivity, ProjectActivityType } from '../types';
import { ChevronLeft, BrainCircuit, Network, PlusCircle, LinkIcon, RssIcon, SparkleIcon, DiaryIcon, ExternalLinkIcon, ReplaceIcon, HistoryIcon, MessageSquareQuote, ScaleIcon, FlaskConicalIcon, Edit, LightbulbIcon, Check, RefreshCw, BookOpenIcon, StickyNoteIcon, GraduationCapIcon, MicrophoneIcon, Trash2, MessageSquarePlus, Search, X } from './icons';

interface ProjectDiaryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    entries: ProjectActivity[];
}

const timeAgo = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 2) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const ActivityIcon: React.FC<{ type: ProjectActivity['type'] }> = ({ type }) => {
    switch (type) {
        case 'EXPLORE_CONCEPT': return <Network className="w-4 h-4 text-cyan-400" />;
        case 'FIND_RELATED': return <SparkleIcon className="w-4 h-4 text-purple-400" />;
        case 'ADD_TO_TRAY': return <PlusCircle className="w-4 h-4 text-yellow-400" />;
        case 'CREATE_MAP_LINK': return <LinkIcon className="w-4 h-4 text-blue-400" />;
        case 'CREATE_USER_NODE': return <Edit className="w-4 h-4 text-white" />;
        case 'ADD_FEED': return <RssIcon className="w-4 h-4 text-green-400" />;
        case 'VIEW_PUBLICATION': return <ExternalLinkIcon className="w-4 h-4 text-sky-400" />;
        case 'ANALYZE_GENEALOGY': return <HistoryIcon className="w-4 h-4 text-amber-400" />;
        case 'EXPLORE_IMPLICATIONS': return <MessageSquareQuote className="w-4 h-4 text-indigo-400" />;
        case 'CHANGE_CONCEPT': return <ReplaceIcon className="w-4 h-4 text-orange-400" />;
        case 'SYNTHESIZE_REGION': return <SparkleIcon className="w-4 h-4 text-purple-400" />;
        case 'ANALYZE_ARGUMENT': return <ScaleIcon className="w-4 h-4 text-lime-400" />;
        case 'FORMALIZE_ARGUMENT': return <FlaskConicalIcon className="w-4 h-4 text-teal-400" />;
        case 'CREATE_LOGICAL_CONSTRUCT': return <FlaskConicalIcon className="w-4 h-4 text-teal-500" />;
        case 'GENERATE_JUSTIFICATION': return <SparkleIcon className="w-4 h-4 text-indigo-400" />;
        case 'EDIT_NOTE': return <Edit className="w-4 h-4 text-yellow-300" />;
        case 'ASK_AI_ASSISTANT': return <SparkleIcon className="w-4 h-4 text-purple-400" />;
        case 'INITIATE_BELIEF_CHALLENGE_FROM_MAP': return <LightbulbIcon className="w-4 h-4 text-yellow-400" />;
        case 'START_BELIEF_CHALLENGE': return <LightbulbIcon className="w-4 h-4 text-yellow-400" />;
        case 'BUILD_BELIEF_CHALLENGE_PATH': return <BrainCircuit className="w-4 h-4 text-yellow-500" />;
        case 'COMPLETE_BELIEF_CHALLENGE': return <Check className="w-4 h-4 text-green-400" />;
        case 'IMPORT_NOTES': return <BookOpenIcon className="w-4 h-4 text-cyan-400" />;
        case 'ADD_NOTE_TO_MAP': return <StickyNoteIcon className="w-4 h-4 text-yellow-400" />;
        case 'APPEND_NOTE_TO_NODE': return <MessageSquarePlus className="w-4 h-4 text-cyan-400" />;
        case 'SOCRATIC_ACTION_TAKEN': return <LightbulbIcon className="w-4 h-4 text-purple-400" />;
        case 'ANALYZE_RESEARCH_TRENDS': return <GraduationCapIcon className="w-4 h-4 text-blue-400" />;
        case 'VOICE_NOTE': return <MicrophoneIcon className="w-4 h-4 text-fuchsia-400" />;
        case 'CREATE_NOTE': return <StickyNoteIcon className="w-4 h-4 text-green-400" />;
        case 'DELETE_NOTE': return <Trash2 className="w-4 h-4 text-red-400" />;
        default: return <BrainCircuit className="w-4 h-4 text-gray-400" />;
    }
};

const socraticStyles: Record<string, { name: string, color: string }> = {
    counterexample: { name: 'Counterexample', color: 'bg-red-500/20 text-red-300' },
    alternative_hypothesis: { name: 'Alternative Hypothesis', color: 'bg-yellow-500/20 text-yellow-300' },
};

const socraticActionNames: Record<string, string> = {
    add_counterexample: 'Add Counterexample',
    add_alternative_hypothesis: 'Add Alternative',
    refine_link: 'Refine Link',
    remove_link: 'Remove Link',
};

// This function generates the searchable text content for an activity, mirroring the ActivityText component.
const getActivityText = (activity: ProjectActivity): string => {
    const { type, payload } = activity;
    switch (type) {
        case 'SOCRATIC_ACTION_TAKEN':
            return `Socratic Action Taken: ${socraticActionNames[payload.action] || payload.action} - ${socraticStyles[payload.movement]?.name || payload.movement}`;
        case 'EXPLORE_CONCEPT':
            return `Explored '${payload.conceptName}' in the Nebula.`;
        case 'FIND_RELATED':
            return `Searched for concepts related to '${payload.conceptName}'.`;
        case 'ADD_TO_TRAY':
            return `Added '${payload.conceptName}' to the Map Tray.`;
        case 'CREATE_MAP_LINK':
            return `Linked '${payload.sourceName}' to '${payload.targetName}'.`;
        case 'CREATE_USER_NODE':
            return `Created a new concept: '${payload.conceptName}'.`;
        case 'ADD_FEED':
            return `Started tracking a new feed for '${payload.conceptName}'.`;
        case 'VIEW_PUBLICATION':
            return `Viewed publication '${payload.publicationTitle}' from the '${payload.sourceNodeName}' feed.`;
        case 'ANALYZE_GENEALOGY':
            return `Analyzed genealogy of '${payload.conceptName}'.`;
        case 'EXPLORE_IMPLICATIONS':
            return `Explored implications between '${payload.sourceName}' and '${payload.targetName}'.`;
        case 'CHANGE_CONCEPT':
            return `Replaced '${payload.oldConceptName}' with '${payload.newConceptName}' on the map.`;
        case 'SYNTHESIZE_REGION':
            return `Synthesized '${payload.newConceptName}' from ${payload.sourceConceptCount} concepts.`;
        case 'ANALYZE_ARGUMENT':
             return `Analyzed the argument between '${payload.sourceName}' and '${payload.targetName}'.`;
        case 'FORMALIZE_ARGUMENT':
            const premiseText = payload.premiseNames ? `premises '${payload.premiseNames.join(', ')}'` : `premise '${payload.sourceName}'`;
            return `Formalized the argument from ${premiseText} to '${payload.conclusionName || payload.targetName}'.`;
        case 'CREATE_LOGICAL_CONSTRUCT':
            return `Created a logical construct for the argument concluding in '${payload.conclusionName}'.`;
        case 'GENERATE_JUSTIFICATION':
            return `Generated justification for the link between '${payload.sourceName}' and '${payload.targetName}'.`;
        case 'EDIT_NOTE':
            return `Edited note '${payload.noteTitle}' for '${payload.conceptName}'.`;
        case 'ASK_AI_ASSISTANT':
            const context = payload.isFollowUp ? 'Follow-up with AI' : 'Used AI Assistant';
            return `${context}${payload.context ? ` on "${payload.context}"` : ''}: "${payload.userInstruction}"`;
        case 'INITIATE_BELIEF_CHALLENGE_FROM_MAP':
            return `Initiated challenge from map link: "${payload.generatedBelief}".`;
        case 'START_BELIEF_CHALLENGE':
            return `Started belief challenge: "${payload.belief}"`;
        case 'BUILD_BELIEF_CHALLENGE_PATH':
             return `Built a personalized challenge path with ${payload.conceptCount} topics for the belief "${payload.belief}"`;
        case 'COMPLETE_BELIEF_CHALLENGE':
            return `Completed belief challenge on "${payload.belief}".`;
        case 'IMPORT_NOTES':
            return `Imported ${payload.noteCount} notes from '${payload.title}'.`;
        case 'ADD_NOTE_TO_MAP':
            return `Added note as '${payload.synthesizedTitle}' from '${payload.title}'.`;
        case 'APPEND_NOTE_TO_NODE':
            return `Appended ${payload.noteCount} note${payload.noteCount > 1 ? 's' : ''} from '${payload.sourceTitle}' to '${payload.conceptName}'.`;
        case 'ANALYZE_RESEARCH_TRENDS':
            return `Analyzed research trends for '${payload.conceptName}' using ${payload.publicationCount} publications.`;
        case 'VOICE_NOTE':
            return `Transcribed a voice note in '${payload.conceptName}'.`;
        case 'CREATE_NOTE':
            return `Created note '${payload.noteTitle}' in '${payload.conceptName}'.`;
        case 'DELETE_NOTE':
            return `Deleted note '${payload.noteTitle}' from '${payload.conceptName}'.`;
        default:
            return type;
    }
};

const ActivityText: React.FC<{ activity: ProjectActivity }> = ({ activity }) => {
    const { type, payload } = activity;
    switch (type) {
        case 'SOCRATIC_ACTION_TAKEN': {
            const style = socraticStyles[payload.movement] || { name: payload.movement, color: 'bg-gray-500/20 text-gray-300' };
            const actionName = socraticActionNames[payload.action] || payload.action;
            return (
                <>
                    Socratic Action Taken: <span className="font-bold text-gray-100">{actionName}</span>
                    <div className="mt-1.5 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
                            {style.name}
                        </span>
                    </div>
                </>
            );
        }
        case 'EXPLORE_CONCEPT':
            return <>Explored <span className="font-bold text-gray-100">'{payload.conceptName}'</span> in the Nebula.</>;
        case 'FIND_RELATED':
            return <>Searched for concepts related to <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'ADD_TO_TRAY':
            return <>Added <span className="font-bold text-gray-100">'{payload.conceptName}'</span> to the Map Tray.</>;
        case 'CREATE_MAP_LINK':
            return <>Linked <span className="font-bold text-gray-100">'{payload.sourceName}'</span> to <span className="font-bold text-gray-100">'{payload.targetName}'</span>.</>;
        case 'CREATE_USER_NODE':
            return <>Created a new concept: <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'ADD_FEED':
            return <>Started tracking a new feed for <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'VIEW_PUBLICATION':
            return <>Viewed publication <a href={payload.publicationLink} target="_blank" rel="noopener noreferrer" className="font-bold text-cyan-300 hover:underline">'{payload.publicationTitle}'</a> from the '{payload.sourceNodeName}' feed.</>;
        case 'ANALYZE_GENEALOGY':
            return <>Analyzed genealogy of <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'EXPLORE_IMPLICATIONS':
            return <>Explored implications between <span className="font-bold text-gray-100">'{payload.sourceName}'</span> and <span className="font-bold text-gray-100">'{payload.targetName}'</span>.</>;
        case 'CHANGE_CONCEPT':
            return <>Replaced <span className="font-bold text-gray-100">'{payload.oldConceptName}'</span> with <span className="font-bold text-gray-100">'{payload.newConceptName}'</span> on the map.</>;
        case 'SYNTHESIZE_REGION':
            return <>Synthesized <span className="font-bold text-gray-100">'{payload.newConceptName}'</span> from {payload.sourceConceptCount} concepts.</>;
        case 'ANALYZE_ARGUMENT':
             return <>Analyzed the argument between <span className="font-bold text-gray-100">'{payload.sourceName}'</span> and <span className="font-bold text-gray-100">'{payload.targetName}'</span>.</>;
        case 'FORMALIZE_ARGUMENT':
            const premiseText = payload.premiseNames ? `premises '${payload.premiseNames.join(', ')}'` : `premise '${payload.sourceName}'`;
            return <>Formalized the argument from {premiseText} to <span className="font-bold text-gray-100">'{payload.conclusionName || payload.targetName}'</span>.</>;
        case 'CREATE_LOGICAL_CONSTRUCT':
            return <>Created a logical construct for the argument concluding in <span className="font-bold text-gray-100">'{payload.conclusionName}'</span>.</>;
        case 'GENERATE_JUSTIFICATION':
            return <>Generated justification for the link between <span className="font-bold text-gray-100">'{payload.sourceName}'</span> and <span className="font-bold text-gray-100">'{payload.targetName}'</span>.</>;
        case 'EDIT_NOTE':
            return <>Edited note <span className="font-bold text-gray-100">'{payload.noteTitle}'</span> for <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'ASK_AI_ASSISTANT':
            const context = payload.isFollowUp ? 'Follow-up with AI' : 'Used AI Assistant';
            return <>{context}{payload.context ? ` on "${payload.context}"` : ''}: <span className="italic text-gray-300">"{payload.userInstruction}"</span></>;
        case 'INITIATE_BELIEF_CHALLENGE_FROM_MAP':
            return <>Initiated challenge from map link: <span className="italic text-gray-300">"{payload.generatedBelief}"</span>.</>;
        case 'START_BELIEF_CHALLENGE':
            return <>Started belief challenge: <span className="italic text-gray-300">"{payload.belief}"</span></>;
        case 'BUILD_BELIEF_CHALLENGE_PATH':
             return <>Built a personalized challenge path with <span className="font-bold text-gray-100">{payload.conceptCount}</span> topics for the belief <span className="italic text-gray-300">"{payload.belief}"</span></>;
        case 'COMPLETE_BELIEF_CHALLENGE':
            return <>Completed belief challenge on <span className="italic text-gray-300">"{payload.belief}"</span>.</>;
        case 'IMPORT_NOTES':
            return <>Imported {payload.noteCount} notes from <span className="font-bold text-gray-100">'{payload.title}'</span>.</>;
        case 'ADD_NOTE_TO_MAP':
            return <>Added note as <span className="font-bold text-gray-100">'{payload.synthesizedTitle}'</span> from '{payload.title}'.</>;
        case 'APPEND_NOTE_TO_NODE':
            return <>Appended {payload.noteCount} note{payload.noteCount > 1 ? 's' : ''} from <span className="font-bold text-gray-100">'{payload.sourceTitle}'</span> to <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'ANALYZE_RESEARCH_TRENDS':
            return <>Analyzed research trends for <span className="font-bold text-gray-100">'{payload.conceptName}'</span> using {payload.publicationCount} publications.</>;
        case 'VOICE_NOTE':
            return <>Transcribed a voice note in <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'CREATE_NOTE':
            return <>Created note <span className="font-bold text-gray-100">'{payload.noteTitle}'</span> in <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        case 'DELETE_NOTE':
            return <>Deleted note <span className="font-bold text-gray-100">'{payload.noteTitle}'</span> from <span className="font-bold text-gray-100">'{payload.conceptName}'</span>.</>;
        default:
            return <>{type}</>;
    }
};


const ProjectDiaryPanel: React.FC<ProjectDiaryPanelProps> = ({ isOpen, onClose, entries }) => {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) {
            return entries;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return entries.filter(entry =>
            getActivityText(entry).toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, entries]);


    return (
        <div 
            className={`fixed top-0 left-0 h-full bg-black/80 backdrop-blur-md border-r border-gray-600 z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-96 flex flex-col`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="diary-title"
        >
            <div className="flex flex-col p-4 border-b border-gray-600 flex-shrink-0 gap-4">
                <div className="flex justify-between items-center">
                    <h3 id="diary-title" className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                        <DiaryIcon className="w-6 h-6"/>
                        Project Diary
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close project diary">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </div>
                 <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search diary..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 pl-9 pr-8 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        aria-label="Search diary entries"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            {filteredEntries.length > 0 ? (
                <ul className="p-2 overflow-y-auto flex-grow">
                    {filteredEntries.map(activity => (
                        <li key={activity.id} className="p-3 mb-1.5 bg-gray-800/50 rounded-md">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 flex-shrink-0">
                                    <ActivityIcon type={activity.type} />
                                </div>
                                <div className="flex-grow">
                                    <div className="text-sm text-gray-300 leading-snug">
                                        <ActivityText activity={activity} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{timeAgo(activity.timestamp)}</p>
                                    
                                    {activity.payload.provenance && (
                                        <details className="mt-2 text-xs group">
                                            <summary className="cursor-pointer text-gray-500 hover:text-gray-300 list-none group-open:text-gray-300 flex items-center gap-1">
                                                <ChevronLeft className="w-3 h-3 transition-transform transform group-open:-rotate-90" />
                                                Show Provenance
                                            </summary>
                                            <div className="mt-2 ml-2 pl-3 border-l border-gray-700 space-y-2">
                                                <div>
                                                    <h5 className="font-semibold text-gray-400">Model:</h5>
                                                    <p className="font-mono text-gray-500">{activity.payload.provenance.model}</p>
                                                </div>
                                                {activity.payload.provenance.totalTokens != null && (
                                                    <div>
                                                        <h5 className="font-semibold text-gray-400">Tokens:</h5>
                                                        <p className="font-mono text-gray-500 text-[11px]">
                                                            Total: {activity.payload.provenance.totalTokens} (Input: {activity.payload.provenance.inputTokens}, Output: {activity.payload.provenance.outputTokens})
                                                        </p>
                                                    </div>
                                                )}
                                                {activity.payload.provenance.systemInstruction && (
                                                     <div>
                                                        <h5 className="font-semibold text-gray-400">System Instruction:</h5>
                                                        <pre className="whitespace-pre-wrap font-mono text-gray-500 bg-black/30 p-1.5 rounded text-[11px]">{activity.payload.provenance.systemInstruction}</pre>
                                                    </div>
                                                )}
                                                <div>
                                                    <h5 className="font-semibold text-gray-400">Prompt:</h5>
                                                    <pre className="whitespace-pre-wrap font-mono text-gray-500 bg-black/30 p-1.5 rounded text-[11px] max-h-32 overflow-y-auto">{activity.payload.provenance.prompt}</pre>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold text-gray-400">Raw Response:</h5>
                                                    <pre className="whitespace-pre-wrap font-mono text-gray-500 bg-black/30 p-1.5 rounded text-[11px] max-h-40 overflow-y-auto">{activity.payload.provenance.rawResponse}</pre>
                                                </div>
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="p-4 text-center text-gray-400 text-sm flex-grow flex flex-col items-center justify-center">
                    <BrainCircuit className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="font-semibold">
                        {searchQuery ? 'No matching activities found.' : 'Your project activity will be logged here.'}
                    </p>
                    <p className="mt-2 text-xs">
                        {searchQuery ? `Try a different search term.` : 'Explore concepts, build your map, and track feeds to see your history unfold.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProjectDiaryPanel;