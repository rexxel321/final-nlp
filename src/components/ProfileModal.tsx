"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Camera, Upload, Image as ImageIcon } from "lucide-react";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, login } = useAuth(); // login actually just updates user state logic
    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState((user as any)?.bio || "");
    const [pronouns, setPronouns] = useState((user as any)?.pronouns || "");
    const [banner, setBanner] = useState((user as any)?.banner || "");
    const [backgroundImage, setBackgroundImage] = useState((user as any)?.backgroundImage || "");
    const [isLoading, setIsLoading] = useState(false);

    // If user changes, update local state (e.g. initial load)
    // useEffect(() => { ... }, [user]); 

    if (!isOpen || !user) return null;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'background') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                if (type === 'banner') setBanner(data.url);
                if (type === 'background') setBackgroundImage(data.url);
            }
        } catch (error) {
            console.error("Upload failed", error);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, bio, pronouns, banner, backgroundImage })
            });
            const data = await res.json();
            if (res.ok && data.user) {
                login(data.user); // Update context
                onClose();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">

                {/* Banner Preview Area */}
                <div className="h-48 bg-gray-200 relative group shrink-0">
                    {banner && <img src={banner} alt="Banner" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-black/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black/70 transition">
                            <Camera className="w-4 h-4" /> Change Banner
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'banner')} />
                        </label>
                    </div>
                </div>

                {/* Avatar Area (Visual only for now, based on previous avatar logic) */}
                <div className="absolute top-36 left-6 z-10 w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg group">
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                        {name[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                </div>

                <div className="pt-16 px-6 pb-6 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                        <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pronouns</label>
                                <input value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="e.g. They/Them" className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">About Me</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full p-2 border rounded-lg" placeholder="Write something about yourself..." />
                        </div>

                        <div className="border-t pt-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Chat Customization</label>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-300">
                                        {backgroundImage ? (
                                            <img src={backgroundImage} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-6 h-6" /></div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Chat Background</div>
                                        <div className="text-xs text-gray-500">Visible only to you in your chats.</div>
                                    </div>
                                    <label className="ml-auto cursor-pointer bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 flex items-center gap-2">
                                        <Upload className="w-4 h-4" /> Upload
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'background')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-medium hover:underline">Cancel</button>
                    <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50">
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
