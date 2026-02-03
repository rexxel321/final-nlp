import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { status } = await req.json();
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token) as any;
        if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await prisma.user.update({
            where: { id: payload.userId },
            data: { status }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}
