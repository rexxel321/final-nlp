import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Fetch current user profile
export async function GET() {
    try {
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) {
            console.log('[Profile API GET] No token');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = verifyToken(token) as any;
        console.log('[Profile API GET] Fetching profile for user:', decoded.userId);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                displayName: true,
                bio: true,
                pronouns: true,
                avatar: true,
                banner: true,
                statusEmoji: true,
                statusText: true,
                statusExpiresAt: true,
                backgroundImage: true,
                backgroundOpacity: true,
                status: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            console.log('[Profile API GET] User not found:', decoded.userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('[Profile API GET] SUCCESS - Returning user data:', {
            hasEmail: !!user.email,
            hasUsername: !!user.username,
            hasDisplayName: !!user.displayName
        });

        return NextResponse.json({ user });
    } catch (error) {
        console.error('[Profile API GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

// PATCH: Update user profile
export async function PATCH(req: Request) {
    try {
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = verifyToken(token) as any;
        const body = await req.json();

        console.log('[Profile API PATCH] Update request for user:', decoded.userId);
        console.log('[Profile API PATCH] Received body keys:', Object.keys(body));

        const {
            username,
            email,
            name,
            displayName,
            bio,
            pronouns,
            avatar,
            banner,
            statusEmoji,
            statusText,
            statusDuration, // "1day", "1week", "never"
            backgroundImage,
            backgroundOpacity,
            oldPassword,
            newPassword
        } = body;

        // If changing password, verify old password first
        if (newPassword) {
            if (!oldPassword) {
                return NextResponse.json({ error: 'Old password required' }, { status: 400 });
            }

            const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const isValid = await bcrypt.compare(oldPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Incorrect old password' }, { status: 401 });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: decoded.userId },
                data: { password: hashedPassword }
            });

            console.log('[Profile API PATCH] Password updated');
        }

        // Calculate status expiration
        let statusExpiresAt: Date | null = null;
        if (statusDuration === '1day') {
            statusExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } else if (statusDuration === '1week') {
            statusExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }

        // Check username uniqueness (ONLY if username has a non-empty value)
        if (username && username.trim() !== '' && username !== null) {
            const existing = await prisma.user.findFirst({
                where: {
                    username: username.trim(),
                    NOT: { id: decoded.userId }
                }
            });
            if (existing) {
                console.log('[Profile API PATCH] Username already taken:', username);
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
        }

        // Check email uniqueness (ONLY if email has a non-empty value)
        if (email && email.trim() !== '' && email !== null) {
            const existing = await prisma.user.findFirst({
                where: {
                    email: email.toLowerCase().trim(),
                    NOT: { id: decoded.userId }
                }
            });
            if (existing) {
                console.log('[Profile API PATCH] Email already in use:', email);
                return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
            }
        }

        // Build update data (only include fields that are explicitly provided and non-undefined)
        const updateData: any = {};

        if (displayName !== undefined) updateData.displayName = displayName || null;
        if (username !== undefined) updateData.username = username && username.trim() !== '' ? username : null;
        if (email !== undefined && email) updateData.email = email.toLowerCase();
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio || null;
        if (pronouns !== undefined) updateData.pronouns = pronouns || null;
        if (avatar !== undefined) updateData.avatar = avatar || null;
        if (banner !== undefined) updateData.banner = banner || null;
        if (statusEmoji !== undefined) updateData.statusEmoji = statusEmoji || null;
        if (statusText !== undefined) updateData.statusText = statusText || null;
        if (statusDuration !== undefined) updateData.statusExpiresAt = statusExpiresAt;
        if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage || null;
        if (backgroundOpacity !== undefined) updateData.backgroundOpacity = backgroundOpacity;

        console.log('[Profile API PATCH] Updating fields:', Object.keys(updateData));

        // Update profile
        const updated = await prisma.user.update({
            where: { id: decoded.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                displayName: true,
                bio: true,
                pronouns: true,
                avatar: true,
                banner: true,
                statusEmoji: true,
                statusText: true,
                statusExpiresAt: true,
                backgroundImage: true,
                backgroundOpacity: true,
                status: true
            }
        });

        console.log('[Profile API PATCH] SUCCESS - Profile updated');
        return NextResponse.json({ user: updated });
    } catch (error) {
        console.error('[Profile API PATCH] Error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
