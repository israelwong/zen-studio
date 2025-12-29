/**
 * Configuración centralizada de branding ZEN Studio
 * 
 * @deprecated Este archivo mantiene valores por defecto para compatibilidad.
 * Preferir usar hooks de usePlatformConfig para obtener datos desde BD:
 * - useCommercialName() - Nombre comercial
 * - useCommercialNameShort() - Nombre corto
 * - usePlatformDomain() - Dominio
 * - usePlatformBranding() - Información completa
 * 
 * ESTRATEGIA:
 * - Marca: "ZEN" / "Zen Studio" (en textos, UI, copyright)
 * - Dominio: "www.zenn.mx" (desde BD)
 */

export const BRANDING = {
  // Marca principal (valores por defecto, usar BD cuando esté disponible)
  name: 'ZEN',
  fullName: 'Zen Studio',
  tagline: 'Plataforma para fotógrafos profesionales',
  
  // Dominio comercial (valores por defecto)
  domain: 'www.zenn.mx',
  websiteUrl: 'https://www.zenn.mx',
  
  // Copyright
  copyrightYear: new Date().getFullYear(),
  copyrightText: `© ${new Date().getFullYear()} Zen Studio. Todos los derechos reservados.`,
  
  // Email
  emailFrom: 'ZEN',
  emailDomain: 'zenn.mx',
  
  // SEO (valores por defecto)
  seo: {
    title: 'Zen Studio - Plataforma para fotógrafos profesionales',
    description: 'Plataforma modular SaaS para estudios fotográficos. Gestiona tu negocio, portafolio, clientes y más.',
    keywords: ['fotografía', 'gestión', 'estudios fotográficos', 'saas', 'portfolio'],
  },
  
  // Social (deprecated - no usar)
  social: {
    twitter: '@zenstudio',
    instagram: '@zenstudio',
    facebook: 'zenstudio',
  },
  
  // Legal
  legal: {
    companyName: 'Zen México',
    country: 'México',
  }
} as const;

// Helper para construir emails
export const getEmailAddress = (prefix: string) => {
  return `${prefix}@${BRANDING.emailDomain}`;
};

// Emails comunes
export const EMAILS = {
  noreply: getEmailAddress('noreply'),
  support: getEmailAddress('support'),
  hello: getEmailAddress('hello'),
  billing: getEmailAddress('billing'),
} as const;

