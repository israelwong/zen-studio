import { redirect } from 'next/navigation';

export default async function ProfileEditorIndex({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    // Redirigir a la primera sección del editor (posts)
    redirect(`/${slug}/profile/edit/content/posts`);
}

