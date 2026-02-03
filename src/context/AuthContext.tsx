"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAllGuestSessions } from '@/lib/guestSession';

interface User {
    id: string;
    email: string;
    username?: string | null;
    name: string;
    role: 'USER' | 'ADMIN';
    status: 'ONLINE' | 'DND' | 'IDLE' | 'INVISIBLE' | 'OFFLINE';
    bio?: string;
    pronouns?: string;
    avatar?: string;
    banner?: string;
    backgroundImage?: string;
    backgroundOpacity?: number;
    createdAt?: string;
}

type Theme = 'light' | 'dark' | 'oled';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    updateStatus: (status: User['status']) => void;
    refreshUser: () => Promise<void>;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState<Theme>('light');

    // Theme Logic
    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme;
        if (saved) {
            setTheme(saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('dark', 'oled');
        if (theme === 'dark') root.classList.add('dark');
        if (theme === 'oled') root.classList.add('dark', 'oled'); // oled also enables dark utilities
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Check for active session
        async function checkAuth() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) setUser(data.user);
                }
            } catch (e) {
                console.error("Auth check failed", e);
            } finally {
                setIsLoading(false);
            }
        }
        checkAuth();
    }, []);

    const login = (userData: User) => {
        setUser(userData);

        // Notify components about login (for session migration)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { userId: userData.id }
            }));
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);

            // Clear all guest session data from localStorage
            clearAllGuestSessions();

            // Notify components to clear state
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('auth:logout'));
            }
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const updateStatus = async (status: User['status']) => {
        if (!user) return;
        // Optimistic update
        setUser({ ...user, status });

        // Sync with backend
        fetch('/api/user/status', { method: 'POST', body: JSON.stringify({ status }) });
    };

    const refreshUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.user) setUser(data.user);
            }
        } catch (e) {
            console.error("Auth refresh failed", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateStatus, refreshUser, theme, setTheme }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
