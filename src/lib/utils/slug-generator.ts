/**
 * Genera un slug único para posts basado en el título
 * Formato: titulo-normalizado-abc123 (título + sufijo único de 6 chars)
 */
export function generatePostSlug(title: string, uniqueId: string): string {
  // Normalizar título
  const normalized = title
    .toLowerCase()
    .trim()
    // Remover caracteres especiales excepto espacios y guiones
    .replace(/[^a-z0-9\s-]/g, '')
    // Reemplazar espacios múltiples con uno solo
    .replace(/\s+/g, '-')
    // Remover guiones múltiples
    .replace(/-+/g, '-')
    // Remover guiones al inicio/final
    .replace(/^-+|-+$/g, '')
    // Limitar a 60 caracteres
    .substring(0, 60)
    // Remover guion final si quedó después del substring
    .replace(/-+$/, '');

  // Usar los primeros 6 caracteres del ID como sufijo único
  const suffix = uniqueId.substring(0, 6);

  // Si el título normalizado está vacío, usar 'post'
  const slugBase = normalized || 'post';

  return `${slugBase}-${suffix}`;
}

/**
 * Valida si un slug tiene el formato correcto
 */
export function isValidPostSlug(slug: string): boolean {
  // Debe tener formato: texto-abc123
  // Mínimo 8 caracteres (x-abc123)
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?-[a-z0-9]{6}$/;
  return slugRegex.test(slug);
}
