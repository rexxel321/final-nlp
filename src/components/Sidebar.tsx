'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ModelManager from './ModelManager';

interface Session {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  currentSessionId: string;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: string[];
  refreshTrigger?: number; // New prop to trigger re-fetch
}

export default function Sidebar({ isOpen, setIsOpen, currentSessionId, onSessionSelect, onNewChat, selectedModel, setSelectedModel, availableModels, refreshTrigger }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showModelManager, setShowModelManager] = useState(false);

  // Fetch sessions
  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]); // Re-fetch when trigger changes (e.g. new chat created/titled)

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;

    try {
      await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) onNewChat();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const handleRename = async (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const submitRename = async (id: string) => {
    try {
      await fetch('/api/sessions', {
        method: 'PATCH',
        body: JSON.stringify({ id, title: editTitle })
      });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle } : s));
      setEditingId(null);
    } catch (e) {
      console.error("Failed to rename", e);
    }
  };

  return (
    <>
      {/* Toggle Button - Fixed Position when Closed, Inside Header when Open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shadow-sm"
          title="Open Sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.2, ease: "easeInOut" }} // No bounce, simple slide
            className="fixed inset-y-0 left-0 w-64 bg-[#f9f9f9] border-r border-gray-200 z-40 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                title="Close Sidebar"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chat History</span>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center gap-2 bg-[#dde1e7] hover:bg-[#d0d4da] px-4 py-3 rounded-full text-sm font-medium text-gray-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Recent History */}
            <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSessionSelect(session.id)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-3 rounded-xl text-sm cursor-pointer transition-colors relative",
                      currentSessionId === session.id ? "bg-[#e8eaf0] text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />

                    {editingId === session.id ? (
                      <input
                        autoFocus
                        className="bg-transparent border-b border-blue-500 focus:outline-none w-full pb-1"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => submitRename(session.id)}
                        onKeyDown={(e) => e.key === 'Enter' && submitRename(session.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate w-32">{session.title}</span>
                    )}

                    {/* Actions (Hover) */}
                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent">
                      {!editingId && (
                        <>
                          <button onClick={(e) => handleRename(e, session.id, session.title)} className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => handleDelete(e, session.id)} className="p-1 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer: Settings / Profile */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all block"
                >
                  <optgroup label="Cloud Models">
                    <option value="Llama 3">Llama 3 (Groq)</option>
                    <option value="Gemini">Gemini (Google)</option>
                  </optgroup>
                  {availableModels.length > 0 && (
                    <optgroup label="Local (Ollama)">
                      {availableModels.map(m => (
                        <option key={m} value={`Ollama: ${m}`}>{m}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-3 px-2 py-2 text-sm text-gray-600">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  V
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-xs">Valid User</div>
                  <div className="text-[10px] text-gray-500">Pro Plan</div>
                </div>
                <button
                  onClick={() => setShowModelManager(true)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                  title="Manage Models"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        availableModels={availableModels}
      />
    </>
  );
}
