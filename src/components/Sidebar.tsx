"use client";

import React, { useState } from 'react';
import { Plus, ChevronDown, Check } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

const Sidebar = ({ onNewChat, selectedModel, onSelectModel }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const models = ["Llama 3", "Gemini"];

  return (
    <div className="w-[280px] h-screen bg-[#f9f9f9] flex flex-col p-6 border-r border-gray-100 relative">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-black">FitBuddy</h1>
      </div>

      {/* Model Selector */}
      <div className="mb-6 relative">
        <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wide">Model</label>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-colors"
        >
          <span className="text-sm font-medium text-gray-800">{selectedModel}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-lg shadow-lg z-10 py-1">
            {models.map((model) => (
              <button
                key={model}
                onClick={() => {
                  onSelectModel(model);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                {model}
                {selectedModel === model && <Check className="w-4 h-4 text-black" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer to push bottom content down */}
      <div className="flex-grow"></div>

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="w-full bg-black text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">New Chat</span>
      </button>
    </div>
  );
};

export default Sidebar;
