"use server";

import { createClient } from "@/utils/supabase/server";
import sharp from "sharp";

interface UploadResult {
    url: string;
    thumbnail_url?: string;
    storage_path: string;
    width?: number;
    height?: number;
    type: "image" | "video";
}

// UPLOAD IMAGE
export async function uploadPostImage(
    studioId: string,
    postId: string,
    file: File
): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
        const supabase = await createClient();

        // Validar tamaño (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return { success: false, error: "La imagen no debe superar 5MB" };
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const imagePath = `studios/${studioId}/posts/${postId}/images/${fileName}`;
        const thumbPath = `studios/${studioId}/posts/${postId}/thumbnails/${fileName}`;

        // Procesar imagen
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Obtener dimensiones
        const metadata = await sharp(buffer).metadata();
        const { width = 0, height = 0 } = metadata;

        // Optimizar imagen principal (max 1920px)
        const optimized = await sharp(buffer)
            .resize(1920, 1920, {
                fit: "inside",
                withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

        // Crear thumbnail (400px)
        const thumbnail = await sharp(buffer)
            .resize(400, 400, {
                fit: "cover",
                position: "center",
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Upload imagen principal
        const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(imagePath, optimized, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
            });

        if (uploadError) throw uploadError;

        // Upload thumbnail
        const { error: thumbError } = await supabase.storage
            .from("media")
            .upload(thumbPath, thumbnail, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
            });

        if (thumbError) throw thumbError;

        // Obtener URLs públicas
        const { data: imageUrl } = supabase.storage
            .from("media")
            .getPublicUrl(imagePath);

        const { data: thumbUrl } = supabase.storage
            .from("media")
            .getPublicUrl(thumbPath);

        return {
            success: true,
            data: {
                url: imageUrl.publicUrl,
                thumbnail_url: thumbUrl.publicUrl,
                storage_path: imagePath,
                width,
                height,
                type: "image",
            },
        };
    } catch (error) {
        console.error("Error uploading image:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al subir imagen",
        };
    }
}

// UPLOAD VIDEO
export async function uploadPostVideo(
    studioId: string,
    postId: string,
    file: File
): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
        const supabase = await createClient();

        // Validar tamaño (max 100MB)
        const MAX_SIZE = 100 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return { success: false, error: "El video no debe superar 100MB" };
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const videoPath = `studios/${studioId}/posts/${postId}/videos/${fileName}`;

        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(videoPath, arrayBuffer, {
                contentType: file.type,
                cacheControl: "31536000",
            });

        if (uploadError) throw uploadError;

        const { data: videoUrl } = supabase.storage
            .from("media")
            .getPublicUrl(videoPath);

        return {
            success: true,
            data: {
                url: videoUrl.publicUrl,
                thumbnail_url: videoUrl.publicUrl, // TODO: Generar thumbnail
                storage_path: videoPath,
                width: 1920,
                height: 1080,
                type: "video",
            },
        };
    } catch (error) {
        console.error("Error uploading video:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al subir video",
        };
    }
}

// DELETE MEDIA
export async function deletePostMedia(storagePath: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase.storage
            .from("media")
            .remove([storagePath]);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error deleting media:", error);
        return { success: false, error: "Error al eliminar archivo" };
    }
}
