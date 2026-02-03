'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Save, Lock, Image as ImageIcon, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (userData: any) => void;
}

const POPULAR_EMOJIS = ['😀', '😎', '🎮', '🎵', '💤', '🎨', '📚', '🏃', '🍕', '☕', '🌟', '💻', '🎯', '🔥', '✨', '🎭', '🌈', '🎪', '🎬', '🎤'];

import { useAuth } from '@/context/AuthContext';

export default function ProfileEditor({ isOpen, onClose, onUpdate }: ProfileEditorProps) {
    const { refreshUser, theme, setTheme } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<'profile' | 'status' | 'security' | 'appearance'>('profile');

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
                const user = data.user;

                console.log('[ProfileEditor] Fetched user data:', user);

                setDisplayName(user.displayName || user.name || '');
                setUsername(user.username || '');
                setEmail(user.email || '');
                setPronouns(user.pronouns || '');
                setBio(user.bio || '');
                setAvatar(user.avatar || '');
                setBanner(user.banner || '');
                setStatusEmoji(user.statusEmoji || '');
                setStatusText(user.statusText || '');
                setChatBackground(user.backgroundImage || '');
                setBgOpacity(user.backgroundOpacity || 0.3);

                console.log('[ProfileEditor] State updated');
            } else {
                console.error('[ProfileEditor] Failed to fetch:', res.status);
                setError('Failed to load profile data');
            }
        } catch (e) {
            console.error('[ProfileEditor] Error:', e);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (field: 'avatar' | 'banner' | 'chatBackground', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations: Removed GIF restriction per user request

        // Validate file size (8MB)

        // Validate file size (8MB)
        if (file.size > 8 * 1024 * 1024) {
            setError('Image must be less than 8MB');
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => setError('Failed to read file');
        reader.onloadend = () => {
            const result = reader.result as string;
            console.log(`[ProfileEditor] Uploaded ${field}:`, result.substring(0, 50));
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

        // Validate password if changing
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
                setError('New password does not meet requirements');
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

            await refreshUser(); // Force refresh context data

            setSuccess('Profile updated successfully!');
            onUpdate(data.user);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (e) {
            setError('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="flex h-[calc(90vh-140px)]">
                        {/* Sidebar */}
                        <div className="w-56 bg-gray-50 p-4 overflow-y-auto border-r border-gray-200">
                            <div className="space-y-1">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'profile'
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    My Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('status')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'status'
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    Custom Status
                                </button>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'security'
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    Password & Security
                                </button>
                                <button
                                    onClick={() => setActiveTab('appearance')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'appearance'
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    Chat Background
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6">My Profile</h3>

                                        {/* Banner */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Banner</label>
                                            <div className="relative w-full h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl overflow-hidden">
                                                {banner && (
                                                    <img src={banner} alt="Banner" className="w-full h-full object-cover" />
                                                )}
                                                <label className="absolute top-2 right-2 p-2 bg-black/50 rounded-full cursor-pointer hover:bg-black/70 transition">
                                                    <Camera className="w-5 h-5 text-white" />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload('banner', e)}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Avatar */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Avatar</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-24 h-24 bg-gray-200 rounded-full overflow-hidden">
                                                    {avatar ? (
                                                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-bold">
                                                            {displayName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition cursor-pointer group">
                                                        <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleImageUpload('avatar', e)}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <p>Recommended: 128x128px</p>
                                                    <p>Max size: 8MB</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Display Name */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="Your display name"
                                            />
                                        </div>

                                        {/* Username */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="username"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Unique identifier for login</p>
                                        </div>

                                        {/* Email */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="you@example.com"
                                            />
                                        </div>

                                        {/* Pronouns */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Pronouns</label>
                                            <input
                                                type="text"
                                                value={pronouns}
                                                onChange={(e) => setPronouns(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="e.g. he/him, she/her, they/them"
                                            />
                                        </div>

                                        {/* Bio */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">About Me</label>
                                            <textarea
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24"
                                                placeholder="Tell us about yourself..."
                                                maxLength={190}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{bio.length}/190 characters</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status Tab */}
                            {activeTab === 'status' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6">Custom Status</h3>

                                        {/* Emoji Picker */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status Emoji</label>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 transition flex items-center gap-2"
                                                >
                                                    <Smile className="w-5 h-5" />
                                                    {statusEmoji || 'Select Emoji'}
                                                </button>
                                                {showEmojiPicker && (
                                                    <div className="absolute z-10 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-xl">
                                                        <div className="grid grid-cols-10 gap-2">
                                                            {POPULAR_EMOJIS.map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => {
                                                                        setStatusEmoji(emoji);
                                                                        setShowEmojiPicker(false);
                                                                    }}
                                                                    className="text-2xl hover:bg-gray-100 p-2 rounded transition"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Text */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status Message</label>
                                            <input
                                                type="text"
                                                value={statusText}
                                                onChange={(e) => setStatusText(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="What's on your mind?"
                                                maxLength={128}
                                            />
                                        </div>

                                        {/* Duration */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clear After</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setStatusDuration('1day')}
                                                    className={`flex-1 px-4 py-2 rounded-lg transition ${statusDuration === '1day'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    1 Day
                                                </button>
                                                <button
                                                    onClick={() => setStatusDuration('1week')}
                                                    className={`flex-1 px-4 py-2 rounded-lg transition ${statusDuration === '1week'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    1 Week
                                                </button>
                                                <button
                                                    onClick={() => setStatusDuration('never')}
                                                    className={`flex-1 px-4 py-2 rounded-lg transition ${statusDuration === 'never'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    Never
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        {(statusEmoji || statusText) && (
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-sm text-gray-700 font-semibold mb-2">Preview:</p>
                                                <div className="flex items-center gap-2 text-gray-900">
                                                    {statusEmoji && <span className="text-xl">{statusEmoji}</span>}
                                                    <span>{statusText || 'No message'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Clear Status */}
                                        <button
                                            onClick={() => {
                                                setStatusEmoji('');
                                                setStatusText('');
                                            }}
                                            className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                                        >
                                            Clear Status
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6">Password & Security</h3>

                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                                            <p className="text-sm text-amber-800 flex items-center">
                                                <Lock className="w-4 h-4 inline mr-2" />
                                                Changing your password will require you to log in again.
                                            </p>
                                        </div>

                                        {/* Current Password */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                                            <input
                                                type="password"
                                                value={oldPassword}
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="Enter current password"
                                            />
                                        </div>

                                        {/* New Password */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="Enter new password"
                                            />
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                placeholder="Confirm new password"
                                            />
                                        </div>

                                        {/* Password Requirements */}
                                        {newPassword && (
                                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                                <p className="text-sm font-semibold text-gray-700 mb-2">Password Requirements:</p>
                                                <ul className="space-y-1 text-sm">
                                                    <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                                                        {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                                                    </li>
                                                    <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                                        {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
                                                    </li>
                                                    <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                                        {/[a-z]/.test(newPassword) ? '✓' : '○'} One lowercase letter
                                                    </li>
                                                    <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                                        {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
                                                    </li>
                                                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                                        {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '○'} One special character
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Appearance Tab */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6">Chat Background</h3>

                                        {/* Background Upload */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Background Image</label>
                                            <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                                                {chatBackground ? (
                                                    <img src={chatBackground} alt="Background" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <div
                                                    className="absolute inset-0 bg-white"
                                                    style={{ opacity: 1 - bgOpacity }}
                                                />
                                                <label className="absolute top-2 right-2 px-4 py-2 bg-black/50 rounded-lg cursor-pointer hover:bg-black/70 transition text-white text-sm flex items-center gap-2">
                                                    <Upload className="w-4 h-4" />
                                                    Upload
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload('chatBackground', e)}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Opacity Slider */}
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm font-semibold text-gray-700">Background Opacity</label>
                                                <span className="text-sm text-blue-600 font-medium">{Math.round(bgOpacity * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={bgOpacity}
                                                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>Transparent</span>
                                                <span>Opaque</span>
                                            </div>
                                        </div>

                                        {/* Remove Background */}
                                        {chatBackground && (
                                            <button
                                                onClick={() => setChatBackground('')}
                                                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                                            >
                                                Remove Background
                                            </button>
                                        )}

                                        {/* Dark Mode Toggle */}
                                        <div className="mt-6">
                                            <h4 className="text-lg font-bold text-gray-900 mb-4">Theme</h4>
                                            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-gray-900">Dark Mode</h5>
                                                        <p className="text-xs text-gray-500 mt-1">Switch between light and dark themes</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {theme === 'dark' ? '🌙 Dark mode active' : '☀️ Light mode active'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                                {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div >
        </AnimatePresence >
    );
}
