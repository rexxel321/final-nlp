import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId');

    if (!modelId) return NextResponse.json({ error: 'Model ID required' }, { status: 400 });

    try {
        const settings = await prisma.modelSettings.findUnique({
            where: { modelId }
        });
        return NextResponse.json(settings || {});
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { modelId, systemPrompt, useRAG, temperature } = await req.json();

        if (!modelId) return NextResponse.json({ error: 'Model ID required' }, { status: 400 });

        const settings = await prisma.modelSettings.upsert({
            where: { modelId },
            update: { systemPrompt, useRAG, temperature },
            create: { modelId, systemPrompt, useRAG, temperature }
        });

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
