import * as React from "react"

const DESKTOP_BREAKPOINT = 1024 // lg breakpoint de Tailwind

/**
 * Hook para detectar si estamos en desktop (>= 1024px)
 * Detecta inmediatamente en el cliente para evitar flash de contenido
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    // Inicializar con el valor correcto si estamos en el cliente
    if (typeof window !== 'undefined') {
      return window.innerWidth >= DESKTOP_BREAKPOINT;
    }
    // En el servidor, asumir mobile por defecto (más común)
    return false;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Verificar inmediatamente por si acaso
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isDesktop
}
