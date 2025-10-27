"use client";

import { useState, useEffect } from "react";
import { PostCard } from "./PostCard";
import { EmptyState } from "./EmptyState";
import { getStudioPosts } from "@/lib/actions/studio/builder/posts";
import { ZenSelect } from "@/components/ui/zen";
import { Loader2 } from "lucide-react";

interface PostsListProps {
    studioSlug: string;
}

export function PostsList({ studioSlug }: PostsListProps) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        loadPosts();
    }, [filter]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            // TODO: Obtener studioId desde el slug
            const studioId = "temp-studio-id"; // Reemplazar con lógica real

            const filters = filter === "all" ? undefined : {
                is_published: filter === "published",
                category: filter !== "all" && filter !== "published" ? filter as any : undefined,
            };

            const result = await getStudioPosts(studioId, filters);
            if (result.success) {
                setPosts(result.data || []);
            }
        } catch (error) {
            console.error("Error loading posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const filterOptions = [
        { value: "all", label: "Todos" },
        { value: "published", label: "Publicados" },
        { value: "portfolio", label: "Portfolio" },
        { value: "blog", label: "Blog" },
        { value: "promo", label: "Promoción" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (posts.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
                <ZenSelect
                    value={filter}
                    onValueChange={setFilter}
                    options={filterOptions}
                    placeholder="Filtrar posts"
                />
                <span className="text-sm text-zinc-400">
                    {posts.length} post{posts.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        studioSlug={studioSlug}
                        onUpdate={loadPosts}
                    />
                ))}
            </div>
        </div>
    );
}
