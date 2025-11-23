import { redirect } from 'next/navigation';

export default async function UbicacionRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/${slug}/profile/edit/settings/contact/ubicacion`);
}

