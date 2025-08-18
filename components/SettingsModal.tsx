import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { CustomRelationshipType, ConfirmationRequestHandler } from '../types';
import { X, DownloadCloudIcon, UploadCloudIcon, Trash2, PaletteIcon, SparkleIcon, HelpCircleIcon } from './icons';

interface RelationshipTypeInfo {
    type: string;
    color: string;
    description: string;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCloudExport: () => Promise<{ success: boolean; message: string }>;
    onCloudImport: () => Promise<{ success: boolean; message: string }>;
    customRelationshipTypes: CustomRelationshipType[];
    onUpdateCustomRelationshipTypes: (updater: (types: CustomRelationshipType[]) => CustomRelationshipType[]) => void;
    ai: GoogleGenAI;
    defaultRelationshipTypes: RelationshipTypeInfo[];
    disabledDefaultTypes: string[];
    disabledCustomTypes: string[];
    onToggleRelationshipType: (typeName: string, isDefault: boolean) => void;
    onRequestConfirmation: ConfirmationRequestHandler;
    aiAssistanceLevel: 'off' | 'moderate' | 'rigorous';
    onSetAiAssistanceLevel: (level: 'off' | 'moderate' | 'rigorous') => void;
}

const RelationshipTypeManager: React.FC<Pick<SettingsModalProps, 'customRelationshipTypes' | 'onUpdateCustomRelationshipTypes' | 'ai' | 'defaultRelationshipTypes' | 'disabledDefaultTypes' | 'disabledCustomTypes' | 'onToggleRelationshipType' | 'onRequestConfirmation'>> = ({
    customRelationshipTypes,
    onUpdateCustomRelationshipTypes,
    ai,
    defaultRelationshipTypes,
    disabledDefaultTypes,
    disabledCustomTypes,
    onToggleRelationshipType,
    onRequestConfirmation,
}) => {
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeDescription, setNewTypeDescription] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('#60a5fa'); // default blue-400
    const [isSuggestingName, setIsSuggestingName] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSuggestName = async () => {
        if (!newTypeDescription.trim()) {
            setError("Please provide a description first.");
            return;
        }
        setError(null);
        setIsSuggestingName(true);
        try {
            const prompt = `Based on the following description for a relationship between philosophical concepts, suggest a concise, academic name for the relationship type. The name should be 1-3 words max. Description: "${newTypeDescription}"`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: "You are an expert in philosophical and logical terminology. Respond ONLY with the suggested name in plain text, without any quotes or extra formatting."
                }
            });
            const suggestedName = response.text.replace(/["']/g, '').trim();
            if (suggestedName) {
                setNewTypeName(suggestedName);
            } else {
                setError("AI could not suggest a name. Please try a different description.");
            }
        } catch (e) {
            console.error("Error suggesting name:", e);
            setError("Failed to get suggestion from AI.");
        } finally {
            setIsSuggestingName(false);
        }
    };
    
    const handleAddType = () => {
        setError(null);
        if (!newTypeName.trim()) {
            setError("Name cannot be empty.");
            return;
        }
        if (customRelationshipTypes.some(t => t.name.toLowerCase() === newTypeName.trim().toLowerCase()) || defaultRelationshipTypes.some(t => t.type.toLowerCase() === newTypeName.trim().toLowerCase())) {
            setError("A relationship type with this name already exists.");
            return;
        }
        onUpdateCustomRelationshipTypes(prev => [...prev, { name: newTypeName.trim(), description: newTypeDescription.trim(), color: newTypeColor }]);
        setNewTypeName('');
        setNewTypeDescription('');
        setNewTypeColor('#60a5fa');
    };
    
    const handleDeleteType = (name: string) => {
        onRequestConfirmation({
            message: `Are you sure you want to delete the "${name}" relationship type? This also removes it from your disabled list if it's there.`,
            title: 'Delete Relationship Type',
            confirmText: 'Delete',
            onConfirm: () => {
                onUpdateCustomRelationshipTypes(prev => prev.filter(t => t.name !== name));
                onToggleRelationshipType(name, false);
            }
        });
    };

    const RelationshipListItem: React.FC<{ type: { name: string; color: string; description: string; }, isDefault: boolean, isCustom?: boolean }> = ({ type, isDefault, isCustom }) => {
        const disabledSet = isDefault ? new Set(disabledDefaultTypes) : new Set(disabledCustomTypes);
        const isChecked = !disabledSet.has(type.name);

        return (
            <li className="flex items-start justify-between bg-gray-700/50 p-3 rounded-md gap-3">
                <div className="flex items-start gap-3 flex-grow">
                    <input
                        type="checkbox"
                        id={`toggle-${type.name}`}
                        checked={isChecked}
                        onChange={() => onToggleRelationshipType(type.name, isDefault)}
                        className="mt-1 flex-shrink-0 form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                    />
                    <div className="flex-grow">
                        <label htmlFor={`toggle-${type.name}`} className="flex items-center gap-2 cursor-pointer">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }}></div>
                            <span className="font-medium text-white">{type.name}</span>
                        </label>
                        <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                    </div>
                </div>
                {isCustom && (
                    <button onClick={() => handleDeleteType(type.name)} className="p-1 text-gray-500 hover:text-red-400 flex-shrink-0">
                        <Trash2 className="w-4 h-4"/>
                    </button>
                )}
            </li>
        );
    }

    return (
        <div className='space-y-6'>
            <div>
                <h3 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
                    <PaletteIcon className="w-6 h-6"/>
                    Manage Relationship Types
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                    Select which types to include in the Map Builder. Your selections are saved automatically.
                </p>
            </div>
            
            <div className="space-y-4">
                 <div>
                    <h4 className='text-sm font-semibold text-gray-300 mb-2'>Default Types</h4>
                    <ul className="max-h-48 overflow-y-auto pr-2 space-y-2">
                        {defaultRelationshipTypes.map(type => (
                            <RelationshipListItem key={type.type} type={{name: type.type, ...type}} isDefault={true} />
                        ))}
                    </ul>
                </div>

                <div>
                    <h4 className='text-sm font-semibold text-gray-300 mb-2'>Your Custom Types</h4>
                    {customRelationshipTypes.length > 0 ? (
                        <ul className="max-h-48 overflow-y-auto pr-2 space-y-2">
                            {customRelationshipTypes.map(type => (
                                <RelationshipListItem key={type.name} type={type} isDefault={false} isCustom={true} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4 bg-gray-900/50 rounded-md">You haven't created any custom types yet.</p>
                    )}
                </div>
            </div>

            <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                <h4 className='text-md font-semibold text-gray-100'>Create New Type</h4>
                <div>
                     <label htmlFor="type-description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                     <textarea
                        id="type-description"
                        value={newTypeDescription}
                        onChange={(e) => setNewTypeDescription(e.target.value)}
                        placeholder="e.g., One concept provides the foundational assumptions for another."
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows={2}
                    />
                </div>
                 <div className='flex items-end gap-2'>
                    <div className='flex-grow'>
                        <label htmlFor="type-name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                        <div className="flex">
                             <input
                                id="type-name"
                                type="text"
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                                placeholder="e.g., Provides Foundation For"
                                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-l-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={handleSuggestName}
                                disabled={isSuggestingName || !newTypeDescription}
                                className="px-3 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 disabled:bg-gray-500 flex items-center justify-center"
                                title="Suggest Name with AI"
                            >
                                <SparkleIcon className={`w-5 h-5 ${isSuggestingName ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="type-color" className="block text-sm font-medium text-gray-300 mb-1 text-center">Color</label>
                        <input
                            id="type-color"
                            type="color"
                            value={newTypeColor}
                            onChange={(e) => setNewTypeColor(e.target.value)}
                            className="w-12 h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer"
                        />
                    </div>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button onClick={handleAddType} className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors">Add New Type</button>
            </div>
        </div>
    );
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    onCloudExport, 
    onCloudImport,
    aiAssistanceLevel,
    onSetAiAssistanceLevel,
    ...relationshipProps 
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

    if (!isOpen) {
        return null;
    }
    
    const handleClose = () => {
        setExportResult(null);
        setImportResult(null);
        onClose();
    };

    const handleCloudExport = async () => {
        setIsExporting(true);
        setExportResult(null);
        setImportResult(null);
        const result = await onCloudExport();
        setExportResult(result);
        setIsExporting(false);
    };

    const handleCloudImport = async () => {
        setIsImporting(true);
        setImportResult(null);
        setExportResult(null);
        const result = await onCloudImport();
        setImportResult(result);
        setIsImporting(false);

        if (result.success) {
            setTimeout(() => {
                handleClose();
            }, 2000);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center animate-fade-in"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
        >
            <div 
                className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-full max-w-lg text-white flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 id="settings-title" className="text-xl font-bold text-cyan-300">Settings</h2>
                    <button onClick={handleClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close settings">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div>
                        <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                            <HelpCircleIcon className="w-6 h-6"/>
                            Socratic Assistant
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                            Enable proactive AI suggestions to challenge and refine your thinking as you build your map.
                        </p>
                        <fieldset className="mt-3 space-y-2">
                            <legend className="sr-only">AI Assistance Level</legend>
                            {(['off', 'moderate', 'rigorous'] as const).map(level => (
                                <div key={level} className="flex items-center">
                                    <input
                                        id={`ai-level-${level}`}
                                        name="ai-assistance-level"
                                        type="radio"
                                        checked={aiAssistanceLevel === level}
                                        onChange={() => onSetAiAssistanceLevel(level)}
                                        className="h-4 w-4 text-purple-500 bg-gray-700 border-gray-600 focus:ring-purple-500"
                                    />
                                    <label htmlFor={`ai-level-${level}`} className="ml-3 block text-sm font-medium text-gray-200">
                                        <span className="capitalize">{level}</span>
                                        <span className="text-gray-400 ml-2 text-xs">
                                            {level === 'off' && 'No suggestions.'}
                                            {level === 'moderate' && '(Default) Suggests common, direct philosophical moves.'}
                                            {level === 'rigorous' && 'Challenges more assumptions and suggests complex moves.'}
                                        </span>
                                    </label>
                                </div>
                            ))}
                        </fieldset>
                    </div>

                     <div className="border-t border-gray-700"></div>

                    <RelationshipTypeManager {...relationshipProps} />

                    <div className="border-t border-gray-700"></div>

                    <div>
                        <h3 className="text-lg font-semibold text-yellow-300 flex items-center gap-2">
                            <UploadCloudIcon className="w-6 h-6"/>
                            Save All Projects to Cloud
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 mb-3">
                            Save all your projects and custom relationship types to the cloud. This will overwrite any previously saved cloud backup.
                        </p>
                        <button
                            onClick={handleCloudExport}
                            disabled={isExporting}
                            className="w-full px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-400 font-bold transition-colors disabled:bg-gray-500 disabled:text-gray-200 disabled:cursor-wait"
                        >
                            {isExporting ? 'Saving...' : 'Save to Cloud'}
                        </button>
                        {exportResult && (
                             <div className={`mt-3 p-3 rounded-md text-sm text-left break-words ${exportResult.success ? 'bg-green-900/50 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'}`}>
                                {exportResult.message}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-700"></div>
                    
                    <div>
                         <h3 className="text-lg font-semibold text-green-300 flex items-center gap-2">
                            <DownloadCloudIcon className="w-6 h-6"/>
                            Load All Projects from Cloud
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 mb-3">
                            Restore all projects and settings from the cloud. This will overwrite all of your current local data.
                        </p>
                        <button
                            onClick={handleCloudImport}
                            disabled={isImporting}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold transition-colors disabled:bg-gray-500 disabled:text-gray-200 disabled:cursor-wait"
                        >
                            {isImporting ? 'Loading...' : 'Load from Cloud'}
                        </button>
                         {importResult && (
                            <div className={`mt-3 p-3 rounded-md text-sm ${importResult.success ? 'bg-green-900/50 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'}`}>
                                {importResult.message}
                            </div>
                        )}
                    </div>
                </div>

                 {/* Footer */}
                <div className="bg-gray-900/50 px-6 py-3 text-xs text-gray-500 rounded-b-xl border-t border-gray-700">
                   Your projects are saved together under a fixed ID. Saving will overwrite your previous cloud backup.
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;