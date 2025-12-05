"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    ZenButton, 
    ZenInput, 
    ZenTextarea, 
    ZenBadge, 
    ZenSwitch
} from "@/components/ui/zen";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/shadcn/sheet";
import { Star, Plus, X, Copy, Check, ImagePlus } from "lucide-react";
import { ImageGrid } from "@/components/shared/media";
import { MediaItem } from "@/types/content-blocks";
import { createStudioPostBySlug, updateStudioPost, checkPostSlugExists, getStudioPostBySlug } from "@/lib/actions/studio/posts";
import { PostFormData, MediaItem as PostMediaItem } from "@/lib/actions/schemas/post-schemas";
import { useTempCuid } from "@/hooks/useTempCuid";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { toast } from "sonner";
import cuid from "cuid";
import { calculateTotalStorage, formatBytes } from "@/lib/utils/storage";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import { generateSlug } from "@/lib/utils/slug-utils";
import { useRouter } from "next/navigation";

interface PostEditorSheetProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    mode: "create" | "edit";
    postId?: string; // Para modo edición
    onSuccess?: () => void; // Callback después de guardar exitosamente
}

export function PostEditorSheet({ 
    isOpen, 
    onClose, 
    studioSlug, 
    mode,
    postId,
    onSuccess 
}: PostEditorSheetProps) {
    const router = useRouter();
    const tempCuid = useTempCuid();
    const { uploadFiles, isUploading } = useMediaUpload();
    const { triggerRefresh } = useStorageRefresh(studioSlug);

    // Estado del formulario
    const [formData, setFormData] = useState<{ 
        title: string; 
        slug: string; 
        caption: string; 
        tags: string[]; 
        media: PostMediaItem[]; 
        is_published: boolean; 
        is_featured: boolean 
    }>({
        title: "",
        slug: "",
        caption: "",
        tags: [],
        media: [],
        is_published: true,
        is_featured: false,
    });

    const [tagInput, setTagInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isMediaUploading, setIsMediaUploading] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [isValidatingSlug, setIsValidatingSlug] = useState(false);
    const [isLoadingPost, setIsLoadingPost] = useState(false);

    // Cargar post si es modo edición
    useEffect(() => {
        const loadPost = async () => {
            if (mode === "edit" && postId && isOpen) {
                setIsLoadingPost(true);
                try {
                    const result = await getStudioPostBySlug(studioSlug, postId);
                    if (result.success && result.data) {
                        const post = result.data;
                        setFormData({
                            title: post.title || "",
                            slug: post.slug || "",
                            caption: post.caption || "",
                            tags: post.tags || [],
                            media: post.media || [],
                            is_published: post.is_published ?? true,
                            is_featured: post.is_featured ?? false,
                        });
                    }
                } catch (error) {
                    console.error("Error loading post:", error);
                    toast.error("Error al cargar el post");
                } finally {
                    setIsLoadingPost(false);
                }
            }
        };

        loadPost();
    }, [mode, postId, studioSlug, isOpen]);

    // Reset form al cerrar
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                title: "",
                slug: "",
                caption: "",
                tags: [],
                media: [],
                is_published: true,
                is_featured: false,
            });
            setTagInput("");
            setTitleError(null);
            setLinkCopied(false);
        }
    }, [isOpen]);

    // Generar slug automáticamente cuando cambia el título
    useEffect(() => {
        if (formData.title) {
            const expectedSlug = generateSlug(formData.title);
            if (!formData.slug || mode === "create") {
                setFormData(prev => ({
                    ...prev,
                    slug: expectedSlug
                }));
            }
        }
    }, [formData.title, mode]);

    // Validar slug único cuando cambia
    useEffect(() => {
        const validateSlug = async () => {
            if (!formData.slug || !formData.slug.trim()) {
                setTitleError(null);
                setIsValidatingSlug(false);
                return;
            }

            setIsValidatingSlug(true);
            setTitleError(null);

            try {
                const slugExists = await checkPostSlugExists(
                    studioSlug,
                    formData.slug,
                    mode === "edit" ? postId : undefined
                );

                if (slugExists) {
                    setTitleError("Ya existe un post con este título");
                } else {
                    setTitleError(null);
                }
            } catch (error) {
                console.error("Error validating slug:", error);
                setTitleError(null);
            } finally {
                setIsValidatingSlug(false);
            }
        };

        const timeoutId = setTimeout(() => {
            validateSlug();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.slug, studioSlug, mode, postId]);

    // Helper para obtener dimensions de una imagen
    const getImageDimensions = (file: File): Promise<{ width: number; height: number } | undefined> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(undefined);
                return;
            }

            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(objectUrl);
            };

            img.onerror = () => {
                resolve(undefined);
                URL.revokeObjectURL(objectUrl);
            };

            img.src = objectUrl;
        });
    };

    // Manejar subida de archivos
    const handleDropFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        try {
            setIsMediaUploading(true);

            const uploadedFiles = await uploadFiles(files, studioSlug, 'posts', 'content');

            const mediaItemsPromises = uploadedFiles.map(async (uploadedFile, index) => {
                const originalFile = files[index];
                const isVideo = originalFile.type.startsWith('video/');
                const isImage = originalFile.type.startsWith('image/');

                let dimensions: { width: number; height: number } | undefined;
                if (isImage) {
                    dimensions = await getImageDimensions(originalFile);
                }

                return {
                    id: uploadedFile.id,
                    file_url: uploadedFile.url,
                    file_type: isVideo ? 'video' as const : 'image' as const,
                    filename: uploadedFile.fileName,
                    storage_path: uploadedFile.url,
                    storage_bytes: uploadedFile.size,
                    mime_type: originalFile.type,
                    dimensions: dimensions,
                    duration_seconds: undefined,
                    display_order: formData.media.length + index,
                    alt_text: undefined,
                    thumbnail_url: undefined,
                } as PostMediaItem;
            });

            const mediaItems = await Promise.all(mediaItemsPromises);

            setFormData(prev => ({
                ...prev,
                media: [...prev.media, ...mediaItems]
            }));

            toast.success(`${files.length} archivo(s) subido(s) correctamente`);
        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error('Error al subir archivos');
        } finally {
            setIsMediaUploading(false);
        }
    }, [uploadFiles, studioSlug, formData.media.length]);

    const handleDeleteMedia = useCallback((mediaId: string) => {
        setFormData(prev => ({
            ...prev,
            media: prev.media.filter(item => item.id !== mediaId)
        }));
    }, []);

    const handleReorderMedia = useCallback((reorderedMedia: MediaItem[]) => {
        const convertedMedia: PostMediaItem[] = reorderedMedia.map((item, index) => ({
            ...item as PostMediaItem,
            display_order: index
        }));
        setFormData(prev => ({
            ...prev,
            media: convertedMedia
        }));
    }, []);

    const handleUploadClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
                handleDropFiles(files);
            }
        };
        input.click();
    }, [handleDropFiles]);

    const handleAddTag = useCallback(() => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !formData.tags.includes(trimmedTag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, trimmedTag]
            }));
            setTagInput("");
        } else if (formData.tags.includes(trimmedTag)) {
            toast.error("Esta palabra clave ya existe");
        }
    }, [tagInput, formData.tags]);

    const handleRemoveTag = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index)
        }));
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);

            if (!formData.title || formData.title.trim() === "") {
                toast.error("El título es obligatorio");
                return;
            }

            if (!formData.slug || !formData.slug.trim()) {
                toast.error("El slug es requerido");
                return;
            }

            if (titleError) {
                toast.error(titleError);
                return;
            }

            if (!formData.media || formData.media.length === 0) {
                toast.error("Agrega al menos una imagen o video");
                return;
            }

            const postData: PostFormData = {
                id: postId || tempCuid,
                slug: formData.slug,
                title: formData.title,
                caption: formData.caption || null,
                media: formData.media.map((item, index) => ({
                    ...item,
                    id: item.id || cuid(),
                    display_order: index
                })),
                cover_index: 0,
                event_type_id: null,
                tags: formData.tags,
                is_featured: formData.is_featured,
                is_published: formData.is_published,
            };

            let result;
            if (mode === "create") {
                result = await createStudioPostBySlug(studioSlug, postData);
            } else {
                if (!postId) {
                    toast.error("ID del post no encontrado");
                    return;
                }
                result = await updateStudioPost(postId, postData);
            }

            if (result.success) {
                toast.success(mode === "create" ? "Post creado exitosamente" : "Post actualizado exitosamente");
                triggerRefresh();
                
                // Llamar callback de éxito y cerrar sheet
                if (onSuccess) {
                    onSuccess();
                }
                
                // Refrescar la página actual para mostrar cambios
                router.refresh();
                onClose();
            } else {
                toast.error(result.error || "Error al guardar el post");
            }

        } catch (error) {
            console.error("Error saving post:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar el post");
        } finally {
            setIsSaving(false);
        }
    };

    const postSize = useMemo(() => {
        return calculateTotalStorage(formData.media);
    }, [formData.media]);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent 
                side="right" 
                className="w-full sm:max-w-2xl overflow-y-auto"
            >
                <SheetHeader>
                    <SheetTitle>
                        {mode === "create" ? "Nuevo Post" : "Editar Post"}
                    </SheetTitle>
                    <SheetDescription>
                        {mode === "create" ? "Crea una nueva publicación" : "Modifica tu publicación"}
                    </SheetDescription>
                </SheetHeader>

                {isLoadingPost ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-zinc-400">Cargando post...</div>
                    </div>
                ) : (
                    <div className="space-y-6 mt-6">
                        {/* Header Controls */}
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                            <ZenSwitch
                                checked={formData.is_published}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                                label="Publicado"
                            />
                            <ZenButton
                                type="button"
                                variant={formData.is_featured ? undefined : "outline"}
                                size="sm"
                                onClick={() => setFormData(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                                className={`rounded-full ${formData.is_featured ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-500" : ""}`}
                            >
                                <Star className={`w-4 h-4 mr-1.5 ${formData.is_featured ? 'fill-current' : ''}`} />
                                Destacar
                            </ZenButton>
                        </div>

                        {/* Título */}
                        <div className="space-y-2">
                            <ZenInput
                                label="Título"
                                value={formData.title || ""}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    title: e.target.value,
                                    slug: generateSlug(e.target.value)
                                }))}
                                placeholder="Título del post"
                                required
                                error={titleError || undefined}
                            />

                            {/* Mostrar slug con validación */}
                            {formData.slug && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs text-zinc-500">
                                        URL: <span className="text-zinc-400 font-mono">
                                            /{studioSlug}/post/{formData.slug}
                                        </span>
                                    </p>
                                    {isValidatingSlug && (
                                        <span className="text-xs text-zinc-500">Validando...</span>
                                    )}
                                    {!isValidatingSlug && !titleError && (
                                        <span className="text-xs text-emerald-500">✓ Disponible</span>
                                    )}
                                    {formData.slug && !titleError && (
                                        <ZenButton
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2"
                                            onClick={async () => {
                                                const postUrl = `${window.location.origin}/${studioSlug}/post/${formData.slug}`;
                                                try {
                                                    await navigator.clipboard.writeText(postUrl);
                                                    setLinkCopied(true);
                                                    toast.success("Link copiado al portapapeles");
                                                    setTimeout(() => setLinkCopied(false), 2000);
                                                } catch {
                                                    toast.error("Error al copiar el link");
                                                }
                                            }}
                                        >
                                            {linkCopied ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <Copy className="w-3 h-3" />
                                            )}
                                        </ZenButton>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Descripción */}
                        <ZenTextarea
                            label="Descripción"
                            value={formData.caption || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                            placeholder="Escribe una descripción... Los enlaces se convertirán automáticamente en links"
                            rows={4}
                        />

                        {/* Multimedia */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-zinc-300">
                                    Multimedia
                                </label>
                                {postSize > 0 && (
                                    <span className="text-xs text-zinc-400">
                                        Tamaño: <span className="text-zinc-300 font-medium">{formatBytes(postSize)}</span>
                                    </span>
                                )}
                            </div>
                            <ImageGrid
                                media={formData.media as MediaItem[]}
                                columns={2}
                                gap={4}
                                showDeleteButtons={true}
                                onDelete={handleDeleteMedia}
                                onReorder={handleReorderMedia}
                                isEditable={true}
                                lightbox={true}
                                onDrop={handleDropFiles}
                                onUploadClick={handleUploadClick}
                                isUploading={isMediaUploading || isUploading}
                            />
                        </div>

                        {/* Palabras clave */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Palabras clave
                            </label>
                            <div className="flex gap-2 w-full items-center">
                                <div className="flex-1">
                                    <ZenInput
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder="Presiona Enter"
                                        label=""
                                    />
                                </div>
                                <ZenButton
                                    type="button"
                                    onClick={handleAddTag}
                                    variant="outline"
                                    className="px-3"
                                >
                                    <Plus className="h-4 w-4" />
                                </ZenButton>
                            </div>

                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {formData.tags.map((tag, index) => (
                                        <ZenBadge
                                            key={index}
                                            variant="secondary"
                                            className="flex items-center gap-1.5 pr-1"
                                        >
                                            <span>{tag}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(index)}
                                                className="hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </ZenBadge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 pt-4 sticky bottom-0 bg-zinc-900 pb-4 border-t border-zinc-800">
                            <ZenButton
                                onClick={handleSave}
                                className="flex-1"
                                loading={isSaving}
                                disabled={isSaving || isValidatingSlug || !!titleError}
                            >
                                {mode === "create" ? "Crear Post" : "Actualizar"}
                            </ZenButton>
                            <ZenButton
                                variant="outline"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                Cancelar
                            </ZenButton>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
