"use client";

import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    messages: Message[];
    inputValue: string;
    setInputValue: (val: string) => void;
    isLoading: boolean;
    onSendMessage: () => void;
    onSummarize: () => void;
}

const ChatInterface = ({ messages, inputValue, setInputValue, isLoading, onSendMessage, onSummarize }: ChatInterfaceProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    return (
        <div className="flex-1 h-screen flex flex-col bg-white relative">

            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 pt-10 pb-32 w-full max-w-4xl mx-auto">

                {/* Initial Greeting - Only show if no messages */}
                {messages.length === 0 && (
                    <div className="text-center mt-20">
                        <h2 className="text-4xl md:text-6xl font-black text-gray-300 mb-2">Hi,</h2>
                        <h2 className="text-4xl md:text-6xl font-black text-black leading-tight">
                            How can I help with<br />
                            your training today?
                        </h2>
                    </div>
                )}

                {/* Message Bubble List */}
                <div className="space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-6 py-4 ${msg.role === 'user'
                                    ? 'bg-black text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-none px-6 py-4">
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

            </div>

            {/* Input Area (Fixed Bottom) */}
            <div className="w-full max-w-2xl px-6 absolute bottom-12 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything about running or swimming..."
                            className="w-full bg-[#f4f4f4] text-gray-700 rounded-full py-4 pl-6 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder-gray-400"
                            disabled={isLoading}
                        />
                        <button
                            onClick={onSendMessage}
                            disabled={isLoading}
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors ${isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-300 hover:bg-black'
                                }`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={onSummarize}
                        disabled={isLoading || messages.length === 0}
                        className={`hidden md:flex bg-black text-white px-6 py-4 rounded-full font-medium items-center gap-2 transition-colors whitespace-nowrap ${isLoading || messages.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'hover:bg-gray-800'
                            }`}
                    >
                        Summarize Session
                    </button>
                </div>
            </div>

        </div>
    );
};

export default ChatInterface;
