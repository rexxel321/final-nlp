"use client";

import React, { useState, useRef, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
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
    setMessages([]);
    setInputValue('');
  };

  const handleSummarize = () => {
    if (messages.length === 0) return;
    handleSendMessage("Please summarize our conversation so far.");
  };

  return (
    <main className="flex min-h-screen bg-white">
      <Sidebar
        onNewChat={handleNewChat}
      />
      <ChatInterface
        messages={messages}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isLoading={isLoading}
        onSendMessage={() => handleSendMessage()}
        onSummarize={handleSummarize}
      />
    </main>
  );
}
