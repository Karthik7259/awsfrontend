"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
    Send,
    Loader2,
    CheckCircle2,
    ExternalLink,
    RotateCcw,
    MapPin,
    X,
    Mic,
    MicOff,
    Camera,
    ImageIcon,
    AlertTriangle,
    Upload,
    CheckCircle,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { apiUrl } from "@/lib/api";
import {
    DraftComplaintInfo,
    SubmitConfirmationCard,
} from "./submit-confirmation-card";
import { EditComplaintDetails } from "./edit-complaint-details";

const LocationPicker = dynamic(
    () =>
        import("./location-picker").then((mod) => ({
            default: mod.LocationPicker,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        ),
    },
);

interface ChatMessage {
    id: string;
    text: string;
    sender: "agent" | "citizen";
    timestamp: Date;
    imagePreview?: string;
}

interface MessageApiResponse {
    success: boolean;
    reply: string;
    is_complete: boolean;
    ready_for_submit: boolean;
    ticket_id: string | null;
    structured_data: {
        transcript?: string;
        category?: string;
        priority?: string;
        ward?: string;
        is_anonymous?: boolean;
        phone_number?: string | null;
        location_lat?: number | null;
        location_lng?: number | null;
    } | null;
}

interface StartSessionResponse {
    success: boolean;
    session_id: string;
    greeting: string;
}

interface TicketInfo {
    ticketId: string;
    category: string;
    priority: string;
    ward: string;
    isAnonymous: boolean;
}

interface SessionSubmitApiResponse {
    success: boolean;
    ticket_id: string;
    structured_data: {
        category?: string;
        priority?: string;
        ward?: string;
        is_anonymous?: boolean;
    };
}

interface ImageUploadApiResponse {
    success: boolean;
    ticket_id: string;
    image_url: string;
    image_gps_lat: number | null;
    image_gps_lng: number | null;
    message: string;
}

const PRIORITY_STYLES: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
};

const CATEGORY_LABELS: Record<string, string> = {
    roads: "Roads",
    water: "Water Supply",
    electricity: "Electricity",
    sanitation: "Sanitation",
    street_lights: "Street Lights",
    safety: "Safety",
    parks: "Parks",
    other: "Other",
};

const ACCEPTED_IMAGE_TYPES =
    "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_IMAGE_MB = 10;

function getDraftComplaintInfo(
    structuredData: MessageApiResponse["structured_data"],
): DraftComplaintInfo | null {
    if (!structuredData) return null;

    const isAnonymous = structuredData.is_anonymous;
    const hasRequiredDetails =
        !!structuredData.transcript &&
        !!structuredData.category &&
        !!structuredData.priority &&
        !!structuredData.ward &&
        isAnonymous !== undefined &&
        (isAnonymous || !!structuredData.phone_number);

    if (!hasRequiredDetails) return null;

    return {
        transcript: structuredData.transcript!,
        category: structuredData.category!,
        priority: structuredData.priority!,
        ward: structuredData.ward!,
        isAnonymous,
        contactNumber: structuredData.phone_number || undefined,
    };
}

function makeId(): string {
    return Math.random().toString(36).slice(2, 10);
}

/** Persist a filed ticket ID into the browser's localStorage list */
function saveMyComplaint(ticketId: string) {
    try {
        const raw = localStorage.getItem("my_complaints");
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.includes(ticketId)) {
            localStorage.setItem(
                "my_complaints",
                JSON.stringify([ticketId, ...existing]),
            );
        }
    } catch {
        console.error("Failed to save my complaint to localStorage");
    }
}

async function extractExifGps(
    file: File,
): Promise<{ lat: number; lng: number } | null> {
    try {
        const exifr = await import("exifr");
        const gps = await exifr.gps(file);
        if (
            gps &&
            typeof gps.latitude === "number" &&
            typeof gps.longitude === "number"
        ) {
            return { lat: gps.latitude, lng: gps.longitude };
        }
        return null;
    } catch {
        return null;
    }
}

