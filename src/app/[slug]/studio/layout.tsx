import React from 'react';
import { ZenMagicChatProvider, ZenMagicChatWrapper } from './components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';

export default async function AppLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;

    return (
        <ZenMagicChatProvider>
            <ContactsSheetProvider>
                <div className="flex h-screen w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">
                        <main className="flex-1 w-full overflow-y-auto bg-zinc-900/40">
                            {children}
                        </main>
                    </div>
                    <ZenMagicChatWrapper studioSlug={slug} />
                </div>
            </ContactsSheetProvider>
        </ZenMagicChatProvider>
    );
}
