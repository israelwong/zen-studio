'use client'
import React from 'react'
import Image from 'next/image'
import { ZenButton } from '@/components/ui/zen'
import { HeroImageConfig, ButtonConfig } from '@/types/content-blocks'

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

    const imageSrc = media[0]?.file_url || '/placeholder-hero.jpg'
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

    const getButtonVariant = (variant?: string) => {
        switch (variant) {
            case 'primary': return 'primary'
            case 'secondary': return 'secondary'
            case 'outline': return 'outline'
            case 'ghost': return 'ghost'
            case 'gradient': return 'gradient'
            default: return 'primary'
        }
    }

    const getButtonSize = (size?: string) => {
        switch (size) {
            case 'sm': return 'sm'
            case 'md': return 'md'
            case 'lg': return 'lg'
            case 'xl': return 'xl'
            default: return 'md'
        }
    }

    return (
        <div className={`relative min-h-screen flex items-center justify-center overflow-hidden ${className}`}>
            {/* Image Background */}
            <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                className={`object-cover ${imagePositionClasses[imagePosition]} -z-10`}
                sizes="100vw"
            />

            {/* Overlay */}
            {overlay && (
                <div
                    className={`absolute inset-0 bg-black/${overlayOpacity} -z-5`}
                />
            )}

            {/* Content */}
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className={textAlignmentClasses[textAlignment]}>
                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-lg sm:text-xl md:text-2xl text-pink-400 font-medium mb-4">
                            {subtitle}
                        </p>
                    )}

                    {/* Title */}
                    {title && (
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            {title}
                        </h1>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-xl sm:text-2xl md:text-3xl text-zinc-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                            {description}
                        </p>
                    )}

                    {/* Buttons */}
                    {buttons.length > 0 && (
                        <div className={`flex flex-col sm:flex-row gap-4 ${textAlignment === 'center' ? 'justify-center' : textAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                            {buttons.map((button, index) => (
                                <ZenButton
                                    key={index}
                                    variant={getButtonVariant(button.variant)}
                                    size={getButtonSize(button.size)}
                                    href={button.href}
                                    target={button.target}
                                    onClick={button.onClick}
                                    className={button.className}
                                >
                                    {button.text}
                                </ZenButton>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
