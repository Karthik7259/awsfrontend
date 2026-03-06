"use client";

import { motion } from "framer-motion";
import { MapPinOff, Info } from "lucide-react";

export function NoLocationProvided() {
    return (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Header - matches LocationDisplay style */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
                <MapPinOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                    Complaint Location
                </span>
            </div>

            {/* Body */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4"
            >
                {/* Animated icon ring */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                        delay: 0.1,
                    }}
                    className="w-16 h-16 rounded-full bg-muted/50 border-2 border-dashed border-border flex items-center justify-center"
                >
                    <MapPinOff className="w-7 h-7 text-muted-foreground" />
                </motion.div>

                <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-foreground">
                        No Location Data
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                        Location was not provided when this complaint was filed.
                    </p>
                </div>

                {/* Info chip */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5" />
                    <span>Location helps departments respond faster</span>
                </div>
            </motion.div>
        </div>
    );
}
