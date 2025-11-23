import { redirect } from 'next/navigation';

export default async function PostsRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/${slug}/profile/edit/content/posts`);
}

