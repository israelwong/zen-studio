# ✅ Test Checklist - Post Slug Migration

## 🧪 Tests de Funcionalidad

### 1. Generación de Slugs

- [ ] Crear nuevo post con título "Boda en Jardín" → slug debe ser `boda-en-jardin-abc123`
- [ ] Crear post sin título → slug debe ser `post-abc123`
- [ ] Crear post con caracteres especiales "Boda 2024 ❤️" → slug debe ser `boda-2024-abc123`
- [ ] Verificar que sufijo sea único (primeros 6 chars del ID)

### 2. URLs Públicas

- [ ] Acceder a `/demo-studio/post/[slug]` debe mostrar el post
- [ ] URL debe ser legible: `/demo-studio/post/boda-jardin-primavera-abc123`
- [ ] Verificar que el contador de vistas se incrementa
- [ ] Verificar que posts no publicados retornen 404

### 3. URLs de Admin

- [ ] Editar post desde `/profile/edit/content/posts` debe seguir usando ID
- [ ] URL de edición: `/demo-studio/profile/edit/content/posts/[id]/editar`
- [ ] Confirmar que se mantiene estabilidad en rutas admin

### 4. Migración de Posts Existentes

```sql
-- Verificar que todos los posts tienen slug
SELECT id, title, slug FROM studio_posts WHERE slug IS NULL;
-- Debe retornar 0 filas

-- Verificar formato de slugs
SELECT id, title, slug FROM studio_posts LIMIT 10;
-- Todos deben tener formato: texto-abc123
```

### 5. Revalidación de Rutas

- [ ] Publicar post → debe revalidar `/[slug]/post/[postSlug]`
- [ ] Despublicar post → debe revalidar ruta
- [ ] Actualizar post → debe revalidar todas las rutas relevantes

### 6. Componentes

- [ ] PostFeedCard usa `post.slug` en links
- [ ] PostRenderer recibe datos correctos
- [ ] Preview en editor funciona correctamente

## 🔍 Tests de Edge Cases

### 1. Slugs Duplicados

- [ ] Crear dos posts con mismo título en mismo studio
- [ ] Ambos deben tener slugs únicos (sufijo diferente)
- [ ] Constraint único `(studio_id, slug)` debe funcionar

### 2. Caracteres Especiales

Probar títulos con:

- [ ] Emojis: "Boda 💍 María & Juan" → `boda-maria-juan-abc123`
- [ ] Acentos: "Sesión fotográfica" → `sesion-fotografica-abc123`
- [ ] Números: "XV Años 2024" → `xv-anos-2024-abc123`
- [ ] Espacios múltiples: "Boda en Jardín" → `boda-en-jardin-abc123`

### 3. Títulos Extremos

- [ ] Título muy largo (>60 chars) → debe truncarse a 60
- [ ] Título vacío → debe usar "post" como base
- [ ] Solo espacios → debe usar "post" como base
- [ ] Solo caracteres especiales "###" → debe usar "post" como base

## 📊 Tests de Base de Datos

### 1. Índices

```sql
-- Verificar índice único
SELECT * FROM pg_indexes WHERE tablename = 'studio_posts' AND indexname LIKE '%slug%';

-- Verificar que funciona
INSERT INTO studio_posts (studio_id, slug, title, ...)
VALUES ('studio1', 'test-abc123', 'Test', ...);

-- Esto debe fallar (duplicado)
INSERT INTO studio_posts (studio_id, slug, title, ...)
VALUES ('studio1', 'test-abc123', 'Test 2', ...);
```

### 2. Performance

```sql
-- Query por slug debe ser rápido (usando índice)
EXPLAIN ANALYZE
SELECT * FROM studio_posts
WHERE studio_id = 'xxx' AND slug = 'boda-jardin-abc123';
-- Debe usar Index Scan, no Seq Scan
```

## 🚀 Tests de SEO

### 1. URLs Amigables

- [ ] URL contiene palabras clave del título
- [ ] URL es legible y corta
- [ ] Sin caracteres especiales o espacios

### 2. Meta Tags

- [ ] Verificar que el título del post aparece en `<title>`
- [ ] URL canónica usa slug
- [ ] Open Graph usa URL con slug

### 3. Compartir en Redes

- [ ] Copiar URL y pegar en WhatsApp → preview correcto
- [ ] Copiar URL y pegar en Facebook → preview correcto
- [ ] URL se mantiene limpia al compartir

## 🔄 Tests de Retrocompatibilidad

### 1. Posts Existentes

- [ ] Todos los posts existentes recibieron slug
- [ ] No se perdieron datos
- [ ] Media items siguen relacionados correctamente

### 2. Enlaces Externos

⚠️ **IMPORTANTE**: Enlaces antiguos con ID ya no funcionarán

- Estrategia: Considerar redirect de `/post/[id]` → `/post/[slug]`
- O: Mantener ambos endpoints temporalmente

## 📝 Tests Manuales Recomendados

1. **Crear Post Completo**
   - Ir a `/demo-studio/profile/edit/content/posts/nuevo`
   - Crear post con título, descripción, media
   - Publicar
   - Verificar URL pública usa slug
   - Compartir URL en WhatsApp

2. **Editar Post Existente**
   - Editar un post existente
   - Verificar que slug no cambia
   - Actualizar título → slug debe mantenerse

3. **Contador de Vistas**
   - Acceder a post público varias veces
   - Verificar que contador incrementa
   - Verificar que usa slug en la función

4. **Feed de Posts**
   - Ir a `/demo-studio` (perfil público)
   - Ver posts en feed
   - Click en post → debe ir a URL con slug
   - Verificar que carga correctamente

## ✅ Criterios de Éxito

- [ ] Todos los posts tienen slug único
- [ ] URLs públicas usan slug
- [ ] URLs admin siguen usando ID
- [ ] Performance es buena (índices funcionan)
- [ ] SEO mejorado (URLs legibles)
- [ ] No hay errores en consola
- [ ] TypeScript compila sin errores
- [ ] Tests manuales pasan

## 🐛 Problemas Conocidos

Ninguno por ahora.

## 📞 Si algo falla

1. Verificar que migración se aplicó:

   ```sql
   \d studio_posts
   -- Debe mostrar columna 'slug'
   ```

2. Verificar slugs generados:

   ```sql
   SELECT count(*) FROM studio_posts WHERE slug IS NULL;
   -- Debe ser 0
   ```

3. Regenerar Prisma Client:

   ```bash
   npx prisma generate
   ```

4. Reiniciar servidor Next.js

---

**Fecha de pruebas**: ****\_\_\_****
**Testeado por**: ****\_\_\_****
**Resultado**: ⬜ Aprobado | ⬜ Con observaciones | ⬜ Rechazado
