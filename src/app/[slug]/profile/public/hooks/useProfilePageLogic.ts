'use client';

import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PublicProfileData } from '@/types/public-profile';
import { trackContentEvent } from '@/lib/actions/studio/analytics/analytics.actions';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    is_permanent?: boolean;
    has_date_range?: boolean;
    start_date?: string | null;
    valid_until?: string | null;
    event_type_name?: string | null;
    banner_destination?: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
}

interface UseProfilePageLogicProps {
    profileData: PublicProfileData;
    studioSlug: string;
    offers?: PublicOffer[];
}

export function useProfilePageLogic({ profileData, studioSlug, offers = [] }: UseProfilePageLogicProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const { studio, paquetes, posts, portfolios } = profileData;
    const isOwner = user?.id === studio.owner_id;

    // Estado
    const initialTab = searchParams.get('section') || 'inicio';
    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedPortfolioSlug, setSelectedPortfolioSlug] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPostEditorOpen, setIsPostEditorOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [isScrolled, setIsScrolled] = useState(false);
    
    // ⚠️ NAVEGACIÓN: Flag para prevenir race conditions durante navegación
    const [isNavigating, setIsNavigating] = useState<string | null>(null);
    const isNavigatingRef = useRef(false);

    // FAQs
    const faq = (studio as unknown as { faq?: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }> }).faq || [];
    const hasActiveFAQs = faq.some(f => f.is_active);

    // Tracking
    useEffect(() => {
        if (isOwner || !studio?.id) return;

        const sessionKey = `profile_view_${studio.id}`;
        const alreadyTracked = sessionStorage.getItem(sessionKey);
        if (alreadyTracked) return;

        let sessionId = localStorage.getItem(`profile_session_${studio.id}`);
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(`profile_session_${studio.id}`, sessionId);
        }

        const referrer = typeof window !== 'undefined' ? document.referrer : undefined;
        const trafficSource = referrer?.includes(window.location.origin) ? 'profile' : 'external';

        trackContentEvent({
            studioId: studio.id,
            contentType: 'PACKAGE',
            contentId: studio.id,
            eventType: 'PAGE_VIEW',
            sessionId,
            metadata: {
                profile_view: true,
                traffic_source: trafficSource,
                referrer: referrer || undefined,
            },
        }).catch(() => {});

        sessionStorage.setItem(sessionKey, 'true');
    }, [studio?.id, isOwner]);

    // Scroll detection
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sync URL params (solo si NO estamos navegando)
    useEffect(() => {
        // ⚠️ NAVEGACIÓN: No sincronizar si estamos en medio de una navegación
        if (isNavigatingRef.current) return;

        const postParam = searchParams.get('post');
        const portfolioParam = searchParams.get('portfolio');
        const sectionParam = searchParams.get('section');

        if (sectionParam && ['inicio', 'inicio-fotos', 'inicio-videos', 'portafolio', 'contacto', 'faq', 'archivados'].includes(sectionParam)) {
            if (sectionParam !== activeTab) {
                setSelectedPostId(null);
                setSelectedPortfolioSlug(null);
                setIsSearchOpen(false);
                setIsPostEditorOpen(false);
            }
            setActiveTab(sectionParam);
        }

        if (postParam) {
            setSelectedPostId(postParam); // Ahora es CUID, no slug
            setSelectedPortfolioSlug(null);
        } else if (portfolioParam) {
            setSelectedPortfolioSlug(portfolioParam);
            setSelectedPostId(null);
        } else {
            if (!postParam && !portfolioParam) {
                setSelectedPostId(null);
                setSelectedPortfolioSlug(null);
            }
        }
    }, [searchParams, activeTab]);

    // Create post param
    useEffect(() => {
        const createPostParam = searchParams.get('createPost');
        if (createPostParam === 'true' && isOwner) {
            setIsPostEditorOpen(true);
            window.history.replaceState({}, '', `/${studioSlug}`);
        }
    }, [searchParams, isOwner, studioSlug]);

    // Expose callbacks
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__profilePageCallbacks = {
                onCreatePost: () => {
                    setEditingPostId(undefined);
                    setIsPostEditorOpen(true);
                },
                onCreateOffer: () => {
                    window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
                },
            };
        }
    }, [studioSlug]);

    // URL builder
    const buildUrl = (params: { post?: string; portfolio?: string; tab?: string }) => {
        const urlParams = new URLSearchParams();
        if (params.tab && (params.tab !== 'inicio' || params.tab.startsWith('inicio-'))) {
            urlParams.set('section', params.tab);
        }
        if (params.post) urlParams.set('post', params.post);
        if (params.portfolio) urlParams.set('portfolio', params.portfolio);
        const queryString = urlParams.toString();
        return `/${studioSlug}${queryString ? `?${queryString}` : ''}`;
    };

    // Handlers
    const handleTabChange = (tab: string) => {
        // ⚠️ UI: Cerrar overlays antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }

        setSelectedPostId(null);
        setSelectedPortfolioSlug(null);
        setIsSearchOpen(false);
        setIsPostEditorOpen(false);
        setEditingPostId(undefined);

        startTransition(() => {
            setActiveTab(tab);
            router.push(buildUrl({ tab }), { scroll: false });
        });
    };

    const handlePostClick = (postId: string) => {
        // ⚠️ NAVEGACIÓN: Activar flag de navegación
        setIsNavigating(postId);
        isNavigatingRef.current = true;

        // ⚠️ UI: Cerrar overlays antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }

        startTransition(() => {
            setSelectedPostId(postId);
            router.push(buildUrl({ post: postId, tab: activeTab }), { scroll: false });

            // Limpiar flag después de un delay
            setTimeout(() => {
                setIsNavigating(null);
                isNavigatingRef.current = false;
            }, 1000);
        });
    };

    const handleCloseModal = () => {
        // ⚠️ UI: Cerrar overlays antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }

        startTransition(() => {
            setSelectedPostId(null);
            setSelectedPortfolioSlug(null);
            router.push(buildUrl({ tab: activeTab }), { scroll: false });
        });
    };

    const handleNextPost = () => {
        if (!selectedPostId || publishedPosts.length === 0) return;
        const currentIndex = publishedPosts.findIndex(p => p.id === selectedPostId);
        if (currentIndex >= 0 && currentIndex < publishedPosts.length - 1) {
            const nextId = publishedPosts[currentIndex + 1].id;
            
            // ⚠️ NAVEGACIÓN: Activar flag de navegación
            setIsNavigating(nextId);
            isNavigatingRef.current = true;

            // ⚠️ UI: Cerrar overlays antes de navegar
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('close-overlays'));
            }

            startTransition(() => {
                setSelectedPostId(nextId);
                router.push(buildUrl({ post: nextId, tab: activeTab }), { scroll: false });

                // Limpiar flag después de un delay
                setTimeout(() => {
                    setIsNavigating(null);
                    isNavigatingRef.current = false;
                }, 1000);
            });
        }
    };

    const handlePrevPost = () => {
        if (!selectedPostId || publishedPosts.length === 0) return;
        const currentIndex = publishedPosts.findIndex(p => p.id === selectedPostId);
        if (currentIndex > 0) {
            const prevId = publishedPosts[currentIndex - 1].id;
            
            // ⚠️ NAVEGACIÓN: Activar flag de navegación
            setIsNavigating(prevId);
            isNavigatingRef.current = true;

            // ⚠️ UI: Cerrar overlays antes de navegar
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('close-overlays'));
            }

            startTransition(() => {
                setSelectedPostId(prevId);
                router.push(buildUrl({ post: prevId, tab: activeTab }), { scroll: false });

                // Limpiar flag después de un delay
                setTimeout(() => {
                    setIsNavigating(null);
                    isNavigatingRef.current = false;
                }, 1000);
            });
        }
    };

    const handlePortfolioClick = (portfolioSlug: string) => {
        // ⚠️ NAVEGACIÓN: Activar flag de navegación
        setIsNavigating(portfolioSlug);
        isNavigatingRef.current = true;

        // ⚠️ UI: Cerrar overlays antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }

        startTransition(() => {
            setSelectedPortfolioSlug(portfolioSlug);
            router.push(buildUrl({ portfolio: portfolioSlug, tab: activeTab }), { scroll: false });

            // Limpiar flag después de un delay
            setTimeout(() => {
                setIsNavigating(null);
                isNavigatingRef.current = false;
            }, 1000);
        });
    };

    const handleNextPortfolio = () => {
        if (!selectedPortfolioSlug || portfolios.length === 0) return;
        const currentIndex = portfolios.findIndex(p => p.slug === selectedPortfolioSlug);
        if (currentIndex >= 0 && currentIndex < portfolios.length - 1) {
            const nextSlug = portfolios[currentIndex + 1].slug;
            
            // ⚠️ NAVEGACIÓN: Activar flag de navegación
            setIsNavigating(nextSlug);
            isNavigatingRef.current = true;

            // ⚠️ UI: Cerrar overlays antes de navegar
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('close-overlays'));
            }

            startTransition(() => {
                setSelectedPortfolioSlug(nextSlug);
                router.push(buildUrl({ portfolio: nextSlug, tab: activeTab }), { scroll: false });

                // Limpiar flag después de un delay
                setTimeout(() => {
                    setIsNavigating(null);
                    isNavigatingRef.current = false;
                }, 1000);
            });
        }
    };

    const handlePrevPortfolio = () => {
        if (!selectedPortfolioSlug || portfolios.length === 0) return;
        const currentIndex = portfolios.findIndex(p => p.slug === selectedPortfolioSlug);
        if (currentIndex > 0) {
            const prevSlug = portfolios[currentIndex - 1].slug;
            
            // ⚠️ NAVEGACIÓN: Activar flag de navegación
            setIsNavigating(prevSlug);
            isNavigatingRef.current = true;

            // ⚠️ UI: Cerrar overlays antes de navegar
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('close-overlays'));
            }

            startTransition(() => {
                setSelectedPortfolioSlug(prevSlug);
                router.push(buildUrl({ portfolio: prevSlug, tab: activeTab }), { scroll: false });

                // Limpiar flag después de un delay
                setTimeout(() => {
                    setIsNavigating(null);
                    isNavigatingRef.current = false;
                }, 1000);
            });
        }
    };

    // Published posts (sorted: featured first, then by date descending)
    // Si hay múltiples destacados, se ordenan por fecha entre ellos
    const publishedPosts = useMemo(() => {
        const filtered = posts?.filter(p => p.is_published) || [];
        return [...filtered].sort((a, b) => {
            // Featured primero
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            // Si ambos son featured o ambos no, ordenar por fecha (más reciente primero)
            const dateA = a.created_at ? new Date(a.created_at).getTime() : (a.published_at ? new Date(a.published_at).getTime() : 0);
            const dateB = b.created_at ? new Date(b.created_at).getTime() : (b.published_at ? new Date(b.published_at).getTime() : 0);
            return dateB - dateA; // Descendente: más reciente primero
        });
    }, [posts]);

    // Selected post/portfolio data
    const selectedPost = selectedPostId ? posts?.find(p => p.id === selectedPostId) : null;
    const selectedPostWithStudio = selectedPost ? {
        ...selectedPost,
        studio: {
            studio_name: studio.studio_name,
            logo_url: studio.logo_url
        }
    } : null;

    const selectedPortfolio = selectedPortfolioSlug ? portfolios?.find(p => p.slug === selectedPortfolioSlug) : null;

    // Navigation state
    const currentPostIndex = publishedPosts.findIndex(p => p.id === selectedPostId);
    const hasNextPost = currentPostIndex >= 0 && currentPostIndex < publishedPosts.length - 1;
    const hasPrevPost = currentPostIndex > 0;

    const currentPortfolioIndex = portfolios.findIndex(p => p.slug === selectedPortfolioSlug);
    const hasNextPortfolio = currentPortfolioIndex >= 0 && currentPortfolioIndex < portfolios.length - 1;
    const hasPrevPortfolio = currentPortfolioIndex > 0;

    return {
        // State
        activeTab,
        selectedPostId,
        selectedPostSlug: selectedPostId, // Mantener para compatibilidad temporal
        selectedPortfolioSlug,
        isSearchOpen,
        isPostEditorOpen,
        editingPostId,
        isScrolled,
        // Data
        studio,
        posts,
        portfolios,
        offers,
        isOwner,
        hasActiveFAQs,
        publishedPosts,
        selectedPost,
        selectedPostWithStudio,
        selectedPortfolio,
        // Handlers
        handleTabChange,
        handlePostClick,
        handlePortfolioClick,
        handleCloseModal,
        handleNextPost,
        handlePrevPost,
        handleNextPortfolio,
        handlePrevPortfolio,
        setIsSearchOpen,
        setIsPostEditorOpen,
        setEditingPostId,
        // Navigation state
        hasNextPost,
        hasPrevPost,
        hasNextPortfolio,
        hasPrevPortfolio,
        // Utils
        studioSlug,
        router,
    };
}

export type ProfilePageLogic = ReturnType<typeof useProfilePageLogic>;
