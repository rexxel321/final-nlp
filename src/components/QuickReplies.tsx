"use client";

import React from 'react';

interface QuickReply {
    id: string;
    text: string;
    icon?: string;
}

interface QuickRepliesProps {
    onQuickReply: (text: string) => void;
    disabled?: boolean;
}

const quickReplies: QuickReply[] = [
    { id: '1', text: 'Calculate my BMI', icon: '📊' },
    { id: '2', text: 'How many calories do I need?', icon: '🔥' },
    { id: '3', text: 'What is protein?', icon: '🥩' },
    { id: '4', text: 'Best exercises for abs', icon: '💪' },
    { id: '5', text: 'Create a workout plan', icon: '🏋️' },
];

const QuickReplies: React.FC<QuickRepliesProps> = ({ onQuickReply, disabled = false }) => {
    return (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
            {quickReplies.map((reply) => (
                <button
                    key={reply.id}
                    onClick={() => onQuickReply(reply.text)}
                    disabled={disabled}
                    className={`
            px-4 py-2 rounded-full text-sm font-medium
            border border-gray-300 bg-white
            transition-all duration-200
            ${disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-black hover:text-white hover:border-black cursor-pointer'
                        }
          `}
                >
                    {reply.icon && <span className="mr-2">{reply.icon}</span>}
                    {reply.text}
                </button>
            ))}
        </div>
    );
};

export default QuickReplies;
