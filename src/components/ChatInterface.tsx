"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, User, Bot, StopCircle, Edit2, AlertCircle, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    id?: string;
    versions?: { content: string, model?: string, createdAt: any }[];
    createdAt?: string;
    metrics?: {
        latencyMs: number;
        tokensPerSec: number;
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
        f1Score?: number;
    };
}

interface ChatInterfaceProps {
    messages: Message[];
    inputValue: string;
    setInputValue: (val: string) => void;
    isLoading: boolean;
    onSendMessage: (msg?: string) => void;
    onSummarize: () => void;
    suggestions: string[];
    followUps?: string[];
    onEditMessage?: (index: number, newContent: string) => void;
    onDeleteMessage?: (index: number) => void;
    onStopGeneration?: () => void;
    onRegenerate?: () => void;
    error?: string | null;
}



const ChatInterface = ({
    messages,
    inputValue,
    setInputValue,
    isLoading,
    onSendMessage,
    onSummarize,
    suggestions,
    followUps = [],
    onEditMessage,
    onDeleteMessage,
    onStopGeneration,
    onRegenerate,
    error
}: ChatInterfaceProps) => {
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [versionMap, setVersionMap] = useState<Record<number, number>>({});

    // Debug: Log user data
    useEffect(() => {
        console.log('[ChatInterface] User data:', {
            hasUser: !!user,
            displayName: user?.displayName,
            name: user?.name,
            fullUser: user
        });
    }, [user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, followUps, error]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    const startEditing = (index: number, content: string) => {
        setEditingIndex(index);
        setEditValue(content);
    };

    const saveEdit = (index: number) => {
        if (onEditMessage && editValue.trim() !== messages[index].content) {
            onEditMessage(index, editValue);
        }
        setEditingIndex(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div
            className="flex-1 h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative"
            style={{
                '--chat-bg': user?.backgroundImage ? `url(${user.backgroundImage})` : 'none',
                '--bg-opacity': user?.backgroundOpacity || 0.1
            } as React.CSSProperties}
        >
            {/* Custom Background Image */}
            <div
                className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
                style={{
                    backgroundImage: 'var(--chat-bg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 'var(--bg-opacity, 0.5)'
                }}
            />



            {/* Scrollable Chat Area - Full Width */}
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-10 pb-32">

                    {/* Welcome Screen */}
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-2">
                                <span className="bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent">Hello</span>
                                {(user?.displayName || user?.name) && (
                                    <>
                                        <span className="bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent"> </span>
                                        <span
                                            className="inline-block bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent animate-gradient"
                                            style={{
                                                backgroundSize: '200% 200%',
                                                animation: 'gradient 3s ease infinite'
                                            }}
                                        >
                                            {user.displayName || user.name}
                                        </span>
                                    </>
                                )}
                                <span className="bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent">,</span>
                            </h2>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-12">
                                How can I help you today?
                            </h2>

                            <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                                {suggestions.map((topic, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onSendMessage(topic)}
                                        className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Chat Messages */}
                    <div className="space-y-8">
                        {messages.map((msg, index) => {
                            const isLastMessage = index === messages.length - 1;
                            const isUser = msg.role === 'user';

                            // Versioning Logic
                            const versions = (msg.versions || []) as any[];
                            const allVersions = [...versions, { content: msg.content, model: msg.model }];
                            const currentVersionIndex = versionMap[index] !== undefined ? versionMap[index] : allVersions.length - 1;
                            const displayedContent = allVersions[currentVersionIndex]?.content || msg.content;
                            const displayedModel = allVersions[currentVersionIndex]?.model || msg.model;
                            const totalVersions = allVersions.length;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`
                                        group relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm transition-all
                                        ${isUser
                                            ? 'bg-[#E8F0FE] dark:bg-blue-900/30 text-gray-800 dark:text-gray-100 rounded-br-sm border border-transparent dark:border-blue-800'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700'
                                        }
                                    `}>
                                        {/* Model Badge + Timestamp for AI */}
                                        {!isUser && (
                                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                    <Bot className="w-3 h-3" />
                                                    {displayedModel}
                                                </span>
                                                {msg.createdAt && (
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Version Navigator */}
                                        {totalVersions > 1 && (
                                            <div className={`flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 ml-2 ${isUser ? 'mr-auto' : 'ml-auto'}`}>
                                                <button
                                                    onClick={() => setVersionMap(prev => ({ ...prev, [index]: Math.max(0, currentVersionIndex - 1) }))}
                                                    disabled={currentVersionIndex === 0}
                                                    className="hover:text-gray-900 disabled:opacity-30 px-1"
                                                >
                                                    &lt;
                                                </button>
                                                <span>{currentVersionIndex + 1}/{totalVersions}</span>
                                                <button
                                                    onClick={() => setVersionMap(prev => ({ ...prev, [index]: Math.min(totalVersions - 1, currentVersionIndex + 1) }))}
                                                    disabled={currentVersionIndex === totalVersions - 1}
                                                    className="hover:text-gray-900 disabled:opacity-30 px-1"
                                                >
                                                    &gt;
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bubble / Input */}
                                    {editingIndex === index ? (
                                        <div className="w-full max-w-3xl bg-white border border-blue-200 rounded-xl p-4 shadow-lg z-10">
                                            <textarea
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-full min-h-[100px] p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium leading-relaxed"
                                                style={{ color: '#111827' }} // Explicit hex for safety
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingIndex(null)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                                <button onClick={() => saveEdit(index)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95">Save & Regenerate</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative max-w-[85%] md:max-w-[75%] group">
                                            <div className={`rounded-2xl px-6 py-5 shadow-sm leading-relaxed text-[15px] ${isUser
                                                ? 'bg-black text-white rounded-br-sm'
                                                : 'bg-[#F0F4F9] text-gray-800 rounded-bl-sm'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{displayedContent}</p>
                                            </div>

                                            {/* Action Buttons Container */}
                                            <div className={`absolute -bottom-8 flex items-center gap-1 ${isUser ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity`}>

                                                {/* Copy Button */}
                                                <button
                                                    onClick={() => copyToClipboard(displayedContent)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </button>

                                                {/* Edit Button (User only) */}
                                                {isUser && !isLoading && (
                                                    <button
                                                        onClick={() => startEditing(index, displayedContent)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                                        title="Edit message"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}

                                                {/* Delete Button (Allowed for ALL messages) */}
                                                {!isLoading && onDeleteMessage && (
                                                    <button
                                                        onClick={() => onDeleteMessage(index)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}

                                                {/* Info/Metrics Button (AI Only) */}
                                                {!isUser && msg.metrics && (
                                                    <div className="relative group/info">
                                                        <button
                                                            className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                            title="Model Performance Metrics"
                                                        >
                                                            <div className="w-3.5 h-3.5 border border-current rounded-full flex items-center justify-center font-serif text-[10px] italic font-bold">i</div>
                                                        </button>

                                                        {/* Metrics Popover */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none group-hover/info:pointer-events-auto z-50">
                                                            <div className="text-xs space-y-2">
                                                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                                                    <span className="font-bold text-gray-700 dark:text-gray-200">Performance</span>
                                                                    <span className="text-[10px] text-green-600 dark:text-green-400 font-mono bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                                                                        F1: {msg.metrics.f1Score || 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Speed</span>
                                                                        <span className="font-mono text-gray-800 dark:text-gray-200">{msg.metrics.tokensPerSec} t/s</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Latency</span>
                                                                        <span className="font-mono text-gray-800 dark:text-gray-200">{(msg.metrics.latencyMs / 1000).toFixed(2)}s</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</span>
                                                                        <span className="font-mono text-gray-800 dark:text-gray-200">{msg.metrics.totalTokens} tok</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Gen</span>
                                                                        <span className="font-mono text-gray-800 dark:text-gray-200">{msg.metrics.completionTokens} tok</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Arrow */}
                                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Regenerate Button (Assistant only, last message) */}
                                                {!isUser && isLastMessage && !isLoading && onRegenerate && (
                                                    <button
                                                        onClick={onRegenerate}
                                                        className="ml-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Regenerate response"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        <span>Regenerate</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}

                        {/* Follow-up Questions */}
                        {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && followUps && followUps.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex flex-wrap gap-2 mt-4 ml-6 max-w-[85%]"
                            >
                                {followUps.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onSendMessage(q)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm"
                                    >
                                        <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                        <span>{q}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {/* Error Banner */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl mx-auto max-w-2xl"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <div className="text-sm">{error}</div>
                            </motion.div>
                        )}

                        {/* Thinking Indicator */}
                        {isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                <div className="bg-transparent px-4 py-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <Bot className="w-3 h-3" />
                                        <span>Thinking...</span>
                                    </div>
                                    <div className="flex gap-1 items-center bg-[#F0F4F9] dark:bg-gray-800 px-6 py-4 rounded-2xl rounded-bl-sm border border-transparent dark:border-gray-700">
                                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                    {onStopGeneration && (
                                        <button
                                            onClick={onStopGeneration}
                                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-full shadow-sm hover:bg-red-50 transition-colors w-fit"
                                        >
                                            <StopCircle className="w-3 h-3" />
                                            Stop Generating
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>
            </div>

            {/* Input Area */}
            <div className="w-full bg-gradient-to-t from-white via-white/95 dark:from-gray-950 dark:via-gray-950 to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-5 group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative bg-[#F0F4F9] dark:bg-gray-800 rounded-full flex items-center shadow-inner hover:shadow-md transition-all duration-300 border border-transparent focus-within:border-gray-300 dark:focus-within:border-gray-600 focus-within:bg-white dark:focus-within:bg-gray-800">
                        {/* Summarize Button (Left) */}
                        {messages.length > 0 && onSummarize && (
                            <button
                                onClick={onSummarize}
                                className="ml-2 p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-all"
                                title="Summarize conversation"
                            >
                                <Sparkles className="w-4 h-4" />
                            </button>
                        )}
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything..."
                            className="w-full bg-transparent text-gray-800 dark:text-gray-100 rounded-full py-4 pl-3 pr-14 focus:outline-none placeholder-gray-500 text-[15px]"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => onSendMessage()}
                            disabled={isLoading || !inputValue.trim()}
                            className={`absolute right-2 p-2.5 rounded-full transition-all duration-200 ${isLoading || !inputValue.trim()
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-105 active:scale-95 shadow-md'
                                }`}
                        >
                            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-gray-400">AI can make mistakes. Check important info.</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ChatInterface;
