import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { CaptionWithLinks } from '@/app/[slug]/studio/builder/content/posts/components/CaptionWithLinks';
import { ImageCarousel } from '@/components/shared/media';
import { MediaItem } from '@/types/content-blocks';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";

// Función para formatear tiempo relativo corto (1h, 2d)
function formatTimeAgo(date: Date | null): string {
    if (!date) return "";

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "1h"; // Menos de 1 minuto = 1h
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return "1h"; // Menos de 1 hora = 1h
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
}

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PostDetail {
    id: string;
    title?: string | null;
    caption: string | null;
    tags?: string[];
    media: PostMedia[];
    is_published: boolean;
    published_at: Date | null;
    view_count: number;
}

interface PostDetailSectionProps {
    post: PostDetail;
}

/**
 * PostDetailSection - Vista detallada de un post individual
 * Usado en el editor para preview del post que se está editando
 * 
 * Reglas de visualización:
 * - Una sola foto: fullwidth
 * - Múltiples fotos/videos: carousel usando ImageCarousel
 */
export function PostDetailSection({ post }: PostDetailSectionProps) {
    const hasMultipleMedia = post.media.length > 1;
    const firstMedia = post.media[0];
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const timeAgo = useMemo(() => formatTimeAgo(post.published_at), [post.published_at]);

    // Convertir PostMedia a MediaItem para ImageCarousel
    const mediaItems: MediaItem[] = post.media.map(item => ({
        id: item.id,
        file_url: item.file_url,
        file_type: item.file_type,
        filename: item.filename,
        thumbnail_url: item.thumbnail_url,
        storage_path: item.file_url,
        display_order: item.display_order,
    }));

    // Preparar slide para lightbox de video único
    const videoLightboxSlide = firstMedia && firstMedia.file_type === 'video' ? {
        type: 'video' as const,
        sources: [{
            src: firstMedia.file_url,
            type: 'video/mp4'
        }],
        poster: firstMedia.thumbnail_url || firstMedia.file_url,
        // No especificar width/height para que use tamaño natural del video
        autoPlay: true,
        muted: false,
        controls: true,
        playsInline: true
    } : null;

    return (
        <div className="mt-10 space-y-2">
            {/* Título y tiempo de publicación */}
            {(post.title || timeAgo) && (
                <div className="flex items-center gap-2 mb-2">
                    {post.title && (
                        <span className="text-white font-light leading-relaxed whitespace-pre-wrap break-words text-base">
                            {post.title}
                        </span>
                    )}
                    {timeAgo && (
                        <span className="text-zinc-500 text-sm">
                            {timeAgo}
                        </span>
                    )}
                </div>
            )}

            {/* Descripción */}
            {post.caption && (
                <div className="w-full mb-2">
                    <CaptionWithLinks caption={post.caption} className="text-zinc-400" />
                </div>
            )}

            {/* Media */}
            {firstMedia && (
                <div className="relative">
                    {/* Una sola foto/video: fullwidth */}
                    {!hasMultipleMedia ? (
                        <div className="relative w-full">
                            {firstMedia.file_type === 'image' ? (
                                <div
                                    onClick={() => setLightboxOpen(true)}
                                    className="cursor-pointer"
                                >
                                    <Image
                                        src={firstMedia.file_url}
                                        alt="Post"
                                        width={800}
                                        height={800}
                                        className="w-full h-auto object-contain rounded-md"
                                        unoptimized
                                        style={{ maxHeight: 'none' }}
                                    />
                                </div>
                            ) : (
                                <video
                                    src={firstMedia.file_url}
                                    controls
                                    className="w-full h-auto rounded-md cursor-pointer"
                                    autoPlay
                                    muted
                                    playsInline
                                    loop
                                    poster={firstMedia.thumbnail_url}
                                    onClick={() => setLightboxOpen(true)}
                                />
                            )}
                        </div>
                    ) : (
                        /* Múltiples elementos: usar ImageCarousel */
                        <ImageCarousel
                            media={mediaItems}
                            showArrows={false}
                            showDots={false}
                            autoplay={0}
                            className=""
                        />
                    )}
                </div>
            )}

            {/* Lightbox para imagen única */}
            {!hasMultipleMedia && firstMedia && firstMedia.file_type === 'image' && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={[{
                        src: firstMedia.file_url,
                        alt: firstMedia.filename || 'Post',
                        width: 1920,
                        height: 1080
                    }]}
                />
            )}

            {/* Lightbox para video único */}
            {!hasMultipleMedia && videoLightboxSlide && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={[videoLightboxSlide]}
                    plugins={[Video]}
                    video={{
                        controls: true,
                        playsInline: true,
                        autoPlay: true,
                        muted: false,
                        loop: false
                    }}
                    styles={{
                        container: {
                            backgroundColor: "rgba(0, 0, 0, .98)",
                            padding: 0
                        },
                        slide: {
                            padding: 0,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100vw',
                            height: '100vh'
                        }
                    }}
                    render={{
                        slide: ({ slide }) => {
                            if (slide.type === 'video') {
                                return (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        height: '100%'
                                    }}>
                                        <video
                                            src={slide.sources?.[0]?.src}
                                            poster={slide.poster}
                                            autoPlay={slide.autoPlay}
                                            muted={slide.muted}
                                            controls={slide.controls}
                                            playsInline={slide.playsInline}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100vh',
                                                width: 'auto',
                                                height: 'auto',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                );
                            }
                            return undefined;
                        }
                    }}
                />
            )}

            {/* Palabras clave */}
            {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {post.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="text-zinc-600 text-sm"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
