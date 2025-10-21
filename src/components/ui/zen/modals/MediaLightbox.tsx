"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MediaLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    items: Array<{
        id: string;
        url: string;
        fileName: string;
        type: 'foto' | 'video';
    }>;
    initialIndex?: number;
}

export function MediaLightbox({
    isOpen,
    onClose,
    items,
    initialIndex = 0,
}: MediaLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchTrackingRef = useRef(false);

    useEffect(() => {
        // Ensure index is within valid range
        const validIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
        setCurrentIndex(validIndex);
    }, [initialIndex, items.length, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, items.length, onClose]);

    if (!isOpen || items.length === 0) return null;

    const currentItem = items[currentIndex];

    // Double check currentItem exists
    if (!currentItem) return null;

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 1) {
            touchTrackingRef.current = true;
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchTrackingRef.current || e.changedTouches.length === 0) return;

        touchTrackingRef.current = false;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX.current;
        const deltaY = Math.abs(touchEndY - touchStartY.current);

        // Swipe threshold: 50px horizontal movement, primarily horizontal (not vertical)
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
            e.preventDefault();
            if (deltaX > 0) {
                // Swipe right = previous
                handlePrevious();
            } else {
                // Swipe left = next
                handleNext();
            }
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only close if clicking directly on backdrop, not on content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center overflow-hidden"
            onClick={handleBackdropClick}
            style={{ touchAction: 'none' }}
        >
            {/* Close Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 transition-colors z-[10000]"
                aria-label="Close"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* Main Content - Swipe enabled */}
            <div
                className="w-full h-full flex items-center justify-center relative select-none"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y pinch-zoom' }}
            >
                {/* Media Display */}
                {currentItem.type === 'foto' ? (
                    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                        <Image
                            src={currentItem.url}
                            alt={currentItem.fileName}
                            layout="fill"
                            objectFit="contain"
                            priority
                            draggable={false}
                        />
                    </div>
                ) : (
                    <div className="pointer-events-auto">
                        <video
                            src={currentItem.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {/* Navigation Buttons */}
                {items.length > 1 && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                            className="absolute left-4 p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 transition-colors z-10 pointer-events-auto"
                            aria-label="Previous"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            className="absolute right-4 p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 transition-colors z-10 pointer-events-auto"
                            aria-label="Next"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Info Bar */}
            <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-10 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div>
                        <p className="text-white font-medium">{currentItem.fileName}</p>
                        <p className="text-zinc-400 text-sm">
                            {currentIndex + 1} / {items.length}
                        </p>
                    </div>
                    {items.length > 1 && (
                        <div className="flex gap-2">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(idx);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all pointer-events-auto ${idx === currentIndex
                                            ? "bg-emerald-500 w-6"
                                            : "bg-zinc-600 hover:bg-zinc-500"
                                        }`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
