import { redirect } from 'next/navigation';

export default async function IdentidadRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/${slug}/profile/edit/settings/identity`);
}

