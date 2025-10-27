import { create } from "zustand";

interface MediaItem {
    url: string;
    type: "image" | "video";
    width?: number;
    height?: number;
    thumbnail_url?: string;
    storage_path?: string;
}

interface PostPreview {
    id?: string;
    title?: string;
    caption?: string;
    media: MediaItem[];
    cover_index: number;
    category: string;
    event_type_name?: string;
    tags: string[];
    cta_enabled: boolean;
    cta_text: string;
    cta_action: string;
}

interface PostStore {
    preview: PostPreview | null;
    setPreview: (preview: PostPreview) => void;
    updatePreview: (updates: Partial<PostPreview>) => void;
    clearPreview: () => void;
}

export const usePostStore = create<PostStore>((set) => ({
    preview: null,
    setPreview: (preview) => set({ preview }),
    updatePreview: (updates) =>
        set((state) => ({
            preview: state.preview ? { ...state.preview, ...updates } : null,
        })),
    clearPreview: () => set({ preview: null }),
}));
