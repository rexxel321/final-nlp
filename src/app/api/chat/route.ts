import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Groq Setup
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) console.error('GROQ_API_KEY is not set');
const groq = new Groq({ apiKey: groqApiKey });

// Gemini Setup
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) console.error('GEMINI_API_KEY is not set');
const genAI = new GoogleGenerativeAI(geminiApiKey || '');

export async function POST(req: Request) {
    try {
        const { messages, model } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const systemMessageContent = 'You are FitBuddy, an expert fitness and nutrition coach. Your goal is to provide helpful, accurate, and encouraging advice to users looking to improve their health. Provide actionable steps and clear explanations. Be friendly and motivating.';
        let responseContent = "";

        if (model === "Gemini") {
            // Gemini Logic
            const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Convert messages to Gemini format (history)
            const history = messages.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            const chat = geminiModel.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 4096,
                },
            });

            const lastMessage = messages[messages.length - 1].content;
            const prompt = `${systemMessageContent}\n\nUser query: ${lastMessage}`;

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            responseContent = response.text();

        } else {
            console.log("Using Llama model");
            // Llama 3 (Groq) Logic
            const systemMessage = {
                role: 'system',
                content: systemMessageContent,
            };

            const completion = await groq.chat.completions.create({
                messages: [
                    systemMessage,
                    ...messages
                ],
                model: 'llama-3.3-70b-versatile',
            });

            responseContent = completion.choices[0]?.message?.content || "";
        }

        return NextResponse.json({ response: responseContent });
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
