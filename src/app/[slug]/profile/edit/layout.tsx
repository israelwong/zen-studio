import React from 'react';
import { ZenSidebarProvider } from '@/components/ui/zen/layout/ZenSidebar';
import { ProfileEditorSidebar } from './components/ProfileEditorSidebar';
import { ProfileEditorHeader } from './components/ProfileEditorHeader';
import { Toaster } from 'sonner';

export default async function ProfileEditorLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <ZenSidebarProvider>
            <div className="flex h-screen overflow-hidden">
                <ProfileEditorSidebar studioSlug={slug} />
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <ProfileEditorHeader studioSlug={slug} />
                        <main className="flex-1 overflow-y-auto bg-zinc-900/40">
                            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </div>
            <Toaster position="top-right" richColors />
        </ZenSidebarProvider>
    );
}

