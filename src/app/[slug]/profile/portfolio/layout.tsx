import React from 'react';
import { Toaster } from 'sonner';

export default async function PortfolioEditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
            <Toaster position="top-right" richColors />
        </>
    );
}
