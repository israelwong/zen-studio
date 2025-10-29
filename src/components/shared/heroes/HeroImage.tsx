'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ZenButton } from '@/components/ui/zen'
import { HeroImageConfig } from '@/types/content-blocks'

interface HeroImageProps {
    config: HeroImageConfig
    media: Array<{ file_url: string; file_type: string; filename: string }>
    className?: string
}

export default function HeroImage({
    config,
    media,
    className = ''
}: HeroImageProps) {
    const {
        title,
        subtitle,
        description,
        buttons = [],
        overlay = true,
        overlayOpacity = 50,
        textAlignment = 'center',
        imagePosition = 'center'
    } = config

    const imageSrc = media[0]?.file_url
    const imageAlt = media[0]?.filename || 'Hero image'

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }

    const imagePositionClasses = {
        center: 'object-center',
        top: 'object-top',
        bottom: 'object-bottom'
    }

    const getButtonVariant = (variant?: string): 'primary' | 'secondary' | 'outline' | 'ghost' => {
        switch (variant) {
            case 'primary': return 'primary'
            case 'secondary': return 'secondary'
            case 'outline': return 'outline'
            case 'ghost': return 'ghost'
            case 'gradient': return 'primary' // Fallback to primary for gradient
            default: return 'primary'
        }
    }

    const getButtonSize = (size?: string): 'sm' | 'md' | 'lg' => {
        switch (size) {
            case 'sm': return 'sm'
            case 'md': return 'md'
            case 'lg': return 'lg'
            case 'xl': return 'lg' // Fallback to lg for xl
            default: return 'md'
        }
    }

    return (
        <div className={`relative min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center overflow-hidden bg-zinc-900 ${className}`}>
            {/* Fallback Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 -z-20" />

            {/* Image Background */}
            {imageSrc && (
                <Image
                    src={imageSrc}
                    alt={imageAlt}
                    fill
                    priority
                    className={`object-cover ${imagePositionClasses[imagePosition]}`}
                    sizes="100vw"
                    style={{ zIndex: 1 }}
                />
            )}

            {/* Overlay */}
            {overlay && (
                <div
                    className={`absolute inset-0 bg-black/${overlayOpacity}`}
                    style={{ zIndex: 2 }}
                />
            )}

            {/* Content */}
            <div className="relative z-10 px-4 sm:px-6 max-w-3xl mx-auto w-full">
                <div className={textAlignmentClasses[textAlignment]}>
                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-zinc-400 font-medium mb-2 sm:mb-3 uppercase tracking-wide">
                            {subtitle}
                        </p>
                    )}

                    {/* Title */}
                    {title && (
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                            {title}
                        </h1>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-sm sm:text-lg text-zinc-300 mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto">
                            {description}
                        </p>
                    )}

                    {/* Buttons */}
                    {buttons.length > 0 && (
                        <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${textAlignment === 'center' ? 'justify-center' : textAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                            {buttons.map((button, index) => (
                                button.href ? (
                                    <ZenButton
                                        key={index}
                                        asChild
                                        variant={getButtonVariant(button.variant)}
                                        size={getButtonSize(button.size)}
                                        className={`text-sm sm:text-base ${button.className}`}
                                    >
                                        <Link href={button.href} target={button.target} onClick={button.onClick}>
                                            {button.text}
                                        </Link>
                                    </ZenButton>
                                ) : (
                                    <ZenButton
                                        key={index}
                                        variant={getButtonVariant(button.variant)}
                                        size={getButtonSize(button.size)}
                                        className={`text-sm sm:text-base ${button.className}`}
                                    >
                                        {button.text}
                                    </ZenButton>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
