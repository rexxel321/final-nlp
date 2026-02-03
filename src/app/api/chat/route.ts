import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Reverting strict package name if needed, but @google/generative-ai is correct.
// Wait, in step 1130 I changed it to @google-generativeai but that might be wrong? 
// The original file (Step 1116) had @google/generative-ai. 
// I should stick to @google/generative-ai unless I know otherwise. 
// The user error didn't complain about package, but I'll revert to safe known state.

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

        if (!response.ok) throw new Error(`Ollama error: ${response.statusText} `);
        const data = await response.json();
        return data.message?.content || "";

    } else {
        // Llama 3 (Groq)
        try {
            if (!groqApiKey) throw new Error("Groq API Key (GROQ_API_KEY) is missing");
            const completion = await groq.chat.completions.create({
                messages: messages,
                model: 'llama-3.3-70b-versatile',
                temperature: temperature
            });
            return completion.choices[0]?.message?.content || "";
        } catch (error: any) {
            if (error?.status === 401) {
                throw new Error("Invalid Groq API Key. Please check your .env file.");
            }
            throw error;
        }
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, model, sessionId, regenerateId } = body;

        // Get userId from auth token (moved up from line 197)
        const token = (await cookies()).get('auth_token')?.value;
        const userId = token ? (verifyToken(token) as any)?.userId : null;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages required' }, { status: 400 });
        }

        // 1. Fetch Model Settings
        let systemSettings = {
            systemPrompt: 'You are a helpful assistant.',
            useRAG: !model.toLowerCase().includes("finetune"), // Default: Auto-disable RAG for finetuned
            temperature: 0.7
        };

        console.log(`[API] Chat Request for Model: ${model}, User: ${userId || 'guest'}`);

        try {
            if (userId) {
                // Fetch USER-SPECIFIC settings
                const dbSettings = await prisma.modelSettings.findUnique({
                    where: {
                        modelId_userId: {
                            modelId: model,
                            userId: userId
                        }
                    }
                });
                console.log(`[API] User-Specific Settings:`, dbSettings);

                if (dbSettings) {
                    if (dbSettings.systemPrompt !== null) {
                        systemSettings.systemPrompt = dbSettings.systemPrompt;
                    }
                    systemSettings.useRAG = dbSettings.useRAG;
                    systemSettings.temperature = dbSettings.temperature;
                }
            } else {
                console.log(`[API] Guest user - using default settings`);
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        }

        console.log(`[API] Final System Settings: `, systemSettings);

        // 2. RAG Context
        let systemMessageContent = systemSettings.systemPrompt;
        const lastUserMessage = messages[messages.length - 1].content;

        if (systemSettings.useRAG) {
            const context = findRelevantContext(lastUserMessage);
            console.log(`[API] RAG Context found: ${!!context} `);
            if (context) {
                if (systemMessageContent) systemMessageContent += `\n\nReference Knowledge: \n${context} `;
                else systemMessageContent = `Reference Knowledge: \n${context} `;
            }
        }

        // 3. Get Main Response
        const finalMessages = [
            ...(systemMessageContent ? [{ role: 'system', content: systemMessageContent }] : []),
            ...messages
        ];

        console.log(`[API] Sending to Model(System length): ${systemMessageContent.length} `);

        let responseContent = await getCompletion(model, finalMessages, systemSettings.temperature);

        // 4. Auto-Title
        let newTitle = null;
        if (sessionId && messages.length <= 1) {
            const titlePrompt = [
                { role: 'system', content: 'You are a helpful assistant. Generate a very short, concise title (max 4-5 words) for this chat conversation based on the user initial message. Do not use quotes.' },
                { role: 'user', content: lastUserMessage }
            ];
            try {
                let generatedTitle = await getCompletion(model, titlePrompt);
                generatedTitle = generatedTitle.replace(/^"|"$/g, '').trim();
                if (generatedTitle.length > 50) generatedTitle = generatedTitle.substring(0, 50) + "...";
                newTitle = generatedTitle;
            } catch (e) { console.error("Title gen failed", e); }
        }

        // Clean Response
        responseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();



        // 5. DB Operations
        let savedMessage = null;
        let userMessageObj = null;

        // OPTION A: ONLY save to DB for logged-in users
        // Guests use localStorage (handled in frontend)
        if (sessionId && userId) {
            // Upsert Session
            await prisma.session.upsert({
                where: { id: sessionId },
                update: newTitle ? { title: newTitle } : {},
                create: {
                    id: sessionId,
                    userId: userId, // null for guests, set on login migration
                    title: newTitle || "New Chat"
                }
            });

            // Save User Message (Avoid duplication if regenerating)
            const lastMsg = messages[messages.length - 1];

            // Basic dedup check
            const existingUserMsg = await prisma.message.findFirst({
                where: {
                    sessionId,
                    role: lastMsg.role,
                    content: lastMsg.content,
                    createdAt: { gt: new Date(Date.now() - 5000) }
                }
            });

            userMessageObj = existingUserMsg;
            if (!existingUserMsg && lastMsg.role === 'user') {
                userMessageObj = await prisma.message.create({
                    data: { content: lastMsg.content, role: 'user', sessionId }
                });
            }

            // Save/Update Assistant Message
            if (responseContent) {
                if (regenerateId) {
                    // VERSIONING LOGIC
                    const oldMsg = await prisma.message.findUnique({ where: { id: regenerateId } });
                    if (oldMsg) {
                        const oldVersion = {
                            content: oldMsg.content,
                            model: (oldMsg as any).model,
                            createdAt: oldMsg.createdAt
                        };

                        const currentVersions = ((oldMsg as any).versions as any[]) || [];

                        savedMessage = await prisma.message.update({
                            where: { id: regenerateId },
                            data: {
                                content: responseContent,
                                model: model,
                                versions: [...currentVersions, oldVersion]
                            }
                        });
                    }
                } else {
                    savedMessage = await prisma.message.create({
                        data: {
                            content: responseContent,
                            role: 'assistant',
                            sessionId,
                            model: model
                        }
                    });
                }
            }
        }


        // Return full object if available (for versions)
        return NextResponse.json({
            response: responseContent,
            title: newTitle,
            regeneratedId: regenerateId,
            messageObject: savedMessage, // Assistant Msg
            userMessageObject: userMessageObj // User Msg (so we have the ID)
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

