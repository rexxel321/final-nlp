"use client";

import React, { useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    role: 'user' | 'assistant';
    content: string;
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
}

const ChatInterface = ({ messages, inputValue, setInputValue, isLoading, onSendMessage, onSummarize, suggestions, followUps = [] }: ChatInterfaceProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, followUps]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
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
                        <AnimatePresence mode='popLayout'>
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-5 shadow-sm leading-relaxed text-[15px] ${msg.role === 'user'
                                            ? 'bg-black text-white rounded-br-sm'
                                            : 'bg-[#F0F4F9] text-gray-800 rounded-bl-sm'
                                        }`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Follow-up Questions */}
                        {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && followUps && followUps.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex flex-wrap gap-2 mt-4 ml-2 max-w-[85%]"
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

                        {/* Thinking Indicator */}
                        {isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                <div className="bg-transparent px-4 py-2 flex gap-1 items-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
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
                            <Send className="w-4 h-4" />
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
