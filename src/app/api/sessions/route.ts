import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all sessions
export async function GET() {
    try {
        const sessions = await prisma.session.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });
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
