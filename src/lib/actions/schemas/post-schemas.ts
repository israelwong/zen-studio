import { z } from "zod";

// Media Item Schema
export const mediaItemSchema = z.object({
    url: z.string().url("URL inválida"),
    type: z.enum(["image", "video"]),
    width: z.number().optional(),
    height: z.number().optional(),
    thumbnail_url: z.string().url().optional(),
    storage_path: z.string().optional(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

// Create/Update Post Schema
export const postFormSchema = z.object({
    title: z.string().max(200).optional().nullable(),
    caption: z.string().max(2000).optional().nullable(),
    media: z.array(mediaItemSchema).min(1, "Agrega al menos una foto o video"),
    cover_index: z.number().min(0).default(0),
    category: z.enum(["portfolio", "blog", "promo"]).default("portfolio"),
    event_type_id: z.string().cuid().optional().nullable(),
    tags: z.array(z.string()).default([]),
    cta_enabled: z.boolean().default(true),
    cta_text: z.string().default("Cotiza tu evento"),
    cta_action: z.enum(["whatsapp", "lead_form", "calendar"]).default("whatsapp"),
    cta_link: z.string().url().optional().nullable(),
    is_featured: z.boolean().default(false),
    is_published: z.boolean().default(false),
});

export type PostFormData = z.infer<typeof postFormSchema>;

// Filters Schema
export const postFiltersSchema = z.object({
    is_published: z.boolean().optional(),
    category: z.enum(["portfolio", "blog", "promo"]).optional(),
    event_type_id: z.string().cuid().optional(),
});

export type PostFilters = z.infer<typeof postFiltersSchema>;
