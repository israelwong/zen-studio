import { PostEditor } from "../../components/PostEditor";
import { getStudioEventTypes } from "@/lib/actions/studio/builder/eventos/eventos.actions";
import { getStudioPostById } from "@/lib/actions/studio/builder/posts";
import { notFound } from "next/navigation";

interface EditarPostPageProps {
    params: {
        slug: string;
        id: string;
    };
}

export default async function EditarPostPage({ params }: EditarPostPageProps) {
    // Obtener el post existente
    const postResult = await getStudioPostById(params.id);
    if (!postResult.success || !postResult.data) {
        notFound();
    }

    // Obtener tipos de evento para el select
    const eventTypesResult = await getStudioEventTypes(params.slug);
    const eventTypes = eventTypesResult.success ? eventTypesResult.data : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Editar Post</h1>
                <p className="text-zinc-400">
                    Modifica tu publicación
                </p>
            </div>

            {/* Editor */}
            <PostEditor
                studioSlug={params.slug}
                eventTypes={eventTypes}
                mode="edit"
                post={postResult.data}
            />
        </div>
    );
}
