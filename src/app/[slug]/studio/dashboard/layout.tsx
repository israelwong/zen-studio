import React from 'react';

// Layout anidado: solo pasa el contenido, el layout padre (studio/layout.tsx) ya tiene sidebar y header
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
