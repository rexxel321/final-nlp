"use client";

import { useRef, useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/uuid";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Llama 3");
  const [sessionId, setSessionId] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

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

  const handleSendMessage = async (messageOverride?: string) => {
    const textToSend = messageOverride || inputValue;
    if (!textToSend.trim() || isLoading) return;

    if (!messageOverride) {
      setInputValue('');
    }

    const newMessage: Message = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages);
    setIsLoading(true);
    setFollowUps([]); // Clear old follow-ups

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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

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
        console.error("No response from API");
      }

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newSessionId = generateId();
    setSessionId(newSessionId);
    localStorage.setItem("chat_session_id", newSessionId);
    setMessages([]);
    setInputValue('');
    setFollowUps([]);
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
        />
      </motion.div>
    </div>
  );
}
