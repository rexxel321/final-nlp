import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Password Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter  
 * - At least 1 number
 * - At least 1 special character (@$!%*?&)
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' };
    }
    if (!/[@$!%*?&]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
    }
    return { valid: true };
}

export async function POST(req: Request) {
    try {
        const { email, password, name, username } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        // Check for existing email (case-insensitive)
        const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingEmail) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
        }

        // Check for existing username (if provided)
        if (username) {
            const existingUsername = await prisma.user.findUnique({ where: { username } });
            if (existingUsername) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }
        }

        // Check if this is the first user (make them ADMIN)
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'USER';

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                username: username || null,
                password: hashedPassword,
                name: name || normalizedEmail.split('@')[0],
                role: role,
                status: 'ONLINE'
            }
        });

        const token = signToken({ userId: user.id, email: user.email });

        // Set HttpOnly Cookie
        (await cookies()).set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
        });

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                username: user.username,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
