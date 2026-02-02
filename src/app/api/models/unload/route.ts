import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { model } = await req.json();

        if (!model) return NextResponse.json({ error: 'Model name required' }, { status: 400 });

        // Only unload Ollama models
        if (model.startsWith("Ollama:")) {
            const cleanModelName = model.replace("Ollama: ", "");
            const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

            // Send empty request with keep_alive: 0 to unload immediately
            await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: cleanModelName,
                    keep_alive: 0
                })
            });
            console.log(`Unloaded model: ${cleanModelName}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unload failed", error);
        return NextResponse.json({ error: 'Failed to unload model' }, { status: 500 });
    }
}
