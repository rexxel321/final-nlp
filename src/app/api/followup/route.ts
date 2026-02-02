import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to get completion (Reused logic, can be extracted to lib but keeping here for simplicity now)
async function getCompletion(model: string, messages: any[]) {
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
        // Filter out system messages for Gemini's history, usually it handles system instruction differently 
        // but for simplicity we just prepending context to first message or using systemInstruction if supported.
        // For now, simpler approach:
        const history = userMessages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = geminiModel.startChat({
            history: history,
            generationConfig: { maxOutputTokens: 1024 }, // Short generation for follow-ups
        });

        const lastMessage = userMessages[userMessages.length - 1].content;
        const prompt = `${systemContent}\n\n${lastMessage}`;
        const result = await chat.sendMessage(prompt);
        return result.response.text();

    } else if (model.startsWith("Ollama:")) {
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
        const cleanModelName = model.replace("Ollama: ", "");

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: cleanModelName,
                messages: [{ role: 'system', content: systemContent }, ...userMessages],
                stream: false,
                options: {
                    num_predict: 200, // Limit tokens
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
        const data = await response.json();
        return data.message?.content || "";

    } else {
        // Llama 3 (Groq)
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: systemContent }, ...userMessages],
            model: 'llama-3.3-70b-versatile',
        });
        return completion.choices[0]?.message?.content || "";
    }
}

export async function POST(req: Request) {
    try {
        const { messages, model } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages required' }, { status: 400 });
        }

        const lastAssistantMessage = messages[messages.length - 1];
        if (lastAssistantMessage.role !== 'assistant') {
            return NextResponse.json({ followUps: [] }); // Wrong state
        }

        const followUpPrompt = [
            { role: 'system', content: 'You are an expert conversationalist. Generate 3 short, relevant, and engaging follow-up questions that the user might want to ask next. \n\nRULES:\n1. Return ONLY the questions.\n2. Separate them by newlines.\n3. Do NOT include numbering (1., -) or bullets.\n4. Do NOT output "Here are the questions" or any thinking tags like <think>.\n5. Keep them short (max 10 words).' },
            { role: 'user', content: `Based on this previous answer:\n"${lastAssistantMessage.content}"\n\nWhat are 3 good follow-up questions for me (the user) to ask?` }
        ];

        const output = await getCompletion(model, followUpPrompt);

        // Cleaning Logic
        let cleaned = output
            .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove <think> blocks
            .replace(/Here are.*?:\s*/i, '') // Remove intro text
            .trim();

        const followUps = cleaned
            .split('\n')
            .filter((line: string) => line.trim().length > 0)
            .map((l: string) => l.replace(/^[-\d.]+\s*/, '').trim()) // Remove 1. or - again just in case
            .slice(0, 3);

        return NextResponse.json({ followUps });

    } catch (error) {
        console.error("Follow-up generation error", error);
        return NextResponse.json({ followUps: [] });
    }
}
