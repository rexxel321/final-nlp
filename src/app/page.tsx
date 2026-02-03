"use client";

import { useRef, useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import ChatInterface, { Message } from "@/components/ChatInterface";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/uuid";
import { useAuth } from "@/context/AuthContext";
import { saveGuestSession, loadGuestSession } from "@/lib/guestSession";
import ModelSelector from "@/components/ModelSelector";

export default function Home() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("Llama 3");
  const [sessionId, setSessionId] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // New State Variables
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for Sidebar refresh

  // Load Session and History
  useEffect(() => {
    let currentSessionId = localStorage.getItem("chat_session_id");
    if (!currentSessionId) {
      currentSessionId = generateId();
      localStorage.setItem("chat_session_id", currentSessionId);
    }
    setSessionId(currentSessionId);

    async function loadData() {
      try {
        // FOR GUESTS: Load from localStorage
        if (!user) {
          const guestData = loadGuestSession(currentSessionId!);
          if (guestData) {
            setMessages(guestData.messages || []);
            console.log('[Guest] Loaded', guestData.messages?.length || 0, 'messages from localStorage');
          }
        } else {
          // FOR LOGGED-IN USERS: Load from database
          const histRes = await fetch(`/api/history?sessionId=${currentSessionId}`);
          if (histRes.ok) {
            const data = await histRes.json();
            if (data.messages) setMessages(data.messages);
          }
        }

        // Suggestions for everyone
        const suggRes = await fetch('/api/suggestions');
        if (suggRes.ok) {
          const data = await suggRes.json();
          if (data.suggestions) setSuggestions(data.suggestions);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
    loadData();
  }, [user]); // Re-run when user changes (login/logout)

  // Fetch Models
  useEffect(() => {
    async function fetchModels() {
      const cloudModels = ['Llama 3', 'Gemini', 'Gemini Pro'];
      let ollamaModels: string[] = [];

      try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (res.ok) {
          const data = await res.json();
          ollamaModels = data.models?.map((m: any) => `Ollama: ${m.name}`) || [];
        }
      } catch (e) {
        console.error("Ollama unavailable");
      }

      setAvailableModels([...cloudModels, ...ollamaModels]);
    }
    fetchModels();
  }, []);

  // Auto-save messages to localStorage for GUEST users
  useEffect(() => {
    if (!user && sessionId && messages.length > 0) {
      saveGuestSession(sessionId, {
        messages,
        title: messages[0]?.content?.substring(0, 50) || "New Chat",
        createdAt: Date.now()
      });
      console.log('[Guest] Auto-saved', messages.length, 'messages to localStorage');
    }
  }, [messages, sessionId, user]);

  // Auth Event Listeners: Session Migration & Cleanup (Laravel-inspired)
  useEffect(() => {
    const handleLogout = () => {
      // Clear all chat state on logout
      console.log('[Logout] Clearing all state and refreshing...');
      setMessages([]);
      setSessionId('');

      // Force page refresh to reset ALL state (fixes session visibility bug  #1)
      window.location.reload();
    };

    const handleLogin = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { userId } = customEvent.detail || {};

      if (!userId || !sessionId) return;

      // Load guest data from localStorage
      const guestData = loadGuestSession(sessionId);

      // Migrate current session to logged-in user
      try {
        const res = await fetch('/api/sessions/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messages: guestData?.messages || messages, // Upload localStorage messages
            title: guestData?.title || "New Chat"
          })
        });

        if (res.ok) {
          const result = await res.json();
          console.log(`[Auth] Session migrated: ${result.messageCount} messages saved to DB`);
          setRefreshTrigger(prev => prev + 1); // Refresh sidebar to show session
        }
      } catch (e) {
        console.error('[Auth] Session migration failed:', e);
      }
    };

    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:login', handleLogin as EventListener);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:login', handleLogin as EventListener);
    };
  }, [sessionId]);

  // Unload previous model when switching
  const prevModelRef = useRef(selectedModel);
  useEffect(() => {
    const prevModel = prevModelRef.current;
    if (prevModel !== selectedModel && prevModel.startsWith("Ollama:")) {
      // Auto-unload
      fetch('/api/models/unload', {
        method: 'POST',
        body: JSON.stringify({ model: prevModel })
      }).catch(err => console.error("Unload failed", err));
    }
    prevModelRef.current = selectedModel;
  }, [selectedModel]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError("Generation stopped by user.");
    }
  };

  const handleEditMessage = (index: number, newContent: string) => {
    // 1. Slice messages up to the index (keeping previous context)
    const previousMessages = messages.slice(0, index);
    setMessages(previousMessages);

    // 2. Clear error
    setError(null);

    // 3. Resend with new content
    handleSendMessage(newContent, previousMessages);
  };

  const handleRegenerate = () => {
    // Basic Regenerate: Remove last assistant message and re-submit the last user message
    if (messages.length === 0) return;

    // Find last user message index
    const lastUserIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const lastAssistantMessage = messages[messages.length - 1].role === 'assistant' ? messages[messages.length - 1] : null;
    const regenerateId = lastAssistantMessage?.id;

    // Slice history up to that user message (inclusive)
    const previousMessages = messages.slice(0, lastUserIndex);
    const lastUserMsg = messages[lastUserIndex];

    setMessages(previousMessages); // Removing the Assistant message from UI temporarily
    handleSendMessage(lastUserMsg.content, previousMessages, regenerateId);
  };

  const handleDeleteMessage = async (index: number) => {
    const msgToDelete = messages[index];
    if (!msgToDelete.id) return; // Cannot delete unsaved messages

    // Optimistic Update
    let willBeEmpty = false;
    setMessages(prev => {
      const newMessages = [...prev];
      // Packet Deletion Logic: If User message, delete paired Assistant response
      if (msgToDelete.role === 'user' && index + 1 < newMessages.length && newMessages[index + 1].role === 'assistant') {
        newMessages.splice(index, 2); // Remove User + Assistant
      } else {
        newMessages.splice(index, 1); // Remove Just This Message
      }

      if (newMessages.length === 0) {
        setError(null);
        willBeEmpty = true;
      }
      return newMessages;
    });

    // API Call
    try {
      await fetch(`/api/chat/message?id=${msgToDelete.id}`, { method: 'DELETE' });

      // If all messages deleted, delete the session
      if (willBeEmpty && sessionId && user) {
        await fetch(`/api/sessions?id=${sessionId}`, { method: 'DELETE' });
        // Trigger sidebar refresh to remove deleted session
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error("Failed to delete message", e);
      // Ideally revert state here, but skipping for simplicity
    }
  };

  const handleSendMessage = async (messageOverride?: string, customHistory?: Message[], regenerateId?: string) => {
    const textToSend = messageOverride || inputValue;
    if (!textToSend.trim() || isLoading) return;

    if (!messageOverride) {
      setInputValue('');
    }
    setError(null);

    // If using custom history (e.g. from edit), use that. Otherwise use current messages.
    const currentHistory = customHistory || messages;
    const newMessage: Message = { role: 'user', content: textToSend };

    // Optimistically add user message (will be replaced/updated by DB version usually, but for now strict append)
    // Note: To get the real ID of the user message, we'd need to wait for response. 
    // But typically we only need ID for deletion/edit.
    // For now, we'll rely on reloading or just accepting it might fail to delete until refresh.
    // BETTER: The API *should* return the user message ID too? 
    // Current API doesn't return the user message object. 
    // We'll proceed with optimistic update first.

    const updatedMessages = [...currentHistory, newMessage];

    setMessages(updatedMessages);
    setIsLoading(true);
    setFollowUps([]); // Clear old follow-ups

    // Abort Controller Setup
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          sessionId: sessionId,
          regenerateId: regenerateId // Pass ID if regenerating
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.response) {
        // Use returned full object if available (contains versions, id, etc.)
        const newMsg: Message = data.messageObject ? {
          role: 'assistant',
          content: data.messageObject.content,
          model: data.messageObject.model || selectedModel,
          id: data.messageObject.id,
          versions: data.messageObject.versions,
          createdAt: data.messageObject.createdAt,
          metrics: data.metrics // Store metrics
        } : {
          role: 'assistant',
          content: data.response,
          model: selectedModel,
          id: data.regeneratedId || undefined,
          metrics: data.metrics // Store metrics
        };

        setMessages(prev => {
          const newHistory = [...prev];
          // Update User Message with DB version (to get ID/Timestamp)
          if (data.userMessageObject && newHistory.length > 0) {
            const lastIdx = newHistory.length - 1;
            // Ensure we are updating the right message (User's last prompt)
            if (newHistory[lastIdx].role === 'user') {
              newHistory[lastIdx] = {
                ...newHistory[lastIdx],
                id: data.userMessageObject.id,
                createdAt: data.userMessageObject.createdAt
              };
            }
          }
          return [...newHistory, newMsg];
        });

        // Refresh sidebar if a new title was generated
        if (data.title) {
          setRefreshTrigger(prev => prev + 1);
        } else if (messages.length === 0) {
          setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000);
        }

        // DELAYED Follow-up Generation (3 seconds)
        setTimeout(async () => {
          try {
            const followUpRes = await fetch('/api/followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [...updatedMessages, newMsg], // Use updatedMessages which has the user msg
                model: selectedModel
              })
            });
            if (followUpRes.ok) {
              const fData = await followUpRes.json();
              if (fData.followUps) setFollowUps(fData.followUps);
            }
          } catch (e) {
            console.error("Failed to fetch follow-ups", e);
          }
        }, 3000);

      } else {
        throw new Error("No response from AI");
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('[Chat] API Error:', err);

      // Better error message extraction
      let errorMsg = 'Failed to send message.';
      if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);

      // Remove thinking message on error (if any was added optimistically)
      setMessages(prev => prev.filter(m => m.content !== 'Thinking...'));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewChat = () => {
    const newSessionId = generateId();
    setSessionId(newSessionId);
    localStorage.setItem("chat_session_id", newSessionId);
    setMessages([]);
    setInputValue('');
    setFollowUps([]);
    setError(null);
    // Optionally fetch new suggestions here
  };

  const handleSummarize = () => {
    if (messages.length === 0) return;
    handleSendMessage("Please summarize our conversation so far.");
  };

  return (
    <div className="flex bg-white h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onNewChat={handleNewChat}
        currentSessionId={sessionId}
        onSessionSelect={(id) => {
          setSessionId(id);
          setError(null);
          // Re-fetch history for this session
          const loadHistory = async () => {
            try {
              const res = await fetch(`/api/history?sessionId=${id}`);
              if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                setFollowUps([]);
              }
            } catch (e) { console.error(e); }
          }
          loadHistory();
          if (window.innerWidth < 768) setIsSidebarOpen(false); // Close on mobile
        }}
        availableModels={availableModels}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content Area */}
      <motion.div
        layout
        className={cn(
          "flex-1 flex flex-col h-full relative transition-all duration-300 ease-in-out",
          isSidebarOpen ? "md:ml-64" : "ml-0"
        )}
      >
        {/* Header with Model Selector */}
        <div className="absolute top-4 left-6 z-30 flex items-center gap-3">
          <ModelSelector
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            availableModels={availableModels}
          />
        </div>

        {/* Background Container */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            backgroundImage: user?.backgroundImage ? `url(${user.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {user?.backgroundImage && (
            <div
              className="absolute inset-0 bg-white z-0 pointer-events-none"
              style={{ opacity: 1 - (user.backgroundOpacity || 0.3) }}
            />
          )}

          <div className="relative z-10 h-full flex flex-col">
            <ChatInterface
              messages={messages}
              inputValue={inputValue}
              setInputValue={setInputValue}
              isLoading={isLoading}
              onSendMessage={(msg) => handleSendMessage(msg)}
              onSummarize={handleSummarize}
              suggestions={suggestions}
              followUps={followUps}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onStopGeneration={handleStopGeneration}
              onRegenerate={handleRegenerate}
              error={error}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
