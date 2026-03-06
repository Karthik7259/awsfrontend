"use client";

import { motion } from "framer-motion";

export interface DraftComplaintInfo {
    transcript: string;
    category: string;
    priority: string;
    ward: string;
    isAnonymous: boolean;
    contactNumber?: string;
}

interface SubmitConfirmationCardProps {
    draftComplaintInfo: DraftComplaintInfo;
    isLoading: boolean;
    isStarting: boolean;
    categoryLabels: Record<string, string>;
    onEdit: () => void;
    onSubmit: () => void;
}

export function SubmitConfirmationCard({
    draftComplaintInfo,
    isLoading,
    isStarting,
    categoryLabels,
    onEdit,
    onSubmit,
}: SubmitConfirmationCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
        >
            <div className="bg-primary/5 border-b border-border p-5">
                <h3 className="text-lg font-semibold text-foreground">
                    Review Complaint Details
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                    Almost there! Please verify the details below before
                    submitting.
                </p>
            </div>

            <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-secondary/30 rounded-xl p-3 border border-border/50">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Category
                        </p>
                        <p className="text-sm font-medium text-foreground mt-1 truncate">
                            {categoryLabels[draftComplaintInfo.category] ||
                                draftComplaintInfo.category}
                        </p>
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-3 border border-border/50">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Priority
                        </p>
                        <p className="text-sm font-medium text-foreground mt-1 capitalize truncate">
                            {draftComplaintInfo.priority}
                        </p>
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-3 border border-border/50">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Ward
                        </p>
                        <p className="text-sm font-medium text-foreground mt-1 truncate">
                            {draftComplaintInfo.ward}
                        </p>
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-3 border border-border/50">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Mode
                        </p>
                        <p className="text-sm font-medium text-foreground mt-1 truncate">
                            {draftComplaintInfo.isAnonymous
                                ? "Anonymous"
                                : draftComplaintInfo.contactNumber || "With Contact"}
                        </p>
                    </div>
                </div>

                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        COMPLAINT SUMMARY
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {draftComplaintInfo.transcript}
                    </p>
                </div>
            </div>

            <div className="bg-secondary/10 border-t border-border p-4 flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onEdit}
                    disabled={isLoading || isStarting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 border border-input bg-background hover:bg-secondary text-foreground text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Edit Details
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isLoading || isStarting}
                    className="flex-1 inline-flex items-center justify-center px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:-translate-y-0 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Submitting..." : "Submit Complaint"}
                </button>
            </div>
        </motion.div>
    );
}
