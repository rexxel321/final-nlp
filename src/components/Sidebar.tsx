'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, PanelLeftClose, PanelLeftOpen, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ModelManager from './ModelManager';
import { useAuth } from '@/context/AuthContext';
import AuthModal from './AuthModal';
import UserSettings from './UserSettings';
import UserHoverCard from './UserHoverCard';

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
  selectedModel?: string;
  setSelectedModel?: (model: string) => void;
  availableModels?: string[];
  refreshTrigger?: number;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen, currentSessionId, onSessionSelect, onNewChat, selectedModel, setSelectedModel, availableModels, refreshTrigger, onCollapsedChange }: SidebarProps) {
  const { user, logout, updateStatus, theme } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showModelManager, setShowModelManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarOpacity = user?.sidebarOpacity ?? 1.0;

  const getSidebarBg = () => {
    if (theme === 'oled') return `rgba(0, 0, 0, ${sidebarOpacity})`;
    if (theme === 'dark') return `rgba(17, 24, 39, ${sidebarOpacity})`; // gray-900
    return `rgba(249, 249, 249, ${sidebarOpacity})`;
  };
  /* Removed duplicate isCollapsed */
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showUserHover, setShowUserHover] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShowUserHover(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setShowUserHover(false), 300);
  };

  // Format relative time for sessions
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return date.toLocaleDateString();
  };

  // Fetch sessions
  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'IDLE': return 'bg-yellow-500';
      case 'DND': return 'bg-red-500';
      case 'INVISIBLE': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Handle collapse and notify parent
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Toggle Button (when fully closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
          title="Open Sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0, width: isCollapsed ? 64 : 256 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ backgroundColor: getSidebarBg() }}
            className="fixed inset-y-0 left-0 border-r border-gray-200 dark:border-gray-800 z-40 flex flex-col overflow-hidden shadow-none backdrop-blur-sm"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between flex-shrink-0">
              {!isCollapsed && (
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">Chat History</span>
              )}
              <button
                onClick={handleToggleCollapse}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors ml-auto flex-shrink-0"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>

            <div className={cn("px-4 pb-4 flex-shrink-0", isCollapsed && "px-2")}>
              <button
                onClick={onNewChat}
                className={cn(
                  "w-full flex items-center gap-2 bg-[#dde1e7] dark:bg-gray-800 hover:bg-[#d0d4da] dark:hover:bg-gray-700 px-4 py-3 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-sm",
                  isCollapsed && "justify-center px-2"
                )}
                title="New Chat"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">New Chat</span>}
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
                      currentSessionId === session.id ? "bg-[#e8eaf0] dark:bg-gray-800 text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? session.title : undefined}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />

                    {!isCollapsed && (
                      <>
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
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{session.title}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{getRelativeTime(session.updatedAt)}</span>
                          </div>
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
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Section */}
            <div className={cn("border-t border-gray-200 p-4 space-y-2 flex-shrink-0", isCollapsed && "px-2")}>
              {/* Model Selector - Only show if props are provided */}
              {selectedModel && setSelectedModel && availableModels && (
                <div className="p-3">
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Model</label>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="truncate">{selectedModel}</span>
                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                  </button>
                  {showModelDropdown && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {availableModels.map((model) => {
                        const isOllamaModel = model.startsWith('Ollama:');
                        const displayName = isOllamaModel ? model.replace('Ollama: ', '') : model;
                        return (
                          <button
                            key={model}
                            onClick={() => {
                              setSelectedModel(model);
                              setShowModelDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs transition-colors",
                              selectedModel === model ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{displayName}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                isOllamaModel
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              )}>
                                {isOllamaModel ? 'Local' : 'Cloud'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Model Settings */}
              <button
                onClick={() => setShowModelManager(!showModelManager)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  isCollapsed && "justify-center"
                )}
                title="Model Settings"
              >
                <Settings className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                {!isCollapsed && <span className="whitespace-nowrap text-gray-700 dark:text-gray-300">Model Settings</span>}
              </button>

              {/* User Profile / Auth */}
              {user ? (
                <div className="space-y-2 relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                  <UserHoverCard
                    user={user}
                    isOpen={showUserHover && !isCollapsed}
                    onClose={() => setShowUserHover(false)}
                    position="right"
                  />
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={user.name || user.email}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                    )}
                    {!isCollapsed && (
                      <div className="flex-1 text-left overflow-hidden min-w-0">
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {user.displayName || user.name || 'User'}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Logout Button - ALWAYS VISIBLE (icon in collapsed) */}
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors",
                      isCollapsed && "justify-center"
                    )}
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors",
                    isCollapsed && "justify-center"
                  )}
                  title="Login"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">Login</span>}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Manager Modal */}
      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        availableModels={availableModels || []}
      />

      {/* User Settings Modal (Discord-style) */}
      <UserSettings
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onUpdate={() => fetchSessions()}
      />
    </>
  );
}
