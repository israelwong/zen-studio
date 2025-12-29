import { useEffect } from 'react';
import { useCommercialName } from './usePlatformConfig';

/**
 * Hook para actualizar el título de la página usando el nombre comercial desde BD
 * 
 * @param pageName - Nombre de la página (ej: "Dashboard", "Ofertas")
 * @param separator - Separador entre nombre comercial y página (default: " - ")
 */
export function usePageTitle(pageName: string, separator: string = ' - ') {
    const commercialName = useCommercialName();

    useEffect(() => {
        const title = `${commercialName}${separator}${pageName}`;
        document.title = title;

        // Actualizar Open Graph title
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', title);
        }

        // Actualizar Twitter/X title
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) {
            twitterTitle.setAttribute('content', title);
        }
    }, [commercialName, pageName, separator]);
}
