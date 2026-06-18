
import React, { useState, useRef, useEffect } from 'react';
import type { Project, ConfirmationRequestHandler } from '../types';
import { BrainCircuit, Check, ChevronsUpDown, Edit, Plus, Trash2, X, Archive } from './icons';

interface ProjectSwitcherProps {
    projects: Project[];
    activeProject: Project | null;
    onCreateProject: (name: string) => void;
    onSwitchProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onArchiveProject: (projectId: string) => void;
    onUnarchiveProject: (projectId: string) => void;
    onRequestConfirmation: ConfirmationRequestHandler;
}

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
    projects,
    activeProject,
    onCreateProject,
    onSwitchProject,
    onDeleteProject,
    onRenameProject,
    onArchiveProject,
    onUnarchiveProject,
    onRequestConfirmation,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const newProjectInputRef = useRef<HTMLInputElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // Separar projetos ativos e arquivados
    const activeProjects = projects.filter(p => !p.isArchived);
    const archivedProjects = projects.filter(p => p.isArchived);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
                setEditingProjectId(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);
    
    useEffect(() => {
        if (isCreating && newProjectInputRef.current) {
            newProjectInputRef.current.focus();
        }
    }, [isCreating]);
    
     useEffect(() => {
        if (editingProjectId && renameInputRef.current) {
            renameInputRef.current.focus();
        }
    }, [editingProjectId]);


    const handleCreate = () => {
        if (newProjectName.trim()) {
            onCreateProject(newProjectName.trim());
            setNewProjectName('');
            setIsCreating(false);
            setIsOpen(false);
        }
    };
    
    const handleRename = () => {
        if (editingProjectId && editingName.trim()) {
            onRenameProject(editingProjectId, editingName.trim());
        }
        setEditingProjectId(null);
    };

    if (!activeProject) {
        return null;
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 w-72 p-2.5 bg-gray-800 text-white rounded-lg border border-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <BrainCircuit className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <span className="flex-grow text-left font-semibold truncate">{activeProject.name}</span>
                <ChevronsUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 p-2 animate-fade-in">
                    <div className="max-h-60 overflow-y-auto">
                        {/* Projetos Ativos */}
                        {activeProjects.length > 0 && (
                            <>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">
                                    Projetos Ativos
                                </div>
                                <ul role="listbox">
                                    {activeProjects.map(project => (
                                        <li key={project.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-800" role="option" aria-selected={project.id === activeProject?.id}>
                                            {editingProjectId === project.id ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <input
                                                        ref={renameInputRef}
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onBlur={handleRename}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                                        className="flex-grow bg-gray-700 border border-cyan-500 rounded px-2 py-1 text-sm focus:outline-none"
                                                    />
                                                    <button onClick={handleRename} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4"/></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => { onSwitchProject(project.id); setIsOpen(false); }} className="flex items-center gap-2 flex-grow text-left">
                                                        {project.id === activeProject?.id ? (
                                                            <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-4 h-4 flex-shrink-0"></div>
                                                        )}
                                                        <span className="truncate">{project.name}</span>
                                                    </button>
                                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setEditingProjectId(project.id); setEditingName(project.name);}} 
                                                            className="p-1 text-gray-400 hover:text-cyan-400"
                                                            aria-label={`Rename project ${project.name}`}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                onRequestConfirmation({
                                                                    message: `Archive "${project.name}"?\nYou can unarchive it later from the archived projects section.`,
                                                                    onConfirm: () => onArchiveProject(project.id),
                                                                    title: `Archive Project: ${project.name}`,
                                                                    confirmText: 'Archive'
                                                                });
                                                            }} 
                                                            className="p-1 text-gray-400 hover:text-yellow-400"
                                                            aria-label={`Archive project ${project.name}`}
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                        </button>
                                                        {activeProjects.length > 1 && (
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    onRequestConfirmation({
                                                                        message: `Are you sure you want to delete "${project.name}"?\nThis action cannot be undone.`,
                                                                        onConfirm: () => onDeleteProject(project.id),
                                                                        title: `Delete Project: ${project.name}`,
                                                                        confirmText: 'Delete'
                                                                    });
                                                                }} 
                                                                className="p-1 text-gray-400 hover:text-red-400"
                                                                aria-label={`Delete project ${project.name}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {/* Projetos Arquivados */}
                        {archivedProjects.length > 0 && (
                            <>
                                {activeProjects.length > 0 && <div className="border-t border-gray-700 my-2"></div>}
                                <div className="flex items-center justify-between px-2 py-1">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        Arquivados ({archivedProjects.length})
                                    </span>
                                    <button 
                                        onClick={() => setShowArchived(!showArchived)}
                                        className="text-xs text-gray-500 hover:text-gray-300"
                                    >
                                        {showArchived ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                {showArchived && (
                                    <ul role="listbox">
                                        {archivedProjects.map(project => (
                                            <li key={project.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-800 opacity-60" role="option">
                                                <button onClick={() => { onSwitchProject(project.id); setIsOpen(false); }} className="flex items-center gap-2 flex-grow text-left">
                                                    <Archive className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span className="truncate">{project.name}</span>
                                                </button>
                                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            onUnarchiveProject(project.id);
                                                        }} 
                                                        className="p-1 text-gray-400 hover:text-green-400"
                                                        aria-label={`Unarchive project ${project.name}`}
                                                        title="Unarchive project"
                                                    >
                                                        <Archive className="w-4 h-4 rotate-180" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            onRequestConfirmation({
                                                                message: `Are you sure you want to delete "${project.name}"?\nThis action cannot be undone.`,
                                                                onConfirm: () => onDeleteProject(project.id),
                                                                title: `Delete Project: ${project.name}`,
                                                                confirmText: 'Delete'
                                                            });
                                                        }} 
                                                        className="p-1 text-gray-400 hover:text-red-400"
                                                        aria-label={`Delete project ${project.name}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>
                    <div className="border-t border-gray-700 mt-2 pt-2">
                        {isCreating ? (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={newProjectInputRef}
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    placeholder="New project name..."
                                    className="flex-grow bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                                <button onClick={handleCreate} className="p-1 text-green-400 hover:text-green-300"><Check className="w-5 h-5"/></button>
                                <button onClick={() => setIsCreating(false)} className="p-1 text-red-400 hover:text-red-300"><X className="w-5 h-5"/></button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center gap-2 p-2 rounded-md text-cyan-300 hover:bg-gray-800"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create New Project</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSwitcher;