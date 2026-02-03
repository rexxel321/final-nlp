"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, AlertCircle, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Password validation helper
function validatePassword(password: string) {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[@$!%*?&]/.test(password),
    };
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswordHint, setShowPasswordHint] = useState(false);
    const [showPassword, setShowPassword] = useState(false);


    const passwordChecks = useMemo(() => validatePassword(password), [password]);
    const isPasswordValid = !isLogin || Object.values(passwordChecks).every(Boolean);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Client-side Validation for Signup
        if (!isLogin) {
            if (!isPasswordValid) {
                setError("Password does not meet all requirements.");
                return;
            }
            if (!name.trim()) {
                setError("Name is required.");
                return;
            }
        }

        setIsLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const body = isLogin ? { email, password } : { email, password, name };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Authentication failed");

            login(data.user);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {isLogin ? "Welcome Back" : "Create Account"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="Your Name"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {isLogin ? "Email or Username" : "Email Address"}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                pattern={isLogin ? undefined : "[^@\\s]+@[^@\\s]+\\.[^@\\s]+"}
                                title="Please enter a valid email address"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                                placeholder={isLogin ? "username or email" : "you@example.com"}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Password Requirements Checklist - Always visible for signup */}
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</p>
                                    <div className="space-y-1.5">
                                        <RequirementCheck met={passwordChecks.length} text="At least 8 characters" />
                                        <RequirementCheck met={passwordChecks.uppercase} text="One uppercase letter (A-Z)" />
                                        <RequirementCheck met={passwordChecks.lowercase} text="One lowercase letter (a-z)" />
                                        <RequirementCheck met={passwordChecks.number} text="One number (0-9)" />
                                        <RequirementCheck met={passwordChecks.special} text="One special character (@$!%*?&)" />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || (!isLogin && !isPasswordValid)}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                isLogin ? "Sign In" : "Create Account"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-gray-500">
                            {isLogin ? "New to the platform? " : "Already have an account? "}
                        </span>
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError("");
                                setEmail("");
                                setPassword("");
                                setName("");
                                setShowPasswordHint(false);
                            }}
                            className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                        >
                            {isLogin ? "Create an account" : "Log in"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper component for password requirement checks
function RequirementCheck({ met, text }: { met: boolean; text: string }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${met ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                {met && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={met ? 'text-green-700 font-medium' : 'text-gray-600'}>
                {text}
            </span>
        </div>
    );
}
