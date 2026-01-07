'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { HeroPortfolioConfig } from '@/types/content-blocks';
import { cn } from '@/lib/utils';

interface HeroPortfolioComponentProps {
    config: HeroPortfolioConfig;
    media: Array<{ file_url: string; file_type: string; filename: string; thumbnail_url?: string }>;
    className?: string;
    isEditable?: boolean;
    eventTypeName?: string; // Nombre del tipo de evento
    useNaturalSize?: boolean; // Usar tamaño natural del multimedia sin aspect ratio
}

export default function HeroPortfolioComponent({
    config,
    media,
    className = '',
    isEditable = false,
    eventTypeName,
    useNaturalSize = false
}: HeroPortfolioComponentProps) {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const [parallaxOffset, setParallaxOffset] = useState(0);

    const {
        title,
        eventTypeName: configEventTypeName,
        description,
        overlay = true,
        overlayOpacity = 50,
        textAlignment = 'center',
        verticalAlignment = 'center',
        backgroundType = 'image',
        containerStyle = 'fullscreen',
        borderRadius = 'none',
        aspectRatio,
        gradientOverlay = false,
        gradientPosition = 'top',
        parallax = false,
    } = config;

    // Usar eventTypeName de props si está disponible, sino del config
    const displayEventTypeName = eventTypeName || configEventTypeName;

    const backgroundMedia = media[0];
    const isVideo = backgroundType === 'video' || backgroundMedia?.file_type === 'video';
    const videoSrc = isVideo ? backgroundMedia?.file_url : null;
    const imageSrc = !isVideo ? backgroundMedia?.file_url : null;
    const videoPoster = backgroundMedia?.thumbnail_url || backgroundMedia?.file_url;

    // Manejo de video
    useEffect(() => {
        if (!isVideo || !videoSrc || isEditable) return;

        const video = videoRef.current;
        if (!video) return;

        // Asegurar que el video siempre esté en loop
        video.loop = true;

        const playVideo = async () => {
            try {
                await video.play();
            } catch (error) {
                console.log('Autoplay failed, attempting to play:', error);
                // Intentar reproducir automáticamente sin mostrar botón
                video.play().catch(() => {
                    // Silenciar errores de autoplay
                });
            }
        };

        // Con loop activado, el video siempre debería estar reproduciéndose
        const handlePause = () => {
            // Intentar reproducir automáticamente si se pausa
            video.play().catch(() => {
                // Silenciar errores
            });
        };
        // Con loop activado, esto no debería ocurrir, pero por si acaso
        const handleEnded = () => {
            // Reiniciar reproducción automáticamente
            video.play().catch(() => {
                // Silenciar errores
            });
        };

        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);

        if (video.readyState >= 3) {
            playVideo();
        } else {
            video.addEventListener('canplay', playVideo, { once: true });
        }

        return () => {
            video.removeEventListener('canplay', playVideo);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
        };
    }, [videoSrc, isVideo, isEditable]);


    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    };

    const verticalAlignmentClasses = {
        top: 'items-start',
        center: 'items-center',
        bottom: 'items-end'
    };

    const horizontalJustifyClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
    };

    const containerStyleClasses = {
        fullscreen: '',
        wrapped: 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-4'
    };

    const borderRadiusClasses = {
        none: '',
        md: 'rounded-md',
        lg: 'rounded-lg'
    };

    const aspectRatioClasses = {
        square: 'aspect-square',
        vertical: 'aspect-[3/4]'
    };

    const aspectRatioClass = aspectRatio ? aspectRatioClasses[aspectRatio] : '';

    const containerClassName = containerStyle === 'wrapped'
        ? `${containerStyleClasses.wrapped} ${borderRadiusClasses[borderRadius]}`
        : '';

    const contentPaddingClass = 'p-3';

    // Efecto parallax
    useEffect(() => {
        if (!parallax || isEditable) return;

        const findScrollContainer = (element: HTMLElement | null): HTMLElement | Window => {
            if (!element) return window;

            let parent = element.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                const overflowY = style.overflowY || style.overflow;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                    if (parent.scrollHeight > parent.clientHeight) {
                        return parent;
                    }
                }
                parent = parent.parentElement;
            }
            return window;
        };

        const scrollContainer = heroRef.current ? findScrollContainer(heroRef.current) : window;
        let rafId: number | null = null;
        let ticking = false;

        const calculateParallax = () => {
            if (!heroRef.current) return;

            const heroRect = heroRef.current.getBoundingClientRect();
            const heroTopInViewport = heroRect.top;
            const heroVisibleHeight = Math.max(0, Math.min(heroRect.height, window.innerHeight - heroTopInViewport));
            const scrollProgress = 1 - (heroVisibleHeight / heroRect.height);
            const parallaxFactor = 0.5;
            const heroHeight = heroRect.height;
            const centeringOffset = parallax ? heroHeight * 0.075 : 0;
            const maxOffset = 100;
            const scrollOffset = -scrollProgress * maxOffset * parallaxFactor;
            const offset = centeringOffset + scrollOffset;

            setParallaxOffset(offset);
            ticking = false;
        };

        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            rafId = requestAnimationFrame(calculateParallax);
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        handleScroll();

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [parallax, isEditable]);

    // Si useNaturalSize es true, no aplicar aspect ratio ni altura mínima
    const containerHeightClass = useNaturalSize 
        ? '' 
        : (aspectRatio ? aspectRatioClass : "min-h-[50vh] sm:min-h-[60vh]");

    return (
        <div
            ref={heroRef}
            className={cn(
                "relative",
                useNaturalSize ? "w-full" : "flex",
                !useNaturalSize && verticalAlignmentClasses[verticalAlignment],
                "justify-center overflow-hidden bg-zinc-900",
                containerHeightClass,
                containerClassName,
                className
            )}
        >
            {/* Fallback Background */}
            <div className={cn(
                "absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-900 -z-20",
                containerStyle === 'wrapped' && borderRadiusClasses[borderRadius]
            )} />

            {/* Background: Image */}
            {imageSrc && !isVideo && (
                <div className={useNaturalSize ? "relative w-full" : "absolute inset-0 overflow-hidden"} style={{ zIndex: 1 }}>
                    {useNaturalSize ? (
                        <div className="relative w-full">
                            <Image
                                src={imageSrc}
                                alt={backgroundMedia?.filename || 'Hero image'}
                                width={1920}
                                height={1080}
                                priority
                                className="w-full h-auto object-contain"
                                sizes="100vw"
                                style={{ transition: 'none' }}
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                position: 'absolute',
                                top: parallax ? '-7.5%' : 0,
                                left: parallax ? '-7.5%' : 0,
                                width: parallax ? '115%' : '100%',
                                height: parallax ? '115%' : '100%',
                                transform: parallax ? `translate3d(0, ${parallaxOffset}px, 0)` : undefined,
                                willChange: parallax ? 'transform' : undefined,
                                transition: 'none'
                            }}
                        >
                            <Image
                                src={imageSrc}
                                alt={backgroundMedia?.filename || 'Hero image'}
                                fill
                                priority
                                className="object-cover"
                                sizes="100vw"
                                style={{ transition: 'none' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Background: Video */}
            {isVideo && videoSrc && (
                <>
                    <video
                        ref={videoRef}
                        className={cn(
                            useNaturalSize ? "relative w-full h-auto" : "absolute inset-0 w-full h-full object-cover",
                            "-z-10 transition-opacity duration-500",
                            isVideoLoaded ? 'opacity-100' : 'opacity-0'
                        )}
                        autoPlay={config.autoPlay !== false}
                        muted={config.muted !== false}
                        loop={true}
                        controls={false}
                        poster={videoPoster}
                        playsInline
                        webkit-playsinline="true"
                        preload="auto"
                        onLoadedData={() => {
                            setIsVideoLoaded(true);
                            setVideoError(false);
                        }}
                        onCanPlay={() => {
                            setIsVideoLoaded(true);
                            setVideoError(false);
                        }}
                        onError={() => {
                            setVideoError(true);
                            setIsVideoLoaded(false);
                        }}
                        style={useNaturalSize ? {
                            zIndex: 1,
                        } : {
                            position: 'absolute',
                            top: parallax ? '-7.5%' : 0,
                            left: parallax ? '-7.5%' : 0,
                            width: parallax ? '115%' : '100%',
                            height: parallax ? '115%' : '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                            transform: parallax ? `translate3d(0, ${parallaxOffset}px, 0)` : undefined,
                            willChange: parallax ? 'transform' : undefined,
                            transition: parallax ? 'none' : undefined
                        }}
                    >
                        <source src={videoSrc} type="video/mp4" />
                        Tu navegador no soporta el elemento video.
                    </video>

                    {!isVideoLoaded && !videoError && (
                        <div className="absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <div className="text-center">
                                <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-zinc-400 text-sm">Cargando video...</p>
                            </div>
                        </div>
                    )}

                    {/* Botón de play oculto - el video siempre debe estar en reproducción con loop */}

                    {videoError && (
                        <div className="absolute inset-0 bg-linear-to-br from-emerald-900/20 to-blue-900/20 flex items-center justify-center" style={{ zIndex: 3 }}>
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
            )}

            {/* Overlay */}
            {overlay && (
                <div
                    className={`absolute inset-0 bg-black/${overlayOpacity}`}
                    style={{ zIndex: 2 }}
                />
            )}

            {/* Degradado de contraste */}
            {gradientOverlay && (
                <div
                    className="absolute inset-0"
                    style={{
                        zIndex: 3,
                        background: (() => {
                            const position = gradientPosition || 'top';
                            switch (position) {
                                case 'top':
                                    return 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                case 'bottom':
                                    return 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                case 'left':
                                    return 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                case 'right':
                                    return 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                default:
                                    return 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)';
                            }
                        })()
                    }}
                />
            )}

            {/* Content - Solo mostrar si hay título o descripción */}
            {(title || description) && (
                <div 
                    className={cn(
                        useNaturalSize ? "absolute inset-0" : "relative",
                        "z-10 w-full flex",
                        verticalAlignmentClasses[verticalAlignment],
                        horizontalJustifyClasses[textAlignment]
                    )}
                >
                    <div className={cn(
                        "max-w-3xl w-full",
                        contentPaddingClass,
                        textAlignmentClasses[textAlignment]
                    )}>
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
                    </div>
                </div>
            )}
        </div>
    );
}
