import { SeccionSkeleton } from "./SeccionSkeleton";
import { CategoriaSkeleton } from "./CategoriaSkeleton";
import { ItemSkeleton } from "./ItemSkeleton";

type NavigationLevel = 1 | 2 | 3 | 4;

interface CatalogoTabSkeletonContainerProps {
    /**
     * Nivel de navegación actual (1-4)
     * - 1: Listado de Secciones
     * - 2: Listado de Categorías
     * - 3: Listado de Items
     * - 4: Editor de Item (no necesita skeleton)
     */
    level?: NavigationLevel;
}

/**
 * Orquestador de Skeletons para CatalogoTab
 * Selecciona automáticamente el skeleton correcto según el nivel de navegación
 *
 * @param level - Nivel de navegación (por defecto: 1 para Secciones)
 *
 * @example
 * ```tsx
 * // Mostrar skeleton de secciones
 * <CatalogoTabSkeletonContainer level={1} />
 *
 * // Mostrar skeleton de categorías
 * <CatalogoTabSkeletonContainer level={2} />
 *
 * // Mostrar skeleton de items
 * <CatalogoTabSkeletonContainer level={3} />
 * ```
 */
export function CatalogoTabSkeletonContainer({
    level = 1,
}: CatalogoTabSkeletonContainerProps) {
    switch (level) {
        case 1:
            return <SeccionSkeleton />;
        case 2:
            return <CategoriaSkeleton />;
        case 3:
            return <ItemSkeleton />;
        case 4:
            // Nivel 4 es editor individual, no necesita skeleton
            return null;
        default:
            return <SeccionSkeleton />;
    }
}
