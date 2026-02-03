import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, User, Check, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    avatar?: string;
    createdAt: string;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user?.role === 'ADMIN') {
            fetchUsers();
        }
    }, [isOpen, user]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (e) {
            console.error("Failed to fetch users", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
        setActionLoading(userId);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            }
        } catch (e) {
            console.error("Failed to update role", e);
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Admin Panel</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage users and roles</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-gray-800 dark:text-gray-200"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-gray-900">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            {u.avatar ? (
                                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {u.name[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    {u.name}
                                                    {u.id === user?.id && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.role === 'ADMIN'
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {u.role}
                                            </div>

                                            {u.id !== user?.id && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {u.role === 'USER' ? (
                                                        <button
                                                            onClick={() => handleRoleChange(u.id, 'ADMIN')}
                                                            disabled={actionLoading === u.id}
                                                            className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                                                            title="Promote to Admin"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                            Promote
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRoleChange(u.id, 'USER')}
                                                            disabled={actionLoading === u.id}
                                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                                                            title="Demote to User"
                                                        >
                                                            <User className="w-4 h-4" />
                                                            Demote
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
