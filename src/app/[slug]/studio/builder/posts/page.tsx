import { Suspense } from "react";
import { ZenButton } from "@/components/ui/zen";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PostsList } from "./components/PostsList";
import { EmptyState } from "./components/EmptyState";

interface PostsPageProps {
    params: {
        slug: string;
    };
}

export default function PostsPage({ params }: PostsPageProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Posts</h1>
                    <p className="text-zinc-400">
                        Gestiona tus publicaciones y contenido
                    </p>
                </div>
                <Link href={`/${params.slug}/studio/builder/posts/nuevo`}>
                    <ZenButton className="gap-2">
                        <Plus className="w-4 h-4" />
                        Nuevo Post
                    </ZenButton>
                </Link>
            </div>

            {/* Posts List */}
            <Suspense fallback={<div>Cargando posts...</div>}>
                <PostsList studioSlug={params.slug} />
            </Suspense>
        </div>
    );
}
