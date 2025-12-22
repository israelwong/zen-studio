# Problema: Estilos no se aplican visualmente en el editor de contratos

## Descripción del Problema

Cuando el usuario selecciona texto y aplica un formato desde el toolbar (H1, H2, Bold, Italic, Listas, etc.), el formato **NO se muestra visualmente** en el editor, aunque el HTML sí se está modificando correctamente.

## Comportamiento Esperado

1. Usuario selecciona texto o coloca el cursor
2. Usuario hace clic en un botón del toolbar (ej: H1, Bold, Lista)
3. **El texto seleccionado debe cambiar visualmente**:
   - H1: Texto grande y en negrita
   - H2: Texto mediano y seminegrita
   - Bold: Texto en negrita
   - Italic: Texto en cursiva
   - Listas: Viñetas o números visibles
   - Blockquote: Borde izquierdo y estilo de cita

## Comportamiento Actual

1. Usuario selecciona texto o coloca el cursor
2. Usuario hace clic en un botón del toolbar
3. El HTML se modifica correctamente (se puede verificar en DevTools)
4. **PERO el texto NO cambia visualmente** en el editor
5. El toolbar SÍ detecta el formato activo (se ilumina el botón)

## Archivos Involucrados

- `/src/app/[slug]/studio/config/contratos/components/ContractEditor.tsx`
- `/src/app/[slug]/studio/config/contratos/components/ContractEditorToolbar.tsx`

## Análisis Técnico

### Flujo Actual

1. **Toolbar aplica formato** (`ContractEditorToolbar.tsx`):
   - Usa `document.execCommand("formatBlock", false, "<h1>")` o similar
   - Dispara evento `input` manualmente: `editorRef.current.dispatchEvent(new Event('input', { bubbles: true }))`

2. **Editor recibe input** (`ContractEditor.tsx` - `handleEditorInput`):
   - Extrae HTML: `let html = editorRef.current.innerHTML`
   - Procesa badges de variables
   - Llama `onChange(finalHtml)`

3. **useEffect actualiza editor** (`ContractEditor.tsx` - línea 278):
   - Escucha cambios en `content`
   - Llama `updateEditorContent(content)`
   - **PROBLEMA**: `updateEditorContent` reemplaza `innerHTML` completo, lo que puede estar perdiendo los formatos

### Problema Identificado

El ciclo de actualización está interfiriendo:

```
Aplicar formato → input event → onChange → content cambia → useEffect → updateEditorContent → innerHTML se reemplaza
```

El `updateEditorContent` está:
1. Procesando el HTML para reemplazar variables con badges
2. Reemplazando el `innerHTML` completo
3. Esto puede estar perdiendo los formatos recién aplicados o no preservándolos correctamente

### Estilos CSS

Los estilos SÍ están definidos en el componente (líneas 527-607):
- `.contract-editor-content h1`, `.contract-editor-content h2`, etc.
- Usa `<style jsx>` (Next.js styled-jsx)

**Posible problema**: Los estilos pueden no estar aplicándose correctamente o el `innerHTML` se está reemplazando antes de que los estilos se apliquen.

## Soluciones Propuestas

### Opción 1: Prevenir actualización innecesaria
- Mejorar la comparación en `useEffect` para evitar reemplazar `innerHTML` cuando el contenido no cambió realmente
- Ya existe una comparación (línea 278-285) pero puede necesitar mejoras

### Opción 2: Preservar formatos en updateEditorContent
- Asegurar que `updateEditorContent` preserve todos los tags HTML de formato (h1, h2, strong, em, ul, ol, li, blockquote)
- Actualmente preserva HTML pero puede estar perdiendo formatos durante el procesamiento de variables

### Opción 3: Usar MutationObserver
- En lugar de reemplazar `innerHTML`, usar MutationObserver para detectar cambios y actualizar solo lo necesario
- Más complejo pero más preciso

### Opción 4: Verificar styled-jsx
- Verificar que `<style jsx>` esté funcionando correctamente en Next.js App Router
- Puede necesitar cambiar a `<style dangerouslySetInnerHTML>` o CSS modules

## Pasos para Reproducir

1. Abrir editor de contratos
2. Escribir texto: "Título de prueba"
3. Seleccionar el texto
4. Hacer clic en botón H1 del toolbar
5. **Resultado esperado**: Texto se ve grande y en negrita
6. **Resultado actual**: Texto se ve igual, pero en DevTools se ve `<h1>Título de prueba</h1>`

## Notas Adicionales

- El toolbar SÍ detecta correctamente los formatos activos
- El HTML se está generando correctamente
- El problema es puramente visual en el editor
- El preview SÍ muestra los estilos correctamente

## Prioridad

**ALTA** - El editor es inutilizable si los usuarios no pueden ver los formatos que están aplicando.

