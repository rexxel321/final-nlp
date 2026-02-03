import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, Shield, Circle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserHoverCardProps {
    user: {
        username?: string | null;
        name: string;
        email: string;
        avatar?: string;
        banner?: string;
        status: 'ONLINE' | 'DND' | 'IDLE' | 'INVISIBLE' | 'OFFLINE';
        bio?: string;
        role: 'USER' | 'ADMIN';
        createdAt?: string;
    };
    isOpen: boolean;
    onClose: () => void;
    position: 'right' | 'top'; // Where it should appear relative to trigger (Sidebar bottom usually implies right or top)
}

export default function UserHoverCard({ user, isOpen, onClose }: UserHoverCardProps) {
    if (!isOpen) return null;

    const statusColors = {
        ONLINE: 'bg-green-500',
        DND: 'bg-red-500',
        IDLE: 'bg-amber-500',
        INVISIBLE: 'bg-gray-400',
        OFFLINE: 'bg-gray-400'
    };

    const statusLabels = {
        ONLINE: 'Online',
        DND: 'Do Not Disturb',
        IDLE: 'Idle',
        INVISIBLE: 'Invisible',
        OFFLINE: 'Offline'
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute left-full bottom-0 ml-4 mb-4 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-[60]"
            >
                {/* Banner */}
                <div className="h-24 w-full bg-gradient-to-r from-blue-500 to-purple-600 relative">
                    {user.banner && (
                        <img
                            src={user.banner}
                            alt="Banner"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                {/* Content */}
                <div className="px-5 pb-5 pt-12 relative">
                    {/* Avatar */}
                    <div className="absolute -top-10 left-5">
                        <div className="relative">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-900 object-cover bg-white dark:bg-gray-800"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-900 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {user.name[0].toUpperCase()}
                                </div>
                            )}
                            {/* Status Indicator */}
                            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 ${statusColors[user.status]}`} />
                        </div>
                    </div>

                    {/* Role Badge */}
                    <div className="absolute top-3 right-4">
                        {user.role === 'ADMIN' && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Admin
                            </span>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="mt-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                            {user.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {user.username || user.email}
                        </p>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm text-gray-600 dark:text-gray-300 italic border border-gray-100 dark:border-gray-700/50">
                            "{user.bio}"
                        </div>
                    )}

                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                        </div>
                        {/* Status Text with Color Dot */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <Circle className={`w-3 h-3 ${statusColors[user.status].replace('bg-', 'text-')}`} fill="currentColor" />
                            <span>{statusLabels[user.status]}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
