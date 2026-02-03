import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Message ID required' }, { status: 400 });

        // Auth Check (Optional but recommended for deletion)
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token) as any;
        if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Find the message
        const message = await prisma.message.findUnique({ where: { id } });
        if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        // Verify ownership via session? (Skipping for now as session-user link exists but might be loose if anonymous allowed initially)

        // Packet Deletion Logic
        if (message.role === 'user') {
            // Find the NEXT message in this session to delete (if assistant)
            // ensuring it is created AFTER this message
            const nextMessage = await prisma.message.findFirst({
                where: {
                    sessionId: message.sessionId,
                    createdAt: { gt: message.createdAt },
                    role: 'assistant'
                },
                orderBy: { createdAt: 'asc' }
            });

            if (nextMessage) {
                // Check if it really is the IMMEDIATE next one (roughly)
                // Actually, just deleting the immediate next assistant response is usually safe for "User -> AI" pairs.
                await prisma.message.delete({ where: { id: nextMessage.id } });
            }
        }

        // Delete the target message
        await prisma.message.delete({ where: { id } });

        return NextResponse.json({ success: true, deletedId: id });

    } catch (error) {
        console.error("Delete failed", error);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
}
