import { redirect } from 'next/navigation';

export default async function RedesSocialesRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/${slug}/profile/edit/settings/social`);
}

