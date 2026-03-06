"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { DraftComplaintInfo } from "./submit-confirmation-card";
import { MapPin, X, CheckCircle, Save, Camera, Trash2 } from "lucide-react";

interface EditComplaintDetailsProps {
    draftComplaintInfo: DraftComplaintInfo;
    categoryLabels: Record<string, string>;
    locationCoords: { lat: number; lng: number } | null;
    selectedImage: File | null;
    imagePreviewUrl: string | null;
    onSave: (updates: Partial<DraftComplaintInfo>) => void;
    onCancel: () => void;
    onRequestLocationPin: () => void;
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImageRemove: () => void;
}

const PRIORITIES = ["low", "medium", "high"];

export function EditComplaintDetails({
    draftComplaintInfo,
    categoryLabels,
    locationCoords,
    selectedImage,
    imagePreviewUrl,
    onSave,
    onCancel,
    onRequestLocationPin,
    onImageSelect,
    onImageRemove,
}: EditComplaintDetailsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [transcript, setTranscript] = useState(draftComplaintInfo.transcript);
    const [category, setCategory] = useState(draftComplaintInfo.category);
    const [priority, setPriority] = useState(draftComplaintInfo.priority);
    const [ward, setWard] = useState(draftComplaintInfo.ward);
    const [isAnonymous, setIsAnonymous] = useState(draftComplaintInfo.isAnonymous);
    const [contactNumber, setContactNumber] = useState(draftComplaintInfo.contactNumber || "");

    const handleSave = () => {
        onSave({
            transcript,
            category,
            priority,
            ward,
            isAnonymous,
            contactNumber: isAnonymous ? undefined : contactNumber,
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-2 rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 space-y-6"
        >
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Edit Complaint Details
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Make changes to your complaint before submitting.
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                    aria-label="Cancel editing"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            <div className="space-y-5">
                {/* Description */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Complaint Description
                    </label>
                    <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="w-full min-h-[100px] p-3 rounded-xl border border-input bg-secondary/20 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                        placeholder="Details about the issue..."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-input bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                        >
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Priority
                        </label>
                        <div className="flex gap-2">
                            {PRIORITIES.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPriority(p)}
                                    className={`flex-1 py-2 text-xs font-medium rounded-xl border capitalize transition-colors ${
                                        priority === p
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-input bg-background hover:bg-secondary text-foreground"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ward */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Ward
                        </label>
                        <input
                            type="text"
                            value={ward}
                            onChange={(e) => setWard(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-input bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                        />
                    </div>

                    {/* Mode */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Filing Mode
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAnonymous(true)}
                                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-colors ${
                                    isAnonymous
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-input bg-background hover:bg-secondary text-foreground"
                                }`}
                            >
                                <span className="text-xs font-semibold">Anonymous</span>
                            </button>
                            <button
                                onClick={() => setIsAnonymous(false)}
                                className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-colors ${
                                    !isAnonymous
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-input bg-background hover:bg-secondary text-foreground"
                                }`}
                            >
                                <span className="text-xs font-semibold">With Contact</span>
                            </button>
                        </div>
                    </div>

                    {/* Contact Number */}
                    {!isAnonymous && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Contact Number
                            </label>
                            <input
                                type="tel"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value)}
                                placeholder="Enter mobile number"
                                className="w-full p-2.5 rounded-xl border border-input bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                            />
                        </div>
                    )}
                </div>

                <div className="pt-5 border-t border-border space-y-5">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Attachments & Location
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Image Preview Area */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex justify-between items-center">
                                Photo
                                {!selectedImage && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs text-primary hover:underline flex items-center gap-1 normal-case"
                                    >
                                        <Camera className="w-3.5 h-3.5" />
                                        Add Photo
                                    </button>
                                )}
                            </label>
                            {selectedImage ? (
                                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border h-[72px]">
                                    {imagePreviewUrl && (
                                        <img
                                            src={imagePreviewUrl}
                                            alt="Preview"
                                            className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">
                                            {selectedImage.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {(selectedImage.size / (1024 * 1024)).toFixed(1)} MB
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-1.5 text-muted-foreground hover:bg-background hover:text-foreground rounded-md transition-colors border border-transparent hover:border-border"
                                            title="Change Photo"
                                        >
                                            <Camera className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={onImageRemove}
                                            className="p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors border border-transparent hover:border-destructive/20"
                                            title="Remove Photo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center p-3 h-[72px] bg-secondary/20 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-secondary/40 transition-colors"
                                >
                                    <span className="text-xs text-muted-foreground">No photo attached</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                className="hidden"
                                onChange={onImageSelect}
                            />
                        </div>

                        {/* Location Info */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex justify-between items-center">
                                Location Pin
                            </label>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border h-[72px]">
                                <div className={`p-2 rounded-lg shrink-0 ${locationCoords ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    {locationCoords ? (
                                        <>
                                            <p className="text-xs font-medium text-foreground leading-none mb-1">
                                                Pinned
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-mono truncate leading-none">
                                                {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-destructive font-medium">Required</p>
                                    )}
                                </div>
                                <button
                                    onClick={onRequestLocationPin}
                                    className="px-3 py-1.5 text-[11px] font-semibold bg-background border border-border text-foreground hover:bg-secondary hover:border-primary/50 rounded-lg transition-colors shrink-0"
                                >
                                    {locationCoords ? "Change" : "Add Pin"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button
                    onClick={handleSave}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Save className="w-4 h-4" />
                    Save Changes
                </button>
            </div>
        </motion.div>
    );
}
