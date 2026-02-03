'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Save, Lock, Image as ImageIcon, Smile, Settings, User, Palette, Shield, Crown, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

interface UserSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (userData: any) => void;
}

const POPULAR_EMOJIS = ['😀', '😎', '🎮', '🎵', '💤', '🎨', '📚', '🏃', '🍕', '☕', '🌟', '💻', '🎯', '🔥', '✨', '🎭', '🌈', '🎪', '🎬', '🎤'];

// Admin Panel Component (integrated)
function AdminSection() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (e) {
            console.error('Failed to fetch users', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update role');
            }
        } catch (e) {
            alert('Failed to update role');
        }
    };

    if (loading) {
        return <div className="text-gray-400 text-sm">Loading users...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">User Management</h3>
            </div>
            <div className="space-y-2">
                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-lg">
                        <div className="flex items-center gap-3">
                            {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                    {user.name || user.email.split('@')[0]}
                                    {user.role === 'ADMIN' && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded">
                                            <Crown className="w-3 h-3" /> ADMIN
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400">{user.email}</div>
                            </div>
                        </div>
                        <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="bg-[#1e1f22] border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function UserSettings({ isOpen, onClose, onUpdate }: UserSettingsProps) {
    const { user, refreshUser, theme, setTheme } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeSection, setActiveSection] = useState<string>('my-account');

    // Profile data
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [pronouns, setPronouns] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const [banner, setBanner] = useState('');

    // Status
    const [statusEmoji, setStatusEmoji] = useState('');
    const [statusText, setStatusText] = useState('');
    const [statusDuration, setStatusDuration] = useState<'1day' | '1week' | 'never'>('never');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Security
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Appearance
    const [chatBackground, setChatBackground] = useState('');
    const [bgOpacity, setBgOpacity] = useState(0.3);

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                const u = data.user;
                setDisplayName(u.displayName || u.name || '');
                setUsername(u.username || '');
                setEmail(u.email || '');
                setPronouns(u.pronouns || '');
                setBio(u.bio || '');
                setAvatar(u.avatar || '');
                setBanner(u.banner || '');
                setStatusEmoji(u.statusEmoji || '');
                setStatusText(u.statusText || '');
                setChatBackground(u.backgroundImage || '');
                setBgOpacity(u.backgroundOpacity ?? 0.3);
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (field: 'avatar' | 'banner' | 'chatBackground', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            setError('Image must be less than 8MB');
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => setError('Failed to read file');
        reader.onloadend = () => {
            const result = reader.result as string;
            if (field === 'avatar') setAvatar(result);
            else if (field === 'banner') setBanner(result);
            else if (field === 'chatBackground') setChatBackground(result);
        };
        reader.readAsDataURL(file);
    };

    const validatePassword = (pwd: string) => {
        const checks = {
            length: pwd.length >= 8,
            upper: /[A-Z]/.test(pwd),
            lower: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
        };
        return Object.values(checks).every(Boolean);
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        if (newPassword) {
            if (!oldPassword) {
                setError('Please enter your current password');
                setLoading(false);
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('New passwords do not match');
                setLoading(false);
                return;
            }
            if (!validatePassword(newPassword)) {
                setError('Password does not meet requirements');
                setLoading(false);
                return;
            }
        }

        try {
            const updateData: any = {
                displayName,
                username: username || null,
                email,
                pronouns: pronouns || null,
                bio: bio || null,
                avatar: avatar || null,
                banner: banner || null,
                statusEmoji: statusEmoji || null,
                statusText: statusText || null,
                statusDuration: statusEmoji || statusText ? statusDuration : null,
                backgroundImage: chatBackground || null,
                backgroundOpacity: bgOpacity
            };

            if (newPassword && oldPassword) {
                updateData.oldPassword = oldPassword;
                updateData.newPassword = newPassword;
            }

            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to update profile');
                setLoading(false);
                return;
            }

            await refreshUser();
            setSuccess('Changes saved!');
            onUpdate(data.user);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');

            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setError('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const menuItems = [
        { id: 'my-account', label: 'My Account', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'chat-background', label: 'Chat Background', icon: ImageIcon },
        ...(user?.role === 'ADMIN' ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : [])
    ];

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
                {/* Modal Container - Theme Aware */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#313338] rounded-xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden relative"
                >
                    {/* Left Sidebar - Theme Aware */}
                    <div className="w-52 bg-gray-50 dark:bg-[#2b2d31] flex flex-col flex-shrink-0 border-r border-gray-200 dark:border-[#1e1f22]">
                        {/* User Header */}
                        <div className="p-4 border-b border-[#1e1f22]">
                            <div className="flex items-center gap-3">
                                {avatar ? (
                                    <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                        {displayName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-white truncate flex items-center gap-1">
                                        {displayName || username || 'User'}
                                        {user?.role === 'ADMIN' && (
                                            <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">Edit Profile</div>
                                </div>
                            </div>
                        </div>

                        {/* Menu */}
                        <div className="flex-1 p-2 overflow-y-auto">
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-2 py-2">
                                User Settings
                            </div>
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${activeSection === item.id
                                        ? 'bg-[#404249] text-white'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#35373c]'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                    {item.id === 'admin' && (
                                        <span className="ml-auto px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded">
                                            ADMIN
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Logout */}
                        <div className="p-2 border-t border-[#1e1f22]">
                            <button
                                onClick={onClose}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#35373c] rounded transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Close Settings
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-10">
                            <div className="max-w-2xl">
                                {/* My Account Section */}
                                {activeSection === 'my-account' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-white mb-6">My Account</h2>

                                        {/* Profile Card with Banner */}
                                        <div className="bg-[#1e1f22] rounded-lg overflow-hidden">
                                            {/* Banner */}
                                            <div className="h-24 relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                                {banner && (
                                                    <img src={banner} alt="" className="w-full h-full object-cover" />
                                                )}
                                                <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition cursor-pointer group">
                                                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload('banner', e)}
                                                    />
                                                </label>
                                            </div>

                                            {/* Profile Info */}
                                            <div className="px-4 pb-4">
                                                <div className="flex items-end justify-between -mt-10 mb-4">
                                                    {/* Avatar */}
                                                    <div className="relative">
                                                        <div className="w-20 h-20 rounded-full border-4 border-[#1e1f22] overflow-hidden bg-[#2b2d31]">
                                                            {avatar ? (
                                                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600">
                                                                    {displayName?.[0]?.toUpperCase() || '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 hover:bg-black/50 transition cursor-pointer group">
                                                            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleImageUpload('avatar', e)}
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* Badges */}
                                                    <div className="flex items-center gap-1 mb-2">
                                                        {user?.role === 'ADMIN' && (
                                                            <div className="p-1.5 bg-purple-500/20 rounded" title="Admin">
                                                                <Shield className="w-4 h-4 text-purple-400" />
                                                            </div>
                                                        )}
                                                        <div className="p-1.5 bg-blue-500/20 rounded" title="FitBuddy User">
                                                            <Sparkles className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Name Display */}
                                                <div className="text-lg font-bold text-white flex items-center gap-2">
                                                    {displayName || username || 'User'}
                                                    {user?.role === 'ADMIN' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full">
                                                            <Crown className="w-3 h-3" /> ADMIN
                                                        </span>
                                                    )}
                                                </div>
                                                {username && (
                                                    <div className="text-sm text-gray-400">@{username}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Form Fields */}
                                        <div className="bg-[#1e1f22] rounded-lg p-4 space-y-4">
                                            {/* Display Name */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Display Name</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={displayName}
                                                        onChange={(e) => setDisplayName(e.target.value)}
                                                        className="flex-1 bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                        placeholder="Your display name"
                                                    />
                                                </div>
                                            </div>

                                            {/* Username */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Username</label>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="username"
                                                />
                                            </div>

                                            {/* Email */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="you@example.com"
                                                />
                                            </div>

                                            {/* Pronouns */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Pronouns</label>
                                                <input
                                                    type="text"
                                                    value={pronouns}
                                                    onChange={(e) => setPronouns(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="e.g. he/him, she/her"
                                                />
                                            </div>

                                            {/* Bio */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">About Me</label>
                                                <textarea
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none h-20"
                                                    placeholder="Tell us about yourself..."
                                                    maxLength={190}
                                                />
                                                <div className="text-xs text-gray-500 mt-1">{bio.length}/190</div>
                                            </div>
                                        </div>

                                        {/* Password Section */}
                                        <div className="bg-[#1e1f22] rounded-lg p-4 space-y-4">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <Lock className="w-4 h-4" />
                                                Password & Authentication
                                            </h3>

                                            <div className="grid gap-3">
                                                <input
                                                    type="password"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="Current password"
                                                />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="New password"
                                                />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full bg-[#1e1f22] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="Confirm new password"
                                                />
                                            </div>

                                            {newPassword && (
                                                <div className="text-xs text-gray-400 space-y-1">
                                                    <div className={newPassword.length >= 8 ? 'text-green-400' : ''}>
                                                        {newPassword.length >= 8 ? '✓' : '○'} 8+ characters
                                                    </div>
                                                    <div className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>
                                                        {/[A-Z]/.test(newPassword) ? '✓' : '○'} Uppercase
                                                    </div>
                                                    <div className={/[a-z]/.test(newPassword) ? 'text-green-400' : ''}>
                                                        {/[a-z]/.test(newPassword) ? '✓' : '○'} Lowercase
                                                    </div>
                                                    <div className={/[0-9]/.test(newPassword) ? 'text-green-400' : ''}>
                                                        {/[0-9]/.test(newPassword) ? '✓' : '○'} Number
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Appearance Section */}
                                {activeSection === 'appearance' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-white mb-6">Appearance</h2>

                                        <div className="bg-[#1e1f22] rounded-lg p-4">
                                            <h3 className="text-sm font-bold text-white mb-4">Theme</h3>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setTheme('light')}
                                                    className={`flex-1 p-4 rounded-lg border-2 transition ${theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="text-center">
                                                        <div className="text-2xl mb-2">☀️</div>
                                                        <div className="text-sm text-white font-medium">Light</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setTheme('dark')}
                                                    className={`flex-1 p-4 rounded-lg border-2 transition ${theme === 'dark' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="text-center">
                                                        <div className="text-2xl mb-2">🌙</div>
                                                        <div className="text-sm text-white font-medium">Dark</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setTheme('oled')}
                                                    className={`flex-1 p-4 rounded-lg border-2 transition ${theme === 'oled' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="text-center">
                                                        <div className="text-2xl mb-2">🖤</div>
                                                        <div className="text-sm text-white font-medium">OLED</div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Custom Status */}
                                        <div className="bg-[#1e1f22] rounded-lg p-4 space-y-4">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <Smile className="w-4 h-4" />
                                                Custom Status
                                            </h3>

                                            <div className="flex gap-2">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                        className="w-10 h-10 flex items-center justify-center bg-[#2b2d31] rounded text-xl hover:bg-[#35373c] transition"
                                                    >
                                                        {statusEmoji || '😀'}
                                                    </button>
                                                    {showEmojiPicker && (
                                                        <div className="absolute top-12 left-0 z-10 p-2 bg-[#2b2d31] border border-gray-700 rounded-lg shadow-xl grid grid-cols-5 gap-1">
                                                            {POPULAR_EMOJIS.map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => {
                                                                        setStatusEmoji(emoji);
                                                                        setShowEmojiPicker(false);
                                                                    }}
                                                                    className="text-xl p-1 hover:bg-[#35373c] rounded"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={statusText}
                                                    onChange={(e) => setStatusText(e.target.value)}
                                                    className="flex-1 bg-[#2b2d31] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    placeholder="What's happening?"
                                                    maxLength={128}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                {['1day', '1week', 'never'].map(dur => (
                                                    <button
                                                        key={dur}
                                                        onClick={() => setStatusDuration(dur as any)}
                                                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${statusDuration === dur
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-[#2b2d31] text-gray-400 hover:text-white'
                                                            }`}
                                                    >
                                                        {dur === '1day' ? '1 Day' : dur === '1week' ? '1 Week' : 'Never'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chat Background Section */}
                                {activeSection === 'chat-background' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-white mb-6">Chat Background</h2>

                                        <div className="bg-[#1e1f22] rounded-lg p-4 space-y-4">
                                            {/* Preview */}
                                            <div className="relative h-48 rounded-lg overflow-hidden bg-[#2b2d31]">
                                                {chatBackground ? (
                                                    <img src={chatBackground} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                        <ImageIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <div
                                                    className="absolute inset-0 bg-[#313338]"
                                                    style={{ opacity: 1 - bgOpacity }}
                                                />
                                                <label className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 transition">
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Upload
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload('chatBackground', e)}
                                                    />
                                                </label>
                                            </div>

                                            {/* Opacity Slider */}
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                                    <span>Background Opacity</span>
                                                    <span className="text-blue-400">{Math.round(bgOpacity * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={bgOpacity}
                                                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                                                />
                                            </div>

                                            {chatBackground && (
                                                <button
                                                    onClick={() => setChatBackground('')}
                                                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs font-medium hover:bg-red-500/30 transition"
                                                >
                                                    Remove Background
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Admin Section */}
                                {activeSection === 'admin' && user?.role === 'ADMIN' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
                                        <div className="bg-[#1e1f22] rounded-lg p-4">
                                            <AdminSection />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[#1e1f22] bg-[#2b2d31]">
                            <div className="max-w-2xl flex items-center justify-between">
                                <div>
                                    {error && <p className="text-sm text-red-400">{error}</p>}
                                    {success && <p className="text-sm text-green-400">{success}</p>}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-[#35373c] rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
