"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PostCard } from "./PostCard";
import { EmptyState } from "./EmptyState";
import { getStudioPostsBySlug } from "@/lib/actions/studio/builder/posts";
import { Loader2 } from "lucide-react";
import { StudioPost } from "@/types/studio-posts";
import { toast } from "sonner";

interface PostsListProps {
    studioSlug: string;
    onPostsChange?: (posts: StudioPost[]) => void;
}

export function PostsList({ studioSlug, onPostsChange }: PostsListProps) {
    const [allPosts, setAllPosts] = useState<StudioPost[]>([]); // Todos los posts cargados
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [error, setError] = useState<string | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousFilteredPostsRef = useRef<StudioPost[]>([]);
    const onPostsChangeRef = useRef(onPostsChange);

    // Actualizar ref cuando cambia onPostsChange
    useEffect(() => {
        onPostsChangeRef.current = onPostsChange;
    }, [onPostsChange]);

    // Filtrar posts localmente según el filtro seleccionado
    const filteredPosts = useMemo(() => {
        return allPosts.filter((post) => {
            if (filter === "all") return true;
            if (filter === "published") return post.is_published === true;
            if (filter === "unpublished") return post.is_published === false;
            if (filter === "featured") return post.is_featured === true;
            return true;
        });
    }, [allPosts, filter]);

    // Notificar cambios de posts al componente padre (solo cuando cambian realmente los posts filtrados)
    useEffect(() => {
        if (onPostsChangeRef.current) {
            // Comparar IDs para evitar notificaciones innecesarias
            const currentIds = filteredPosts.map(p => p.id).sort().join(',');
            const previousIds = previousFilteredPostsRef.current.map(p => p.id).sort().join(',');

            if (currentIds !== previousIds) {
                onPostsChangeRef.current(filteredPosts);
                previousFilteredPostsRef.current = filteredPosts;
            }
        }
    }, [filteredPosts]); // Solo depender de filteredPosts

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Siempre cargar todos los posts sin filtros del servidor
            const result = await getStudioPostsBySlug(studioSlug, undefined);
            if (result.success) {
                // Los posts ya vienen ordenados de la DB (destacados primero, luego por creación)
                // Pero asegurémonos de que estén ordenados correctamente
                const sortedPosts = (result.data || []).sort((a, b) => {
                    // Destacados primero
                    if (a.is_featured && !b.is_featured) return -1;
                    if (!a.is_featured && b.is_featured) return 1;
                    // Luego por fecha de creación (más nueva primero)
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });
                setAllPosts(sortedPosts);
            } else {
                const errorMessage = result.error || "Error al cargar posts";
                setError(errorMessage);
                toast.error(errorMessage);
                setAllPosts([]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error inesperado al cargar posts";
            console.error("Error loading posts:", error);
            setError(errorMessage);
            toast.error(errorMessage);
            setAllPosts([]);
        } finally {
            setLoading(false);
        }
    }, [studioSlug]); // Eliminar filter de las dependencias

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    // Recargar posts solo cuando cambia studioSlug, no cuando cambia el filtro
    // El filtro se aplica localmente

    const filterOptions = [
        { value: "all", label: "Todos" },
        { value: "published", label: "Publicados" },
        { value: "unpublished", label: "Despublicados" },
        { value: "featured", label: "Destacados" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                    onClick={() => loadPosts()}
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                    Intentar nuevamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters - Botones en línea - Siempre visibles */}
            <div className="flex items-center gap-3 flex-wrap">
                {filterOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === option.value
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
                <span className="text-sm text-zinc-400 ml-auto">
                    {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Posts List - Horizontal Cards */}
            {filteredPosts.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="space-y-3">
                    {filteredPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            studioSlug={studioSlug}
                            onUpdate={(updatedPost) => {
                                if (updatedPost === null) {
                                    // Eliminación: remover post de la lista local
                                    setAllPosts(prevPosts =>
                                        prevPosts.filter(p => p.id !== post.id)
                                    );
                                } else {
                                    // Actualización optimista local - actualiza y reordena
                                    setAllPosts(prevPosts => {
                                        const updated = prevPosts.map(p =>
                                            p.id === updatedPost.id ? updatedPost : p
                                        );
                                        // Reordenar: destacados primero, luego por creación
                                        return updated.sort((a, b) => {
                                            if (a.is_featured && !b.is_featured) return -1;
                                            if (!a.is_featured && b.is_featured) return 1;
                                            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                            return dateB - dateA;
                                        });
                                    });
                                }

                                // Sincronización silenciosa en background (sin mostrar loading)
                                // Solo sincronizar si NO es solo un cambio de is_featured
                                const isOnlyFeaturedChange = updatedPost !== null &&
                                    updatedPost.id === post.id &&
                                    updatedPost.is_featured !== post.is_featured &&
                                    updatedPost.is_published === post.is_published;

                                if (!isOnlyFeaturedChange) {
                                    // Cancela sincronización anterior si hay otra actualización
                                    if (syncTimeoutRef.current) {
                                        clearTimeout(syncTimeoutRef.current);
                                    }

                                    syncTimeoutRef.current = setTimeout(async () => {
                                        try {
                                            // Recargar todos los posts del servidor
                                            const result = await getStudioPostsBySlug(studioSlug, undefined);
                                            if (result.success && result.data) {
                                                // Actualizar con datos del servidor y asegurar orden correcto
                                                const sortedPosts = result.data.sort((a, b) => {
                                                    if (a.is_featured && !b.is_featured) return -1;
                                                    if (!a.is_featured && b.is_featured) return 1;
                                                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                    return dateB - dateA;
                                                });
                                                setAllPosts(sortedPosts);
                                            }
                                        } catch (error) {
                                            // Fallar silenciosamente, la UI ya está actualizada
                                            console.error("Error sincronizando posts:", error);
                                        }
                                        syncTimeoutRef.current = null;
                                    }, 2000);
                                }
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
