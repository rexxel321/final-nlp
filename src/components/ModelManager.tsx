'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Settings, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [selectedModel, setSelectedModel] = useState(availableModels[0] || "Llama 3");
    const [settings, setSettings] = useState<ModelSettings>({
        modelId: "",
        systemPrompt: "",
        useRAG: true,
        temperature: 0.7
    });
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const [initialSettings, setInitialSettings] = useState<ModelSettings | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Check for changes
    useEffect(() => {
        if (!initialSettings) {
            setIsDirty(false);
            return;
        }
        const hasChanges =
            settings.systemPrompt !== initialSettings.systemPrompt ||
            settings.useRAG !== initialSettings.useRAG ||
            settings.temperature !== initialSettings.temperature;
        setIsDirty(hasChanges);
    }, [settings, initialSettings]);

    // Load settings when model selection changes
    useEffect(() => {
        if (!isOpen) return;
        fetchSettings(selectedModel);
    }, [selectedModel, isOpen]);

    const fetchSettings = async (modelId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/models/settings?modelId=${encodeURIComponent(modelId)}`);
            if (res.ok) {
                const data = await res.json();
                const fetched: ModelSettings = {
                    modelId: modelId,
                    // If systemPrompt is null in DB, we treat it as empty for UI (or default)
                    // But wait, backend distinguishes null (default) vs "" (empty).
                    // For UI simplicity: If it's missing, we defaults to "" (User types their own).
                    systemPrompt: data.systemPrompt || "",
                    useRAG: data.useRAG !== false,
                    temperature: data.temperature !== undefined ? data.temperature : 0.7
                };
                setSettings(fetched);
                setInitialSettings(fetched);
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            const res = await fetch('/api/models/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setSaveStatus('saved');
                setInitialSettings(settings); // Update initial to current
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSaveStatus('error');
            }
        } catch (e) {
            setSaveStatus('error');
        }
    };

    const isOllama = selectedModel.startsWith("Ollama:"); // Only allow temp editing for Ollama

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] md:h-[700px] flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Model Management</h2>
                                    {isDirty && <span className="text-xs text-amber-600 font-semibold animate-pulse">● Unsaved changes</span>}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Sidebar List */}
                            <div className="w-64 border-r border-gray-100 bg-gray-50/30 overflow-y-auto p-4 space-y-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Cloud Models</h3>
                                {['Llama 3', 'Gemini'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
                                            setSelectedModel(m);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${selectedModel === m
                                                ? 'bg-white shadow-sm ring-1 ring-gray-200 font-semibold text-blue-600'
                                                : 'text-gray-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="truncate">{m}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">Cloud Provider</div>
                                    </button>
                                ))}

                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">Local Models</h3>
                                {availableModels.map(m => {
                                    const fullModelName = `Ollama: ${m}`;
                                    const isSelected = selectedModel === fullModelName;
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
                                                setSelectedModel(fullModelName);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${isSelected
                                                    ? 'bg-white shadow-sm ring-1 ring-gray-200 font-semibold text-blue-600'
                                                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="truncate">{m}</div>
                                            <div className="text-[10px] text-gray-400 mt-1">Local Model</div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Settings Form */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="max-w-xl mx-auto space-y-8">
                                    {/* System Prompt */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-gray-700">System Prompt / Persona</label>
                                            <span className="text-xs text-gray-400">Leave blank for default behavior</span>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm text-gray-700 leading-relaxed custom-scrollbar"
                                                placeholder="e.g. You are a shy Fennec Fox friend..."
                                                value={settings.systemPrompt}
                                                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* RAG Toggle */}
                                    <div
                                        onClick={() => setSettings({ ...settings, useRAG: !settings.useRAG })}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-blue-200 transition-colors group"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-700 transition-colors">Use Knowledge Base (RAG)</div>
                                            <div className="text-xs text-gray-500">Enable context from your dataset</div>
                                        </div>
                                        <div className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out ${settings.useRAG ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${settings.useRAG ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Temperature Slider */}
                                    <div className={`space-y-4 p-4 rounded-xl border border-transparent ${!isOllama ? 'bg-gray-50 opacity-75 grayscale' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                Creativity (Temperature)
                                            </label>
                                            {isOllama ? (
                                                <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold">{settings.temperature.toFixed(1)}</span>
                                            ) : (
                                                <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded flex items-center gap-1">
                                                    Locked <span className="text-xs">🔒</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={settings.temperature}
                                                disabled={!isOllama}
                                                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 ${!isOllama ? 'cursor-not-allowed' : ''}`}
                                            />
                                            {!isOllama && <div className="absolute inset-0 z-10 cursor-not-allowed" title="Temperature control is only available for local Ollama models" />}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                            <span>Precise</span>
                                            <span>Balanced</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                            <div className="text-xs text-gray-500 font-medium">
                                {isDirty ? (
                                    <span className="flex items-center gap-2 text-amber-600">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                        Unsaved changes
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 text-green-600">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        All settings saved
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saveStatus === 'saving' || !isDirty}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm transition-all flex items-center gap-2 ${saveStatus === 'saved' ? 'bg-green-600' :
                                        !isDirty ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800 active:scale-95'
                                        }`}
                                >
                                    {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
