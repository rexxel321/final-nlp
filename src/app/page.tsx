"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import { supabase } from '@/lib/supabase';
import type { Conversation, Message as DBMessage } from '@/types/database';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  intent?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Llama 3");

  // Load user and conversations on mount
  useEffect(() => {
    loadUser();
    loadConversations();
  }, []);

  // Auto-save messages when they change
  useEffect(() => {
    if (messages.length > 0 && currentConversationId) {
      saveMessages();
    }
  }, [messages]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    if (!user) return null;

    // Generate title from first message (max 50 chars)
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        model: selectedModel,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    setCurrentConversationId(data.id);
    setConversations(prev => [data, ...prev]);
    return data.id;
  };

  const saveMessages = async () => {
    if (!currentConversationId || messages.length === 0) return;

    // Get existing messages from DB
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', currentConversationId);

    const existingCount = existingMessages?.length || 0;

    // Only save new messages (that haven't been saved yet)
    const newMessages = messages.slice(existingCount);

    if (newMessages.length === 0) return;

    const messagesToInsert = newMessages.map(msg => ({
      conversation_id: currentConversationId,
      role: msg.role,
      content: msg.content,
      source: msg.source || null,
      intent: msg.intent || null,
    }));

    const { error } = await supabase
      .from('messages')
      .insert(messagesToInsert);

    if (error) {
      console.error('Error saving messages:', error);
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversationId);

    // Reload conversations to update sidebar
    loadConversations();
  };

  const loadConversationMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const loadedMessages: Message[] = data.map(msg => ({
      role: msg.role,
      content: msg.content,
      source: msg.source || undefined,
      intent: msg.intent || undefined,
    }));

    setMessages(loadedMessages);
    setCurrentConversationId(conversationId);
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const textToSend = messageOverride || inputValue;
    if (!textToSend.trim() || isLoading) return;

    if (!messageOverride) {
      setInputValue('');
    }

    // Create new conversation if this is the first message
    if (messages.length === 0 && !currentConversationId) {
      const convId = await createNewConversation(textToSend);
      if (!convId) return;
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
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Error: ${data.error}\\n\\nPlease check your API keys in the .env file.\\n\\n` +
            `For AI responses, you need:\\n` +
            `- GROQ_API_KEY for Llama 3\\n` +
            `- GEMINI_API_KEY for Gemini`,
          source: "Error",
          intent: "error"
        }]);
      } else if (data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          source: data.source,
          intent: data.intent
        }]);
      } else {
        console.error("No response from API", data);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "⚠️ Unexpected response format from API. Please check the console for details.",
          source: "Error",
          intent: "error"
        }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ Failed to connect to the API. Please check your internet connection and try again.",
        source: "Error",
        intent: "error"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    loadConversationMessages(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        handleNewChat();
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSummarize = async () => {
    if (messages.length === 0) return;

    setIsLoading(true);

    try {
      // Concise, directive prompt for detailed summary
      const summaryPrompt = `Buatkan rangkuman lengkap dan informatif dari percakapan kita. Format:

1. [Topik]: 
   - Poin penting & detail spesifik
   - Tips/rekomendasi actionable
   
Include SEMUA informasi penting yang sudah dijelaskan, bukan cuma list topik.`;

      // Send to API without adding to UI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: summaryPrompt }],
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Error generating summary: ${data.error}`,
          source: "Error",
          intent: "error"
        }]);
      } else if (data.response) {
        // Only add the summary response, not the prompt
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          source: data.source,
          intent: 'summary'
        }]);
      }

    } catch (error) {
      console.error('Error generating summary:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ Failed to generate summary. Please try again.",
        source: "Error",
        intent: "error"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white">
      <Sidebar
        userEmail={user?.email || ''}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onLogout={handleLogout}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
      <ChatInterface
        messages={messages}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onSummarize={handleSummarize}
      />
    </main>
  );
}
