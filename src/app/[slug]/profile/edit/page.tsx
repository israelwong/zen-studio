import { permanentRedirect } from 'next/navigation';

export default async function ProfileEditorIndex({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    // Redirigir a la primera sección del editor (posts)
    permanentRedirect(`/${slug}/profile/edit/content/posts`);
}

