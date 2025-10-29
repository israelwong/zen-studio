'use client'
import React from 'react'
import { ZenButton } from '@/components/ui/zen'
import { HeroTextConfig, ButtonConfig } from '@/types/content-blocks'

interface HeroTextProps {
    config: HeroTextConfig
    className?: string
}

export default function HeroText({
    config,
    className = ''
}: HeroTextProps) {
    const {
        title,
        subtitle,
        description,
        buttons = [],
        backgroundVariant = 'gradient',
        backgroundGradient = 'from-zinc-900 via-zinc-800 to-zinc-900',
        backgroundColor = 'bg-zinc-900',
        textColor = 'text-white',
        textAlignment = 'center',
        pattern = 'none',
        patternOpacity = 10
    } = config

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }

    const getBackgroundClasses = () => {
        switch (backgroundVariant) {
            case 'gradient':
                return `bg-gradient-to-br ${backgroundGradient}`
            case 'solid':
                return backgroundColor
            case 'pattern':
                return `${backgroundColor} relative`
            default:
                return backgroundColor
        }
    }

    const getPatternSvg = () => {
        switch (pattern) {
            case 'dots':
                return (
                    <svg className={`absolute inset-0 w-full h-full opacity-${patternOpacity}`} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                <circle cx="20" cy="20" r="2" fill="currentColor" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dots)" className="text-white" />
                    </svg>
                )
            case 'grid':
                return (
                    <svg className={`absolute inset-0 w-full h-full opacity-${patternOpacity}`} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" className="text-white" />
                    </svg>
                )
            case 'waves':
                return (
                    <svg className={`absolute inset-0 w-full h-full opacity-${patternOpacity}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="text-white fill-current"></path>
                    </svg>
                )
            default:
                return null
        }
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
        <div className={`relative min-h-screen flex items-center justify-center overflow-hidden ${getBackgroundClasses()} ${className}`}>
            {/* Pattern Background */}
            {pattern !== 'none' && getPatternSvg()}

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
                        <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold ${textColor} mb-6 leading-tight`}>
                            {title}
                        </h1>
                    )}

                    {/* Description */}
                    {description && (
                        <p className={`text-xl sm:text-2xl md:text-3xl ${textColor} opacity-80 mb-8 leading-relaxed max-w-3xl mx-auto`}>
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
