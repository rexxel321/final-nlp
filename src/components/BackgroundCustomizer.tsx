'use client';

import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BackgroundCustomizerProps {
    isOpen: boolean;
    onClose: () => void;
    currentBackground?: string;
    currentOpacity?: number;
    onSave: (imageUrl: string | null, opacity: number) => void;
}

export default function BackgroundCustomizer({
    isOpen,
    onClose,
    currentBackground,
    currentOpacity = 0.3,
    onSave
}: BackgroundCustomizerProps) {
    const [imageUrl, setImageUrl] = useState(currentBackground || '');
    const [opacity, setOpacity] = useState(currentOpacity);
    const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
    const [previewImage, setPreviewImage] = useState(currentBackground || '');

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setImageUrl(result);
                setPreviewImage(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlChange = (url: string) => {
        setImageUrl(url);
        setPreviewImage(url);
    };

    const handleSave = () => {
        onSave(imageUrl || null, opacity);
        onClose();
    };

    const handleClear = () => {
        setImageUrl('');
        setPreviewImage('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <ImageIcon className="w-5 h-5 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Background Customization</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Preview */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Preview</label>
                                <div
                                    className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200"
                                    style={{
                                        backgroundImage: previewImage ? `url(${previewImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundColor: '#f3f4f6'
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 bg-white"
                                        style={{ opacity: 1 - opacity }}
                                    />
                                    <div className="relative z-10 flex items-center justify-center h-full">
                                        {!previewImage ? (
                                            <div className="text-center">
                                                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No background selected</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                                                <p className="text-sm font-medium text-gray-700">Chat messages will appear here</p>
                                                <p className="text-xs text-gray-500 mt-1">Background opacity: {Math.round(opacity * 100)}%</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Upload Method */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Upload Method</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setUploadMode('url')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${uploadMode === 'url'
                                                ? 'bg-purple-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Image URL
                                    </button>
                                    <button
                                        onClick={() => setUploadMode('file')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${uploadMode === 'file'
                                                ? 'bg-purple-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Upload File
                                    </button>
                                </div>
                            </div>

                            {/* URL Input */}
                            {uploadMode === 'url' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => handleUrlChange(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                                        />
                                        {imageUrl && (
                                            <button
                                                onClick={handleClear}
                                                className="px-3 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* File Upload */}
                            {uploadMode === 'file' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Image</label>
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-600 font-medium">Click to upload</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Opacity Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-semibold text-gray-700">Background Opacity</label>
                                    <span className="text-sm font-mono text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                        {Math.round(opacity * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={opacity}
                                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gradient-to-r from-gray-200 to-purple-500 rounded-lg appearance-none cursor-pointer slider-purple"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>Transparent (0%)</span>
                                    <span>Visible (50%)</span>
                                    <span>Opaque (100%)</span>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips for best results:</p>
                                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                                    <li>Use high-resolution images (1920x1080 or higher)</li>
                                    <li>Keep opacity between 20-40% for readability</li>
                                    <li>Subtle patterns work better than busy images</li>
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button
                                onClick={handleClear}
                                className="px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                Clear Background
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all active:scale-95"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
