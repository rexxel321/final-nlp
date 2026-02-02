import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
        const response = await fetch(`${OLLAMA_URL}/api/tags`);

        if (!response.ok) {
            throw new Error('Failed to fetch from Ollama');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ models: [] }, { status: 500 });
    }
}
