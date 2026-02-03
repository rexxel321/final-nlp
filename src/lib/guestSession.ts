// Guest Session Management (localStorage)
// Used when user is NOT logged in - data is ephemeral

import { Message } from "@/components/ChatInterface";

const GUEST_SESSION_PREFIX = "guest_session_";

export interface GuestSessionData {
    messages: Message[];
    title: string;
    createdAt: number;
}

/**
 * Save guest session to localStorage
 */
export function saveGuestSession(sessionId: string, data: GuestSessionData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`${GUEST_SESSION_PREFIX}${sessionId}`, JSON.stringify(data));
    } catch (e) {
        console.error('[Guest Session] Failed to save:', e);
    }
}

/**
 * Load guest session from localStorage
 */
export function loadGuestSession(sessionId: string): GuestSessionData | null {
    if (typeof window === 'undefined') return null;
    try {
        const data = localStorage.getItem(`${GUEST_SESSION_PREFIX}${sessionId}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('[Guest Session] Failed to load:', e);
        return null;
    }
}

/**
 * Clear specific guest session
 */
export function clearGuestSession(sessionId: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${GUEST_SESSION_PREFIX}${sessionId}`);
}

/**
 * Clear ALL guest sessions (on logout)
 */
export function clearAllGuestSessions() {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(GUEST_SESSION_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
    console.log('[Guest Session] Cleared all guest data');
}

/**
 * Get all guest session IDs
 */
export function getAllGuestSessionIds(): string[] {
    if (typeof window === 'undefined') return [];
    const keys = Object.keys(localStorage);
    return keys
        .filter(key => key.startsWith(GUEST_SESSION_PREFIX))
        .map(key => key.replace(GUEST_SESSION_PREFIX, ''));
}
