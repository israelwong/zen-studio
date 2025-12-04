# Migration: Post URLs - ID to Slug

## 📅 Fecha

4 de diciembre de 2024

## 🎯 Objetivo

Cambiar las URLs públicas de posts de ID a slug para mejorar SEO y legibilidad.

## 🔄 Cambios Realizados

### 1. Base de Datos

- ✅ Agregado campo `slug` a tabla `studio_posts`
- ✅ Índice único `(studio_id, slug)`
- ✅ Generación automática de slugs para posts existentes
- ✅ Formato: `titulo-normalizado-abc123` (título + 6 chars del ID)

### 2. Generación de Slugs

- ✅ Nuevo archivo: `src/lib/utils/slug-generator.ts`
- ✅ Función `generatePostSlug(title, uniqueId)`
- ✅ Función `isValidPostSlug(slug)`

### 3. Server Actions

- ✅ Nueva acción: `getStudioPostBySlug(studioSlug, postSlug)`
- ✅ Actualizado `createStudioPost()` - genera slug automático
- ✅ Actualizado `incrementPostViewCount()` - usa slug y studioSlug
- ✅ Actualizado `revalidatePath()` en todos los actions

### 4. Rutas

- ✅ Renombrado: `/[slug]/post/[postId]` → `/[slug]/post/[postSlug]`
- ✅ Actualizado page.tsx para usar `getStudioPostBySlug()`

### 5. Componentes

- ✅ `PostFeedCard.tsx` - usa `post.slug` para URLs públicas
- ✅ `StudioPost` type - agregado campo `slug`
- ⚠️ Admin URLs siguen usando ID (más estable para edición)

### 6. Tipos

- ✅ Actualizado `StudioPost` interface con campo `slug`

## 📝 Ejemplos de URLs

### Antes

```
/estudiomendez/post/clq8x2y3z0000abc123def456
```

### Después

```
/estudiomendez/post/boda-jardin-primavera-clq8x2
```

## 🔍 SEO Benefits

- ✅ URLs legibles y descriptivas
- ✅ Keywords en URL
- ✅ Mejor experiencia de usuario
- ✅ Compatible con compartir en redes sociales

## ⚠️ Notas Importantes

### Slugs Únicos

- Los slugs son únicos por studio (no globalmente)
- Se garantiza unicidad con sufijo del ID

### Retrocompatibilidad

- Posts existentes recibieron slugs automáticamente
- No se pierden datos ni referencias

### Admin vs Público

- **URLs públicas**: usan slug (`/post/{slug}`)
- **URLs admin**: siguen usando ID (`/profile/edit/content/posts/{id}/editar`)
- Razón: IDs son más estables para operaciones de edición

## 🧪 Testing Recomendado

1. Verificar que posts existentes tienen slugs
2. Crear nuevo post y validar generación de slug
3. Acceder a post público por slug
4. Verificar contador de vistas funciona
5. Compartir URL en redes y validar preview
6. Editar post y verificar que slug se mantiene

## 📦 Archivos Modificados

```
prisma/
├── schema.prisma                          # Agregado campo slug
└── migrations/
    └── 20251204_add_slug_to_studio_posts.sql

src/
├── lib/
│   ├── utils/
│   │   └── slug-generator.ts             # NUEVO
│   └── actions/
│       └── studio/
│           └── posts/
│               └── posts.actions.ts       # Actualizado
├── types/
│   └── studio-posts.ts                   # Actualizado
├── app/
│   └── [slug]/
│       └── post/
│           └── [postSlug]/               # Renombrado
│               └── page.tsx              # Actualizado
└── components/
    └── profile/
        └── sections/
            └── PostFeedCard.tsx          # Actualizado
```

## 🚀 Deploy

- Aplicar migración en producción
- No requiere downtime (campo nullable inicialmente)
- Backward compatible

## 📚 Referencias

- Migration SQL: `prisma/migrations/20251204_add_slug_to_studio_posts.sql`
- Slug Generator: `src/lib/utils/slug-generator.ts`
- Action: `getStudioPostBySlug()` en `posts.actions.ts`
