import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.error('GROQ_API_KEY is not set');
}

const groq = new Groq({
    apiKey: apiKey,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const systemMessage = {
            role: 'system',
            content: 'You are FitBuddy, an expert fitness and nutrition coach. Your goal is to provide helpful, accurate, and encouraging advice to users looking to improve their health. Provide actionable steps and clear explanations. Be friendly and motivating.',
        };

        const completion = await groq.chat.completions.create({
            messages: [
                systemMessage,
                ...messages
            ],
            model: 'llama-3.3-70b-versatile',
        });

        const responseCurrent = completion.choices[0]?.message?.content || "";

        return NextResponse.json({ response: responseCurrent });
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
