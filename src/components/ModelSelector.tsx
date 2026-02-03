"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Cloud, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModelSelectorProps {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    availableModels: string[];
}

export default function ModelSelector({ selectedModel, setSelectedModel, availableModels }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getModelLabel = (model: string) => {
        if (model.startsWith("Ollama:")) return model.replace("Ollama: ", "");
        return model;
    };

    const getModelIcon = (model: string) => {
        if (model.startsWith("Ollama:")) return <Cpu className="w-3.5 h-3.5" />;
        if (model.includes("Gemini")) return <Sparkles className="w-3.5 h-3.5" />;
        return <Cloud className="w-3.5 h-3.5" />;
    };

    const getModelBadge = (model: string) => {
        if (model.startsWith("Ollama:")) return "LOCAL";
        return "CLOUD";
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-md border border-gray-200/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 group shadow-sm"
            >
                <div className="flex items-center gap-2">
                    {getModelIcon(selectedModel)}
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                        {getModelLabel(selectedModel)}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 font-bold">
                        {getModelBadge(selectedModel)}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50"
                    >
                        <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
                            {availableModels.map((model) => {
                                const isSelected = model === selectedModel;
                                const label = getModelLabel(model);
                                const badge = getModelBadge(model);

                                return (
                                    <button
                                        key={model}
                                        onClick={() => {
                                            setSelectedModel(model);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {getModelIcon(model)}
                                            </div>
                                            <span className="text-sm font-medium">{label}</span>
                                        </div>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${badge === 'LOCAL'
                                                ? 'bg-green-500/20 dark:bg-green-400/20 text-green-700 dark:text-green-300'
                                                : 'bg-blue-500/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300'
                                            }`}>
                                            {badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
