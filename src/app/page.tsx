"use client";

import { useRef, useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import ChatInterface, { Message } from "@/components/ChatInterface";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/uuid";

export default function Home() {
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
        // History
        const histRes = await fetch(`/api/history?sessionId=${currentSessionId}`);
        if (histRes.ok) {
          const data = await histRes.json();
          if (data.messages) setMessages(data.messages);
        }

        // Suggestions
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
  }, []);

  // Fetch Models
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (res.ok) {
          const data = await res.json();
          const modelNames = data.models?.map((m: any) => m.name) || [];
          setAvailableModels(modelNames);
        }
      } catch (e) { console.error("Ollama unavailable"); }
    }
    fetchModels();
  }, []);

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

    // Slice history up to that user message (inclusive)
    // Actually, we just need to remove the AI response if it exists after it.
    // Simplifying: Just take everything up to the last user message
    const previousMessages = messages.slice(0, lastUserIndex);
    const lastUserMsg = messages[lastUserIndex];

    setMessages(previousMessages);
    handleSendMessage(lastUserMsg.content, previousMessages);
  };

  const handleDeleteMessage = (index: number) => {
    // LIFO Policy: Only allow deleting the last message (or last pair if needed, but user said "one by one from latest")
    if (index === messages.length - 1) {
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleSendMessage = async (messageOverride?: string, customHistory?: Message[]) => {
    const textToSend = messageOverride || inputValue;
    if (!textToSend.trim() || isLoading) return;

    if (!messageOverride) {
      setInputValue('');
    }
    setError(null);

    // If using custom history (e.g. from edit), use that. Otherwise use current messages.
    const currentHistory = customHistory || messages;
    const newMessage: Message = { role: 'user', content: textToSend };
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
          sessionId: sessionId
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response, model: selectedModel }]);

        // Refresh sidebar if a new title was generated
        if (data.title) {
          setRefreshTrigger(prev => prev + 1);
        } else if (messages.length === 0) {
          // Also refresh on first message just in case
          setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000);
        }

        // DELAYED Follow-up Generation (3 seconds)
        setTimeout(async () => {
          try {
            const followUpRes = await fetch('/api/followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [...updatedMessages, { role: 'assistant', content: data.response }],
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
        }, 3000); // 3 second delay as requested

      } else {
        throw new Error("No response from AI");
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error sending message:', error);
      setError(error.message || "Something went wrong. Please try again.");
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
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
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
      </motion.div>
    </div>
  );
}
