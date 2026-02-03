import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { email: emailOrUsername, password } = await req.json();

        // Allow login with Email OR Username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername.toLowerCase() }, // Case-insensitive email
                    { username: emailOrUsername }
                ]
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = signToken({ userId: user.id, email: user.email });

        (await cookies()).set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60,
            path: '/'
        });

        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, status: user.status } });

    } catch (error) {
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
