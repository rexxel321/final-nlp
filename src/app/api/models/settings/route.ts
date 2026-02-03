import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

/**
 * GET: Fetch user-specific model settings
 * Returns default values if:
 * - User not logged in (guest)
 * - No settings saved for this user+model
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId');

    if (!modelId) return NextResponse.json({ error: 'Model ID required' }, { status: 400 });

    try {
        // Check if user is authenticated
        const token = (await cookies()).get('auth_token')?.value;

        if (!token) {
            // GUEST: Return default settings (no custom prompt)
            return NextResponse.json({
                modelId,
                systemPrompt: "",
                useRAG: true,
                temperature: 0.7
            });
        }

        const decoded = verifyToken(token) as any;
        const userId = decoded?.userId;

        if (!userId) {
            // Invalid token: Return defaults
            return NextResponse.json({
                modelId,
                systemPrompt: "",
                useRAG: true,
                temperature: 0.7
            });
        }

        // LOGGED-IN USER: Fetch their specific settings
        const settings = await prisma.modelSettings.findUnique({
            where: {
                modelId_userId: {
                    modelId,
                    userId
                }
            }
        });

        if (!settings) {
            // No settings yet for this user+model: Return defaults
            return NextResponse.json({
                modelId,
                systemPrompt: "",
                useRAG: true,
                temperature: 0.7
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('[Model Settings GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

/**
 * POST: Save user-specific model settings
 * REQUIRES AUTHENTICATION
 */
export async function POST(req: Request) {
    try {
        const { modelId, systemPrompt, useRAG, temperature } = await req.json();

        if (!modelId) return NextResponse.json({ error: 'Model ID required' }, { status: 400 });

        // Require authentication
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const decoded = verifyToken(token) as any;
        const userId = decoded?.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Save settings for THIS user only
        const settings = await prisma.modelSettings.upsert({
            where: {
                modelId_userId: {
                    modelId,
                    userId
                }
            },
            update: { systemPrompt, useRAG, temperature },
            create: { modelId, userId, systemPrompt, useRAG, temperature }
        });

        console.log(`[Model Settings] Saved for user ${userId}, model ${modelId}`);
        return NextResponse.json(settings);
    } catch (error) {
        console.error('[Model Settings POST] Error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
