import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers'; // Added import for cookies
import { verifyToken } from '@/lib/auth'; // Assuming verifyToken is in this path

// GET: List all sessions
export async function GET(req: Request) {
    try {
        // CRITICAL FIX: Get user ID from auth token
        const token = (await cookies()).get('auth_token')?.value;
        const userId = token ? (verifyToken(token) as any)?.userId : null;

        // Guests get NO database sessions (they use localStorage)
        if (!userId) {
            console.log('[Sessions API] Guest user - returning empty array');
            return NextResponse.json([]);
        }

        // Only fetch sessions for THIS specific user
        const sessions = await prisma.session.findMany({
            where: {
                userId: userId  // CRITICAL: User isolation
            },
            orderBy: { updatedAt: 'desc' },
            select: { // Changed from include to select, and added specific fields
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                _count: { // Re-added _count to support filtering by message count
                    select: { messages: true }
                }
            }
        });

        console.log(`[Sessions API] Returning ${sessions.length} sessions for user ${userId}`);

        // Filter out empty sessions if desired, or keep them
        const validSessions = sessions.filter(s => s._count.messages > 0);
        return NextResponse.json({ sessions: validSessions });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

// PATCH: Rename a session
export async function PATCH(req: Request) {
    try {
        const { id, title } = await req.json();
        const updated = await prisma.session.update({
            where: { id },
            data: { title }
        });
        return NextResponse.json({ session: updated });
    } catch (error) {
        console.error("Error renaming session", error);
        return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 });
    }
}

// DELETE: Delete a session
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.session.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
