import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// SDKs initialized lazily inside handler to prevent build-time/runtime crashes if keys missing


import { prisma } from '@/lib/prisma';
import { findRelevantContext } from '@/lib/dataset';

// SDKs initialized lazily inside handler to prevent build-time/runtime crashes if keys missing


// Helper to get completion from any model
async function getCompletion(model: string, messages: any[], temperature: number = 0.7) {
    // Basic cleaning of system message to ensure no conflict
    const systemContent = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    // SDK Initialization
    const groqApiKey = process.env.GROQ_API_KEY;
    const groq = new Groq({ apiKey: groqApiKey || 'dummy_key' });
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(geminiApiKey || '');

    if (model === "Gemini") {
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        // Gemini config
        const history = userMessages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = geminiModel.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: temperature
            },
        });

        const lastMessage = userMessages[userMessages.length - 1].content;
        let prompt = lastMessage;
        if (systemContent) prompt = `${systemContent}\n\n${lastMessage}`;

        const result = await chat.sendMessage(prompt);
        return result.response.text();

    } else if (model.startsWith("Ollama:")) {
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
        const cleanModelName = model.replace("Ollama: ", "");

        const ollamaOptions = {
            num_predict: 512,
            temperature: temperature
        };
        console.log("[Ollama] Requesting:", cleanModelName, JSON.stringify(ollamaOptions));

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: cleanModelName,
                messages: messages, // Send all messages including system if present
                stream: false,
                options: ollamaOptions
            })
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
        const data = await response.json();
        return data.message?.content || "";

    } else {
        // Llama 3 (Groq)
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: 'llama-3.3-70b-versatile',
            temperature: temperature
        });
        return completion.choices[0]?.message?.content || "";
    }
}

export async function POST(req: Request) {
    try {
        const { messages, model, sessionId } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages required' }, { status: 400 });
        }

        // 1. Fetch Model Settings
        let systemSettings = {
            systemPrompt: 'You are a helpful assistant.',
            useRAG: !model.toLowerCase().includes("finetune"), // Default: Auto-disable RAG for finetuned
            temperature: 0.7
        };

        console.log(`[API] Chat Request for Model: ${model}`);

        try {
            const dbSettings = await prisma.modelSettings.findUnique({ where: { modelId: model } });
            console.log(`[API] DB Settings:`, dbSettings);

            if (dbSettings) {
                // USER SETTINGS TAKE PRECEDENCE
                // If user explicitly saved settings, we trust them completely.

                // System Prompt: If empty string, it means "No System Prompt" (User intentional). 
                // If null/undefined in DB (shouldn't happen with our schema default but good to be safe), fall back.
                if (dbSettings.systemPrompt !== null) {
                    systemSettings.systemPrompt = dbSettings.systemPrompt;
                }

                systemSettings.useRAG = dbSettings.useRAG;
                systemSettings.temperature = dbSettings.temperature;
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        }

        console.log(`[API] Final System Settings:`, systemSettings);

        // 2. RAG Context
        let systemMessageContent = systemSettings.systemPrompt;
        const lastUserMessage = messages[messages.length - 1].content;

        if (systemSettings.useRAG) {
            const context = findRelevantContext(lastUserMessage);
            console.log(`[API] RAG Context found: ${!!context}`);
            if (context) {
                if (systemMessageContent) systemMessageContent += `\n\nReference Knowledge:\n${context}`;
                else systemMessageContent = `Reference Knowledge:\n${context}`;
            }
        }

        // 3. Get Main Response
        // We need to pass temperature to getCompletion
        const finalMessages = [
            ...(systemMessageContent ? [{ role: 'system', content: systemMessageContent }] : []),
            ...messages
        ];

        console.log(`[API] Sending to Model (System length): ${systemMessageContent.length}`);

        let responseContent = await getCompletion(model, finalMessages, systemSettings.temperature);

        // 3. Auto-Title (if first message in session or session is new)
        let newTitle = null;
        if (sessionId && messages.length <= 1) {
            // Simple check: if this is the first exchange
            const titlePrompt = [
                { role: 'system', content: 'You are a helpful assistant. Generate a very short, concise title (max 4-5 words) for this chat conversation based on the user initial message. Do not use quotes.' },
                { role: 'user', content: lastUserMessage }
            ];
            try {
                newTitle = await getCompletion(model, titlePrompt);
                newTitle = newTitle.replace(/^"|"$/g, '').trim(); // Remove quotes
            } catch (e) { console.error("Title gen failed", e); }
        }

        // Clean Response (remove <think> tags if appearing in main response)
        responseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // 5. DB Operations
        if (sessionId) {
            // Upsert Session (Update title if generated)
            const sessionData: any = { id: sessionId };
            if (newTitle) sessionData.title = newTitle;

            await prisma.session.upsert({
                where: { id: sessionId },
                update: newTitle ? { title: newTitle } : {},
                create: {
                    id: sessionId,
                    title: newTitle || "New Chat"
                }
            });

            // Save User Message
            const lastMsg = messages[messages.length - 1];
            await prisma.message.create({
                data: { content: lastMsg.content, role: 'user', sessionId }
            });

            // Save Assistant Message
            if (responseContent) {
                await prisma.message.create({
                    data: { content: responseContent, role: 'assistant', sessionId }
                });
            }
        }

        return NextResponse.json({
            response: responseContent,
            title: newTitle
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

