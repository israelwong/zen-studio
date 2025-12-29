import React from 'react';
import { prisma } from '@/lib/prisma';
import { ConfiguracionPageClient } from './components/ConfiguracionPageClient';

interface PlatformConfig {
    id: string;
    // Branding
    company_name: string;
    company_name_long: string | null;
    commercial_name: string | null;
    commercial_name_short: string | null;
    domain: string | null;
    // Assets
    logo_url: string | null;
    favicon_url: string | null;
    // Contacto comercial
    comercial_email: string | null;
    comercial_whatsapp: string | null;
    commercial_phone: string | null;
    // Soporte
    soporte_email: string | null;
    soporte_chat_url: string | null;
    support_phone: string | null;
    // Ubicación
    address: string | null;
    business_hours: string | null;
    timezone: string;
    // Redes sociales (deprecated)
    facebook_url: string | null;
    instagram_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    // Legal (deprecated)
    terminos_condiciones: string | null;
    politica_privacidad: string | null;
    aviso_legal: string | null;
    // SEO
    meta_description: string | null;
    meta_keywords: string | null;
    // Analytics (deprecated)
    google_analytics_id: string | null;
    google_tag_manager_id: string | null;
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Función para obtener la configuración de la plataforma
async function getPlatformConfig(): Promise<PlatformConfig | null> {
    try {
        // En build time, retornar null para evitar errores de conexión
        if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
            return null;
        }

        const config = await prisma.platform_config.findFirst();
        return config;
    } catch (error) {
        console.error('Error fetching platform config:', error);
        // En build time, retornar null en lugar de lanzar error
        if (process.env.NODE_ENV === 'production') {
            return null;
        }
        return null;
    }
}

export default async function ConfiguracionPage() {
    const config = await getPlatformConfig();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Configuración de la Plataforma</h1>
                <p className="text-zinc-400 mt-1">
                    Gestiona la configuración general de la plataforma
                </p>
            </div>

            <ConfiguracionPageClient initialConfig={config} />
        </div>
    );
}
