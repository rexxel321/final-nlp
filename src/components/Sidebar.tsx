"use client";

import React, { useState } from 'react';
import { Plus, ChevronDown, Check, MessageSquare, Trash2, LogOut, PenSquare } from 'lucide-react';
import type { Conversation } from '@/types/database';

interface SidebarProps {
  userEmail: string;
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onLogout: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

const Sidebar = ({
  userEmail,
  conversations,
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onLogout,
  selectedModel,
  onSelectModel
}: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const models = ["Llama 3", "Gemini"];

  // Extract username from email (before @)
  const username = userEmail ? userEmail.split('@')[0] : '';

  // Group conversations by date
  const groupedConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      lastWeek: [] as Conversation[],
      older: [] as Conversation[],
    };

    conversations.forEach(conv => {
      const convDate = new Date(conv.created_at);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= lastWeek) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const groups = groupedConversations();

  const ConversationItem = ({ conv }: { conv: Conversation }) => (
    <div
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv.id
        ? 'bg-gray-200'
        : 'hover:bg-gray-100'
        }`}
    >
      <div
        className="flex items-center gap-2 flex-1 min-w-0"
        onClick={() => onSelectConversation(conv.id)}
      >
        <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="text-sm text-gray-800 truncate">{conv.title}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this conversation?')) {
            onDeleteConversation(conv.id);
          }
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );

  return (
    <div className="w-[280px] h-screen bg-[#f9f9f9] flex flex-col p-6 border-r border-gray-100 relative">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-black">FitBuddy</h1>
      </div>

      {/* Model Selector */}
      <div className="mb-4 relative">
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

      {/* New Chat Button - Left aligned */}
      <button
        onClick={onNewChat}
        className="w-full bg-transparent text-gray-700 rounded-lg py-2.5 px-3 mb-6 flex items-center gap-3 hover:bg-gray-100 transition-colors"
      >
        <PenSquare className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium">New Chat</span>
      </button>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {groups.today.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Today</h3>
            <div className="space-y-1">
              {groups.today.map(conv => <ConversationItem key={conv.id} conv={conv} />)}
            </div>
          </div>
        )}

        {groups.yesterday.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Yesterday</h3>
            <div className="space-y-1">
              {groups.yesterday.map(conv => <ConversationItem key={conv.id} conv={conv} />)}
            </div>
          </div>
        )}

        {groups.lastWeek.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Last 7 Days</h3>
            <div className="space-y-1">
              {groups.lastWeek.map(conv => <ConversationItem key={conv.id} conv={conv} />)}
            </div>
          </div>
        )}

        {groups.older.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Older</h3>
            <div className="space-y-1">
              {groups.older.map(conv => <ConversationItem key={conv.id} conv={conv} />)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="space-y-2">
        {/* User Info - Username only */}
        {username && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{username}</p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full bg-gray-200 text-gray-700 rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
