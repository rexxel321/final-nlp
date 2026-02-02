"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, User, Bot, StopCircle, Edit2, AlertCircle, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    id?: string;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");

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
        <div className="flex-1 h-full flex flex-col bg-white overflow-hidden relative">

            {/* Scrollable Chat Area - Full Width */}
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-10 pb-32">

                    {/* Welcome Screen */}
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mt-20"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent mb-2">Hello,</h2>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-12">
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

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                                >
                                    {/* Sender Name */}
                                    <div className={`flex items-center gap-2 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                        <span>{isUser ? 'You' : (msg.model || 'Assistant')}</span>
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
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>

                                            {/* Action Buttons Container */}
                                            <div className={`absolute -bottom-8 flex items-center gap-1 ${isUser ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity`}>

                                                {/* Copy Button */}
                                                <button
                                                    onClick={() => copyToClipboard(msg.content)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </button>

                                                {/* Edit Button (User only) */}
                                                {isUser && !isLoading && (
                                                    <button
                                                        onClick={() => startEditing(index, msg.content)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                                        title="Edit message"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}

                                                {/* Delete Button (Only Last Message - LIFO) */}
                                                {isLastMessage && !isLoading && onDeleteMessage && (
                                                    <button
                                                        onClick={() => onDeleteMessage(index)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
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
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-sm"
                                    >
                                        <Sparkles className="w-3 h-3 text-blue-500" />
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
                                    <div className="flex gap-1 items-center bg-[#F0F4F9] px-6 py-4 rounded-2xl rounded-bl-sm">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
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
            <div className="w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-5 group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative bg-[#F0F4F9] rounded-full flex items-center shadow-inner hover:shadow-md transition-all duration-300 border border-transparent focus-within:border-gray-300 focus-within:bg-white">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything..."
                            className="w-full bg-transparent text-gray-800 rounded-full py-4 pl-6 pr-14 focus:outline-none placeholder-gray-500 text-[15px]"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => onSendMessage()}
                            disabled={isLoading || !inputValue.trim()}
                            className={`absolute right-2 p-2.5 rounded-full transition-all duration-200 ${isLoading || !inputValue.trim()
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-gray-800 hover:scale-105 active:scale-95 shadow-md'
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
