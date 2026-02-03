import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to check admin status
async function isAdmin() {
    try {
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) return false;

        const payload = verifyToken(token) as any;
        if (!payload || !payload.userId) return false;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { role: true }
        });

        return user?.role === 'ADMIN';
    } catch {
        return false;
    }
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ users });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, role } = await req.json();

        if (!userId || !['USER', 'ADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Prevent demoting the last admin
        if (role === 'USER') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

            if (targetUser?.role === 'ADMIN' && adminCount <= 1) {
                return NextResponse.json({
                    error: 'Cannot demote the last admin. Promote another user first.'
                }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: { id: true, role: true }
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Check if this is the last admin
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (targetUser?.role === 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                return NextResponse.json({
                    error: 'Cannot delete the last admin account.'
                }, { status: 400 });
            }
        }

        await prisma.user.delete({ where: { id: userId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
