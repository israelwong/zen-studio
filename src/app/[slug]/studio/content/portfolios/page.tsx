import { redirect } from 'next/navigation';

export default async function PortfoliosRedirect({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/${slug}/profile/edit/content/portfolios`);
}

