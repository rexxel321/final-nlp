import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

interface MigrateRequest {
    sessionId: string;
    messages?: Array<{
        role: string;
        content: string;
        model?: string;
        createdAt?: string;
    }>;
    title?: string;
}

/**
 * Laravel-inspired session migration
 * When a guest logs in, transfer their localStorage session to their user account
 */
export async function POST(req: Request) {
    try {
        const { sessionId, messages, title }: MigrateRequest = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }

        // Get authenticated user
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token) as any;
        const userId = decoded?.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check if session already exists
        const existingSession = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (existingSession && existingSession.userId) {
            // Session already belongs to a user, skip migration
            return NextResponse.json({
                success: true,
                message: 'Session already migrated'
            });
        }

        // Create or update session with userId
        await prisma.session.upsert({
            where: { id: sessionId },
            update: {
                userId,
                title: title || undefined
            },
            create: {
                id: sessionId,
                userId,
                title: title || "New Chat"
            }
        });

        // Batch insert messages if provided (from localStorage)
        if (messages && messages.length > 0) {
            await prisma.message.createMany({
                data: messages.map(msg => ({
                    sessionId,
                    role: msg.role,
                    content: msg.content,
                    model: msg.model || null,
                    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date()
                })),
                skipDuplicates: true
            });

            console.log(`[Session Migration] Migrated ${messages.length} messages to session ${sessionId}`);
        }

        console.log(`[Session Migration] Session ${sessionId} migrated to user ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Session migrated successfully',
            messageCount: messages?.length || 0
        });

    } catch (error) {
        console.error('[Session Migration] Error:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
