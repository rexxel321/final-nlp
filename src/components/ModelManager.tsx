'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Settings, RefreshCw, LogIn, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

interface ModelSettings {
    modelId: string;
    systemPrompt: string;
    useRAG: boolean;
    temperature: number;
}

interface ModelManagerProps {
    isOpen: boolean;
    onClose: () => void;
    availableModels: string[];
}

export default function ModelManager({ isOpen, onClose, availableModels }: ModelManagerProps) {
    const { user } = useAuth();
    const [selectedModel, setSelectedModel] = useState(availableModels[0] || "Llama 3");

    // Multi-model changes tracking
    const [allChanges, setAllChanges] = useState<Record<string, ModelSettings>>({});
    const [loadedSettings, setLoadedSettings] = useState<Record<string, ModelSettings>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    const currentSettings = allChanges[selectedModel] || loadedSettings[selectedModel] || {
        modelId: selectedModel,
        systemPrompt: "",
        useRAG: true,
        temperature: 0.7
    };

    // Check if there are ANY unsaved changes across ALL models
    const hasUnsavedChanges = Object.keys(allChanges).length > 0;

    // Load settings when model selection changes
    useEffect(() => {
        if (!isOpen) return;
        if (!loadedSettings[selectedModel]) {
            fetchSettings(selectedModel);
        }
    }, [selectedModel, isOpen]);

    const fetchSettings = async (modelId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/models/settings?modelId=${encodeURIComponent(modelId)}`);
            if (res.ok) {
                const data = await res.json();
                const fetched: ModelSettings = {
                    modelId: modelId,
                    systemPrompt: data.systemPrompt || "",
                    useRAG: data.useRAG !== false,
                    temperature: data.temperature !== undefined ? data.temperature : 0.7
                };
                setLoadedSettings(prev => ({ ...prev, [modelId]: fetched }));
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        } finally {
            setIsLoading(false);
        }
    };

    const updateCurrentSettings = (updates: Partial<ModelSettings>) => {
        const newSettings = { ...currentSettings, ...updates };
        const original = loadedSettings[selectedModel];

        // Check if changed from original
        const hasChanges = original && (
            newSettings.systemPrompt !== original.systemPrompt ||
            newSettings.useRAG !== original.useRAG ||
            newSettings.temperature !== original.temperature
        );

        if (hasChanges) {
            setAllChanges(prev => ({ ...prev, [selectedModel]: newSettings }));
        } else {
            // Remove from changes if back to original
            setAllChanges(prev => {
                const newChanges = { ...prev };
                delete newChanges[selectedModel];
                return newChanges;
            });
        }
    };

    const resetToDefaults = () => {
        const defaultSettings: ModelSettings = {
            modelId: selectedModel,
            systemPrompt: '',
            useRAG: true,
            temperature: 0.7
        };
        setAllChanges(prev => ({ ...prev, [selectedModel]: defaultSettings }));
    };

    const handleSaveAll = async () => {
        // Permission Guard: Only logged-in users can save settings
        if (!user) {
            setShowLoginPrompt(true);
            return;
        }

        setSaveStatus('saving');
        let allSuccessful = true;

        try {
            // Save ALL changed models
            for (const [modelId, settings] of Object.entries(allChanges)) {
                const res = await fetch('/api/models/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                if (!res.ok) {
                    allSuccessful = false;
                }
            }

            if (allSuccessful) {
                setSaveStatus('saved');
                // Update loaded settings with saved changes
                setLoadedSettings(prev => ({ ...prev, ...allChanges }));
                // Clear changes
                setAllChanges({});
                setTimeout(() => {
                    setSaveStatus('idle');
                    onClose(); // Close after successful save
                }, 1500);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (e) {
            console.error("Save failed", e);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleCancel = () => {
        // Clear all unsaved changes before closing
        setAllChanges({});
        setShowLoginPrompt(false);
        onClose();
    };

    if (!isOpen) return null;

    const modelList = [
        { id: 'Llama 3', category: 'Cloud' },
        { id: 'Gemini', category: 'Cloud' },
        ...availableModels.map(m => ({ id: `Ollama: ${m}`, category: 'Local' }))
    ];

    const changedModels = Object.keys(allChanges);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[85vh] md:h-[700px] flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Model Management</h2>
                                    {hasUnsavedChanges && (
                                        <span className="text-xs text-amber-600 dark:text-amber-500 font-semibold">
                                            ● {changedModels.length} model{changedModels.length > 1 ? 's' : ''} changed
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Sidebar List */}
                            <div className="w-72 border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 overflow-y-auto p-4 space-y-2">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">Cloud Models</h3>
                                {modelList.filter(m => m.category === 'Cloud').map(m => {
                                    const hasChanges = allChanges[m.id] !== undefined;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModel(m.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${selectedModel === m.id
                                                ? 'bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 font-semibold text-blue-600 dark:text-blue-400'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="truncate">{m.id}</div>
                                                {hasChanges && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                            </div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Cloud Provider</div>
                                        </button>
                                    );
                                })}

                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-6 px-2">Local Models</h3>
                                {availableModels.filter(m => m.startsWith("Ollama:")).length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic px-2">No Ollama models found</p>
                                ) : (
                                    availableModels.filter(m => m.startsWith("Ollama:")).map(m => {
                                        const hasChanges = allChanges[m] !== undefined;
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => setSelectedModel(m)}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${selectedModel === m
                                                    ? 'bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 font-semibold text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="truncate">{m.replace('Ollama: ', '')}</div>
                                                    {hasChanges && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                                </div>
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Local Model</div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Settings Form */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                {/* Login Warning - Inside Form */}
                                {showLoginPrompt && (
                                    <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-3">
                                        <div className="p-2 bg-amber-200 rounded-lg">
                                            <LogIn className="w-5 h-5 text-amber-900" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-amber-900">Login Required</p>
                                            <p className="text-sm text-amber-800 mt-1">
                                                Please log in to save model settings. Guest users can view but cannot save configurations.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowLoginPrompt(false)}
                                            className="text-amber-600 hover:text-amber-900 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                <div className="max-w-xl mx-auto space-y-8">
                                    {/* System Prompt */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-gray-700">System Prompt / Persona</label>
                                            <span className="text-xs text-gray-400">Leave blank for default behavior</span>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm text-gray-700 leading-relaxed"
                                                placeholder="e.g. You are a helpful assistant..."
                                                value={currentSettings.systemPrompt}
                                                onChange={(e) => updateCurrentSettings({ systemPrompt: e.target.value })}
                                                disabled={!user}
                                            />
                                            {!user && (
                                                <div className="absolute inset-0 bg-gray-100/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                    <div className="text-center p-4">
                                                        <LogIn className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-sm font-semibold text-gray-700">Login to customize</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RAG Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Use Knowledge Base (RAG)</label>
                                            <p className="text-xs text-gray-500 mt-1">Enable context from your dataset</p>
                                        </div>
                                        <button
                                            onClick={() => updateCurrentSettings({ useRAG: !currentSettings.useRAG })}
                                            disabled={!user}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${currentSettings.useRAG ? 'bg-blue-600' : 'bg-gray-300'
                                                } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${currentSettings.useRAG ? 'translate-x-6' : ''
                                                }`} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Temperature</label>
                                            <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{currentSettings.temperature.toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={currentSettings.temperature}
                                            onChange={(e) => updateCurrentSettings({ temperature: parseFloat(e.target.value) })}
                                            disabled={!user}
                                            className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Precise (0.0)</span>
                                            <span>Balanced (0.5)</span>
                                            <span>Creative (1.0)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Save ALL Changes */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                            {hasUnsavedChanges && (
                                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs font-semibold text-amber-900 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        {changedModels.length} model{changedModels.length > 1 ? 's' : ''} have unsaved changes:
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1 ml-6">
                                        {changedModels.join(', ')}
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-medium">
                                    {hasUnsavedChanges ? (
                                        <span className="flex items-center gap-2 text-amber-600">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                            Unsaved changes
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            All settings saved
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={resetToDefaults}
                                        className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                                    >
                                        DEFAULT
                                    </button>
                                    <button onClick={handleCancel} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={saveStatus === 'saving' || !hasUnsavedChanges || !user}
                                        className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm transition-all flex items-center gap-2 ${saveStatus === 'saved' ? 'bg-green-600' :
                                            !hasUnsavedChanges || !user ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-black dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-700 active:scale-95'
                                            }`}
                                    >
                                        {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {saveStatus === 'saving' ? 'Saving All...' : saveStatus === 'saved' ? 'All Saved!' : `Save All Changes${hasUnsavedChanges ? ` (${changedModels.length})` : ''}`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div >
            )
            }
        </AnimatePresence >
    );
}
