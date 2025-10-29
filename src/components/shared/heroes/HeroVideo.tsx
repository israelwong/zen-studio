'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ZenButton } from '@/components/ui/zen'
import { HeroVideoConfig } from '@/types/content-blocks'

interface HeroVideoProps {
    config: HeroVideoConfig
    media: Array<{ file_url: string; file_type: string; filename: string }>
    className?: string
}

export default function HeroVideo({
    config,
    media,
    className = ''
}: HeroVideoProps) {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false)
    const [videoError, setVideoError] = useState(false)
    const [showPlayButton, setShowPlayButton] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    const {
        title,
        subtitle,
        description,
        buttons = [],
        overlay = true,
        overlayOpacity = 50,
        textAlignment = 'center',
        autoPlay = true,
        muted = true,
        loop = true,
        poster
    } = config

    const videoSrc = media[0]?.file_url || '/placeholder-video.mp4'
    const videoPoster = poster || media[0]?.file_url || '/placeholder-poster.jpg'

    const handleVideoLoad = () => {
        console.log('Video loaded successfully:', videoSrc)
        setIsVideoLoaded(true)
        setVideoError(false)
    }

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        console.error('Video error:', e, 'Video src:', videoSrc)
        setVideoError(true)
        setIsVideoLoaded(false)
    }

    const handleVideoCanPlay = () => {
        console.log('Video can play:', videoSrc)
        setIsVideoLoaded(true)
        setVideoError(false)
    }

    // Efecto para manejar la reproducción del video
    useEffect(() => {
        if (videoRef.current && videoSrc && videoSrc !== '/placeholder-video.mp4') {
            const video = videoRef.current

            const playVideo = async () => {
                try {
                    await video.play()
                    console.log('Video started playing')
                    setShowPlayButton(false)
                } catch (error) {
                    console.log('Autoplay failed, user interaction required:', error)
                    setShowPlayButton(true)
                }
            }

            // Event listeners para el estado del video
            const handlePlay = () => setShowPlayButton(false)
            const handlePause = () => setShowPlayButton(true)
            const handleEnded = () => setShowPlayButton(true)

            video.addEventListener('play', handlePlay)
            video.addEventListener('pause', handlePause)
            video.addEventListener('ended', handleEnded)

            // Intentar reproducir cuando el video esté listo
            if (video.readyState >= 3) { // HAVE_FUTURE_DATA
                playVideo()
            } else {
                video.addEventListener('canplay', playVideo, { once: true })
            }

            return () => {
                video.removeEventListener('canplay', playVideo)
                video.removeEventListener('play', handlePlay)
                video.removeEventListener('pause', handlePause)
                video.removeEventListener('ended', handleEnded)
            }
        }
    }, [videoSrc])

    // Función para reproducir manualmente
    const handlePlayClick = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play()
                setShowPlayButton(false)
            } catch (error) {
                console.error('Error playing video:', error)
            }
        }
    }

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
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

            {/* Video Background */}
            {videoSrc && videoSrc !== '/placeholder-video.mp4' ? (
                <>
                    <video
                        ref={videoRef}
                        className={`absolute inset-0 w-full h-full object-cover -z-10 transition-opacity duration-500 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        autoPlay={autoPlay}
                        muted={muted}
                        loop={loop}
                        controls={false}
                        poster={videoPoster}
                        playsInline
                        webkit-playsinline="true"
                        preload="auto"
                        onLoadedData={handleVideoLoad}
                        onCanPlay={handleVideoCanPlay}
                        onError={handleVideoError}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1
                        }}
                    >
                        <source src={videoSrc} type="video/mp4" />
                        Tu navegador no soporta el elemento video.
                    </video>

                    {/* Loading state */}
                    {!isVideoLoaded && !videoError && (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <div className="text-center">
                                <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-zinc-400 text-sm">Cargando video...</p>
                            </div>
                        </div>
                    )}

                    {/* Play button for mobile */}
                    {showPlayButton && !videoError && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <button
                                onClick={handlePlayClick}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 transition-all duration-200 transform hover:scale-110"
                            >
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Error state */}
                    {videoError && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-blue-900/20 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-zinc-700 rounded-lg flex items-center justify-center">
                                    <svg className="w-8 h-8 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                                <p className="text-zinc-400 text-sm">Error al cargar el video</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Fallback cuando no hay video */
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-blue-900/20 -z-10 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-700 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <p className="text-zinc-400 text-sm">Agrega un video de fondo</p>
                    </div>
                </div>
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
