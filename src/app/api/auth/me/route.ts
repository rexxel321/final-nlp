import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) return NextResponse.json({ user: null });

        const payload = verifyToken(token) as any;
        if (!payload || !payload.userId) return NextResponse.json({ user: null });

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                username: true,
                role: true,
                avatar: true,
                banner: true,
                bio: true,
                pronouns: true,
                backgroundImage: true,
                createdAt: true
            }
        });

        return NextResponse.json({ user });

    } catch (error) {
        return NextResponse.json({ user: null });
    }
}
