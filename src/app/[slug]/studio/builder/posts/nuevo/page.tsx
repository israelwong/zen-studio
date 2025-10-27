import { PostEditor } from "../components/PostEditor";
import { getStudioEventTypes } from "@/lib/actions/studio/builder/eventos/eventos.actions";

interface NuevoPostPageProps {
    params: {
        slug: string;
    };
}

export default async function NuevoPostPage({ params }: NuevoPostPageProps) {
    // Obtener tipos de evento para el select
    const eventTypesResult = await getStudioEventTypes(params.slug);
    const eventTypes = eventTypesResult.success ? eventTypesResult.data : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Nuevo Post</h1>
                <p className="text-zinc-400">
                    Crea una nueva publicación para tu estudio
                </p>
            </div>

            {/* Editor */}
            <PostEditor
                studioSlug={params.slug}
                eventTypes={eventTypes}
                mode="create"
            />
        </div>
    );
}
