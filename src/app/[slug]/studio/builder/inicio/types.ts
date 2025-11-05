// ============================================
// INICIO TYPES
// ============================================
// Types para la sección de inicio del builder
// Basado en el patrón de las otras secciones

export interface InicioData {
    studio: {
        studio_name: string;
        presentation: string | null;
        slogan: string | null;
        logo_url: string | null;
        website: string | null;
    };
    featured_portfolios: Array<{
        id: string;
        title: string;
        cover_image_url: string | null;
        category: string | null;
    }>;
    featured_items: Array<{
        id: string;
        name: string;
        type: 'PRODUCTO' | 'SERVICIO';
        cost: number;
        image_url?: string;
    }>;
    contact_info: {
        phones: Array<{
            number: string;
            type: string;
        }>;
        address: string | null;
    };
    social_networks: Array<{
        platform: string;
        url: string;
    }>;
}

export interface InicioFormData {
    studio_name: string;
    presentation: string;
    slogan: string;
    website: string;
}

export interface FeaturedContent {
    portfolios: string[]; // IDs de portafolios destacados
    items: string[]; // IDs de items destacados
}