export function ChatInterface() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
    const [draftComplaintInfo, setDraftComplaintInfo] =
        useState<DraftComplaintInfo | null>(null);
    const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
    const [isEditingComplaint, setIsEditingComplaint] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locationConflict, setLocationConflict] = useState<{
        pinned: { lat: number; lng: number };
        photo: { lat: number; lng: number };
    } | null>(null);

    //  Location state ─
    const [showMap, setShowMap] = useState(false);
    const [locationCoords, setLocationCoords] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isGettingGps, setIsGettingGps] = useState(false);

    //  Image state
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [imageExifGps, setImageExifGps] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
        null,
    );

    //  Voice state
    const [isListening, setIsListening] = useState(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsSpeechSupported(
            "SpeechRecognition" in window ||
            "webkitSpeechRecognition" in window,
        );
    }, []);

    //  GPS auto-prompt on mount
    useEffect(() => {
        if (typeof window === "undefined" || !navigator.geolocation) return;

        setIsGettingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocationCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setLocationError(null);
                setIsGettingGps(false);
            },
            () => {
                setLocationError(
                    "We need your location to file the complaint. Please pin it on the map.",
                );
                setIsGettingGps(false);
                setShowMap(true);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
        );
    }, []);

    //  Scroll / focus ─
    const scrollToBottom = useCallback(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, ticketInfo, scrollToBottom]);

    useEffect(() => {
        if (!isLoading && !isComplete) inputRef.current?.focus();
    }, [isLoading, isComplete]);

    useEffect(
        () => () => {
            recognitionRef.current?.stop();
        },
        [],
    );

    //  Session init ─
    useEffect(() => {
        let cancelled = false;

        async function startSession() {
            setIsStarting(true);
            setError(null);

            try {
                const stored = sessionStorage.getItem(
                    "citizen_complaint_session",
                );
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (!cancelled) {
                        setSessionId(parsed.sessionId);
                        setMessages(
                            parsed.messages.map((m: any) => ({
                                ...m,
                                timestamp: new Date(m.timestamp),
                            })),
                        );
                        setIsComplete(parsed.isComplete);
                        if (parsed.ticketInfo) setTicketInfo(parsed.ticketInfo);
                        if (parsed.draftComplaintInfo)
                            setDraftComplaintInfo(parsed.draftComplaintInfo);
                        setShowSubmitConfirmation(
                            !!parsed.showSubmitConfirmation,
                        );
                        if (parsed.locationCoords)
                            setLocationCoords(parsed.locationCoords);
                        setIsStarting(false);
                    }
                    return;
                }
            } catch {
                /* ignore */
            }

            try {
                const res = await fetch(apiUrl("/api/complaints/start"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                });
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data: StartSessionResponse = await res.json();
                if (cancelled) return;
                setSessionId(data.session_id);
                setMessages([
                    {
                        id: makeId(),
                        text: data.greeting,
                        sender: "agent",
                        timestamp: new Date(),
                    },
                ]);
            } catch {
                if (!cancelled)
                    setError(
                        "Could not connect to the server. Please try again.",
                    );
            } finally {
                if (!cancelled) setIsStarting(false);
            }
        }

        startSession();
        return () => {
            cancelled = true;
        };
    }, []);

    //  Persist session
    useEffect(() => {
        if (sessionId) {
            sessionStorage.setItem(
                "citizen_complaint_session",
                JSON.stringify({
                    sessionId,
                    messages,
                    isComplete,
                    ticketInfo,
                    draftComplaintInfo,
                    showSubmitConfirmation,
                    locationCoords,
                }),
            );
        }
    }, [
        sessionId,
        messages,
        isComplete,
        ticketInfo,
        draftComplaintInfo,
        showSubmitConfirmation,
        isEditingComplaint,
        locationCoords,
    ]);

    //  Send message ─
    const sendMessage = async (text: string, clearInput = false) => {
        if (!text || !sessionId || isLoading || isComplete) return;

        if (!locationCoords) {
            setLocationError(
                "Please share your location before sending, it's required to file a complaint.",
            );
            setShowMap(true);
            return;
        }

        if (clearInput) {
            setInputValue("");
        }

        const citizenMsg: ChatMessage = {
            id: makeId(),
            text,
            sender: "citizen",
            timestamp: new Date(),
            imagePreview: imagePreviewUrl ?? undefined,
        };
        setMessages((prev) => [...prev, citizenMsg]);
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(apiUrl("/api/complaints/message"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: text,
                    location_lat: locationCoords.lat,
                    location_lng: locationCoords.lng,
                }),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data: MessageApiResponse = await res.json();

            setMessages((prev) => [
                ...prev,
                {
                    id: makeId(),
                    text: data.reply,
                    sender: "agent",
                    timestamp: new Date(),
                },
            ]);

            const draftInfo = getDraftComplaintInfo(data.structured_data);
            if (data.ready_for_submit && draftInfo) {
                setDraftComplaintInfo(draftInfo);
                setShowSubmitConfirmation(true);
                setIsEditingComplaint(false);
            }

            if (data.is_complete) {
                setIsComplete(true);
                setDraftComplaintInfo(null);
                setShowSubmitConfirmation(false);
                if (data.ticket_id && data.structured_data) {
                    setTicketInfo({
                        ticketId: data.ticket_id,
                        category: data.structured_data.category || "other",
                        priority: data.structured_data.priority || "medium",
                        ward: data.structured_data.ward || "Unspecified",
                        isAnonymous: data.structured_data.is_anonymous ?? true,
                    });
                    // Persist to localStorage so /track can show "My Complaints"
                    saveMyComplaint(data.ticket_id);
                }
            }
        } catch {
            setError("Failed to send message. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text) return;
        setShowSubmitConfirmation(false);
        await sendMessage(text, true);
    };

    const handleSubmitComplaint = async () => {
        setShowSubmitConfirmation(false);
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);
        try {
            const reqBody = {
                session_id: sessionId,
                overrides: draftComplaintInfo
                    ? {
                        transcript: draftComplaintInfo.transcript,
                        category: draftComplaintInfo.category,
                        priority: draftComplaintInfo.priority,
                        ward: draftComplaintInfo.ward,
                        is_anonymous: draftComplaintInfo.isAnonymous,
                        phone_number: draftComplaintInfo.contactNumber,
                        location_lat: locationCoords?.lat,
                        location_lng: locationCoords?.lng,
                    }
                    : undefined,
            };

            const res = await fetch(apiUrl("/api/complaints/submit-session"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqBody),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const data: SessionSubmitApiResponse = await res.json();
            setIsComplete(true);
            setDraftComplaintInfo(null);
            setShowSubmitConfirmation(false);
            setTicketInfo({
                ticketId: data.ticket_id,
                category: data.structured_data.category || "other",
                priority: data.structured_data.priority || "medium",
                ward: data.structured_data.ward || "Unspecified",
                isAnonymous: data.structured_data.is_anonymous ?? true,
            });
            saveMyComplaint(data.ticket_id);
        } catch {
            setError("Failed to submit complaint. Please try again.");
            if (draftComplaintInfo) {
                setShowSubmitConfirmation(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditComplaint = () => {
        setShowSubmitConfirmation(false);
        setIsEditingComplaint(true);
    };

    const handleSaveEdit = (updates: Partial<DraftComplaintInfo>) => {
        if (draftComplaintInfo) {
            setDraftComplaintInfo({ ...draftComplaintInfo, ...updates });
        }
        setIsEditingComplaint(false);
        setShowSubmitConfirmation(true);
    };

    const handleCancelEdit = () => {
        setIsEditingComplaint(false);
        setShowSubmitConfirmation(true);
    };

    //  Image selection
    const handleImageSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                setError(`Image must be under ${MAX_IMAGE_MB} MB.`);
                return;
            }

            setSelectedImage(file);
            setImagePreviewUrl(URL.createObjectURL(file));
            setUploadedImageUrl(null);

            const gps = await extractExifGps(file);
            setImageExifGps(gps);

            if (gps && locationCoords) {
                const dist = Math.sqrt(
                    Math.pow(gps.lat - locationCoords.lat, 2) +
                    Math.pow(gps.lng - locationCoords.lng, 2),
                );
                // ~0.005 degrees ≈ 500m
                if (dist > 0.005) {
                    setLocationConflict({ pinned: locationCoords, photo: gps });
                }
            } else if (gps && !locationCoords) {
                setLocationCoords(gps);
                setLocationError(null);
            }

            e.target.value = "";
        },
        [locationCoords],
    );

    const clearImage = useCallback(() => {
        setSelectedImage(null);
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
        setImageExifGps(null);
        setUploadedImageUrl(null);
    }, [imagePreviewUrl]);

    //  Image upload (fires after ticket is created)
    const handleImageUpload = useCallback(
        async (ticketId: string) => {
            if (!selectedImage || isUploadingImage) return;

            setIsUploadingImage(true);
            try {
                const formData = new FormData();
                formData.append("file", selectedImage);

                const res = await fetch(
                    apiUrl(`/api/complaints/${ticketId}/upload-image`),
                    {
                        method: "POST",
                        body: formData,
                    },
                );
                if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
                const data: ImageUploadApiResponse = await res.json();
                setUploadedImageUrl(data.image_url);
            } catch {
                setError(
                    "Image upload failed. You can retry from the ticket page.",
                );
            } finally {
                setIsUploadingImage(false);
            }
        },
        [selectedImage, isUploadingImage],
    );

    useEffect(() => {
        if (
            !ticketInfo ||
            !selectedImage ||
            uploadedImageUrl ||
            isUploadingImage
        )
            return;

        const upload = async () => {
            setIsUploadingImage(true);
            try {
                const formData = new FormData();
                formData.append("file", selectedImage);
                const res = await fetch(
                    apiUrl(
                        `/api/complaints/${ticketInfo.ticketId}/upload-image`,
                    ),
                    {
                        method: "POST",
                        body: formData,
                    },
                );
                if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
                const data: ImageUploadApiResponse = await res.json();
                setUploadedImageUrl(data.image_url);
            } catch (err) {
                console.error("Image upload error:", err);
                setError("Image upload failed.");
            } finally {
                setIsUploadingImage(false);
            }
        };

        upload();
    }, [ticketInfo, selectedImage]); // eslint-disable-line react-hooks/exhaustive-deps

    //  Voice
    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechRecognitionAPI =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) return;

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        let finalTranscript = "";
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalTranscript += t;
                else interim += t;
            }
            setInputValue(finalTranscript + interim);
        };
        recognition.onerror = (event: any) => {
            setIsListening(false);
            if (event.error === "not-allowed")
                setError(
                    "Microphone access denied. Please allow microphone permissions.",
                );
            else if (event.error !== "aborted")
                setError(
                    "Voice recognition failed. Please try again or type your message.",
                );
        };
        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };
        recognitionRef.current = recognition;
        recognition.start();
    }, [isListening]);

    //  Retry
    const handleRetry = () => {
        sessionStorage.removeItem("citizen_complaint_session");
        setError(null);
        setLocationConflict(null);
        setLocationCoords(null);
        setLocationError(null);
        setMessages([]);
        setSessionId(null);
        setIsComplete(false);
        setTicketInfo(null);
        setDraftComplaintInfo(null);
        setShowSubmitConfirmation(false);
        setIsEditingComplaint(false);
        clearImage();
        setIsStarting(true);
        (async () => {
            try {
                const res = await fetch(apiUrl("/api/complaints/start"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                });
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                const data: StartSessionResponse = await res.json();
                setSessionId(data.session_id);
                setMessages([
                    {
                        id: makeId(),
                        text: data.greeting,
                        sender: "agent",
                        timestamp: new Date(),
                    },
                ]);
            } catch {
                setError("Could not connect to the server. Please try again.");
            } finally {
                setIsStarting(false);
            }
        })();
    };

    const agentMsgCount = messages.filter((m) => m.sender === "agent").length;
    const completionPercentage = isComplete
        ? 100
        : Math.min(Math.round((agentMsgCount / 5) * 100), 95);

    const canSend =
        !!inputValue.trim() &&
        !isComplete &&
        !isLoading &&
        !isStarting &&
        !!locationCoords;

    //  Render
    return (
        <div className="h-screen flex flex-col bg-background pt-[57px] sm:pt-[65px]">
            {/*  Chat area  */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 sm:py-10">
                <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                    {/* Page header */}
                    <div className="space-y-3 pb-2">
                        <h1 className="text-3xl font-bold text-foreground">
                            File a Complaint
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${completionPercentage}%`,
                                    }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {isComplete
                                    ? "✓ Complete"
                                    : `${completionPercentage}%`}
                            </span>
                        </div>
                    </div>

                    {/* Location requirement banner */}
                    {!locationCoords && !isGettingGps && !isStarting && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
                        >
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Location required
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    {locationError ??
                                        "Your location is needed to assign the complaint to the correct ward."}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowMap(true)}
                                className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 flex-shrink-0"
                            >
                                {showMap ? "Hide map" : "Pin on map"}
                            </button>
                        </motion.div>
                    )}

                    {/* Info message (non-blocking) */}
                    {locationConflict && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
                        >
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                Your photo was taken at a different location
                                than your pinned location. Which should we use
                                for the complaint?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLocationConflict(null)}
                                    className="flex-1 px-3 py-2 text-xs font-medium border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-amber-800 dark:text-amber-300"
                                >
                                    My current pin
                                    <br />
                                    <span className="font-normal opacity-70">
                                        {locationConflict.pinned.lat.toFixed(4)}
                                        ,{" "}
                                        {locationConflict.pinned.lng.toFixed(4)}
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        setLocationCoords(
                                            locationConflict.photo,
                                        );
                                        setLocationError(null);
                                        setLocationConflict(null);
                                    }}
                                    className="flex-1 px-3 py-2 text-xs font-medium border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-amber-800 dark:text-amber-300"
                                >
                                    Photo location
                                    <br />
                                    <span className="font-normal opacity-70">
                                        {locationConflict.photo.lat.toFixed(4)},{" "}
                                        {locationConflict.photo.lng.toFixed(4)}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* GPS acquiring indicator */}
                    {isGettingGps && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Detecting your location…
                        </div>
                    )}

                    {/* Starting spinner */}
                    {isStarting && (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    )}

                    {/* Error state */}
                    {error && !isStarting && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-4 py-6 text-center"
                        >
                            <p className="text-destructive text-sm">{error}</p>
                            {!isComplete && (
                                <button
                                    onClick={() => setError(null)}
                                    className="text-xs text-muted-foreground underline"
                                >
                                    Dismiss
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* Messages */}
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className={`flex ${message.sender === "citizen" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${message.sender === "citizen"
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-card border border-border text-foreground rounded-bl-md"
                                        }`}
                                >
                                    {message.imagePreview && (
                                        <img
                                            src={message.imagePreview}
                                            alt="Attached photo"
                                            className="mt-2 rounded-xl max-w-[200px] max-h-[150px] object-cover border border-primary-foreground/20"
                                        />
                                    )}
                                    {message.sender === "agent" ? (
                                        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                                            <ReactMarkdown>
                                                {message.text}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {message.text}
                                        </p>
                                    )}
                                    <p
                                        className={`text-[10px] mt-1.5 ${message.sender === "citizen"
                                            ? "text-primary-foreground/60"
                                            : "text-muted-foreground"
                                            }`}
                                    >
                                        {message.timestamp.toLocaleTimeString(
                                            [],
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            },
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Map picker Modal */}
                    {typeof window !== "undefined" &&
                        createPortal(
                            <AnimatePresence>
                                {showMap && !isComplete && (
                                    <motion.div
                                        key="location-modal"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                            className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden"
                                        >
                                            <LocationPicker
                                                initialLocation={locationCoords}
                                                onLocationSelect={(lat, lng) => {
                                                    setLocationCoords({ lat, lng });
                                                    setLocationError(null);
                                                    setShowMap(false);
                                                }}
                                                onClose={() => setShowMap(false)}
                                            />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>,
                            document.body
                        )}

                    <div ref={chatEndRef} />
                </div>
            </div>

            {/*  Confirmation card  */}
            <AnimatePresence>
                {ticketInfo && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="border-t border-border bg-card px-4 sm:px-6 py-4 sm:py-6"
                    >
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 sm:p-6 space-y-4">
                                {/* Header */}
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                                        Complaint Filed Successfully
                                    </h3>
                                </div>

                                {/* Ticket details */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    <div>
                                        <div className="text-muted-foreground text-[11px] sm:text-xs font-medium uppercase tracking-wide mb-1">
                                            Ticket ID
                                        </div>
                                        <div className="font-bold text-primary text-sm sm:text-base">
                                            {ticketInfo.ticketId}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px] sm:text-xs font-medium uppercase tracking-wide mb-1">
                                            Category
                                        </div>
                                        <div className="font-semibold text-foreground text-sm sm:text-base">
                                            {CATEGORY_LABELS[
                                                ticketInfo.category
                                            ] || ticketInfo.category}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px] sm:text-xs font-medium uppercase tracking-wide mb-1">
                                            Priority
                                        </div>
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${PRIORITY_STYLES[ticketInfo.priority] || PRIORITY_STYLES.medium}`}
                                        >
                                            {ticketInfo.priority
                                                .charAt(0)
                                                .toUpperCase() +
                                                ticketInfo.priority.slice(1)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px] sm:text-xs font-medium uppercase tracking-wide mb-1">
                                            Ward
                                        </div>
                                        <div className="font-semibold text-foreground text-sm sm:text-base">
                                            {ticketInfo.ward}
                                        </div>
                                    </div>
                                </div>

                                {/* Image upload status */}
                                {selectedImage && (
                                    <div className="flex items-center gap-3 p-3 bg-background/60 rounded-lg border border-border">
                                        {imagePreviewUrl && (
                                            <img
                                                src={imagePreviewUrl}
                                                alt="Complaint photo"
                                                className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">
                                                {selectedImage.name}
                                            </p>
                                            {isUploadingImage ? (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                                    <span className="text-xs text-muted-foreground">
                                                        Uploading photo…
                                                    </span>
                                                </div>
                                            ) : uploadedImageUrl ? (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                                    <span className="text-xs text-green-700 dark:text-green-400">
                                                        Photo attached
                                                    </span>
                                                    {imageExifGps && (
                                                        <span className="text-xs text-muted-foreground">
                                                            · GPS geotagged
                                                        </span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                                    <Link
                                        href={`/track?ticketId=${ticketInfo.ticketId}`}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Track Complaint
                                    </Link>
                                    <button
                                        onClick={handleRetry}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        File Another Complaint
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/*  Input area  */}
            <div className="border-t border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
                <div className="max-w-3xl mx-auto space-y-2">
                    {showSubmitConfirmation &&
                        draftComplaintInfo &&
                        !isComplete &&
                        !isEditingComplaint && (
                            <SubmitConfirmationCard
                                draftComplaintInfo={draftComplaintInfo}
                                isLoading={isLoading}
                                isStarting={isStarting}
                                categoryLabels={CATEGORY_LABELS}
                                onEdit={handleEditComplaint}
                                onSubmit={handleSubmitComplaint}
                            />
                        )}

                    {isEditingComplaint &&
                        draftComplaintInfo &&
                        !isComplete && (
                            <EditComplaintDetails
                                draftComplaintInfo={draftComplaintInfo}
                                categoryLabels={CATEGORY_LABELS}
                                locationCoords={locationCoords}
                                selectedImage={selectedImage}
                                imagePreviewUrl={imagePreviewUrl}
                                onSave={handleSaveEdit}
                                onCancel={handleCancelEdit}
                                onRequestLocationPin={() => setShowMap(true)}
                                onImageSelect={handleImageSelect}
                                onImageRemove={clearImage}
                            />
                        )}

                    {/* Image preview strip */}
                    {selectedImage && !isComplete && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-xl border border-border"
                        >
                            {imagePreviewUrl && (
                                <img
                                    src={imagePreviewUrl}
                                    alt="Preview"
                                    className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                    {selectedImage.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {(
                                        selectedImage.size /
                                        (1024 * 1024)
                                    ).toFixed(1)}{" "}
                                    MB
                                    {imageExifGps && (
                                        <span className="ml-1.5 text-green-600 dark:text-green-400 font-medium">
                                            · GPS found in photo ✓
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={clearImage}
                                className="p-1 rounded-md hover:bg-secondary transition-colors flex-shrink-0"
                                aria-label="Remove image"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </motion.div>
                    )}

                    {/* Photo nudge - shown after first message, before image is selected */}
                    {!selectedImage && !isComplete && messages.length >= 1 && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
                        >
                            <Camera className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="flex-1 text-xs text-primary/80">
                                <span className="font-semibold text-primary">
                                    Add a photo
                                </span>{" "}
                                - complaints with photos are resolved{" "}
                                <span className="font-semibold">3× faster</span>
                            </span>
                            <Upload className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors" />
                        </motion.button>
                    )}

                    {/* Location badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {locationCoords ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-500/20">
                                <MapPin className="w-3 h-3" />
                                Location set · {locationCoords.lat.toFixed(
                                    4,
                                )}, {locationCoords.lng.toFixed(4)}
                                <button
                                    onClick={() => setShowMap(true)}
                                    className="ml-1 hover:text-green-900 dark:hover:text-green-200 transition-colors text-[10px] underline underline-offset-1"
                                >
                                    change
                                </button>
                            </span>
                        ) : (
                            !isGettingGps && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium border border-destructive/20">
                                    <AlertTriangle className="w-3 h-3" />
                                    Location required
                                </span>
                            )
                        )}
                    </div>

                    {/* Main input row */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Map toggle */}
                        <button
                            onClick={() => setShowMap(true)}
                            disabled={isComplete || isStarting}
                            title="Pin location on map"
                            className={`p-2.5 sm:p-2 rounded-xl transition-colors flex-shrink-0 ${showMap
                                ? "bg-primary text-primary-foreground"
                                : locationCoords
                                    ? "border border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                                    : "border border-destructive/40 text-destructive hover:bg-destructive/10 animate-pulse"
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            aria-label="Toggle map"
                        >
                            <MapPin className="w-5 h-5" />
                        </button>

                        {/* Camera / image picker */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isComplete || isStarting}
                            title="Attach a photo"
                            className={`p-2.5 sm:p-2 rounded-xl transition-colors flex-shrink-0 ${selectedImage
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            aria-label="Attach photo"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES}
                            className="hidden"
                            onChange={handleImageSelect}
                        />

                        {/* Mic */}
                        {isSpeechSupported && (
                            <button
                                onClick={toggleListening}
                                disabled={isComplete || isStarting || isLoading}
                                className={`relative p-2.5 sm:p-2 rounded-xl transition-colors flex-shrink-0 ${isListening
                                    ? "bg-red-500 text-white"
                                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                                aria-label={
                                    isListening
                                        ? "Stop listening"
                                        : "Start voice input"
                                }
                            >
                                {isListening && (
                                    <span className="absolute inset-0 rounded-xl animate-ping bg-red-400 opacity-30" />
                                )}
                                {isListening ? (
                                    <MicOff className="w-5 h-5 relative z-10" />
                                ) : (
                                    <Mic className="w-5 h-5" />
                                )}
                            </button>
                        )}

                        {/* Text input */}
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={
                                isComplete
                                    ? "Complaint filed - see details above"
                                    : !locationCoords
                                        ? "Pin your location first…"
                                        : "Type your message…"
                            }
                            value={inputValue}
                            disabled={isComplete || isLoading || isStarting}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            className="flex-1 px-4 py-2.5 sm:py-2 border border-border rounded-xl bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />

                        {/* Send */}
                        <button
                            onClick={handleSend}
                            disabled={!canSend}
                            className="p-2.5 sm:p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            aria-label="Send message"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
