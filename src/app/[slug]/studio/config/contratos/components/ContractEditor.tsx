"use client";

import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { ContractVariable } from "./types";
import { useVariableAutocomplete } from "./hooks/useVariableAutocomplete";
import { VariableAutocomplete } from "./VariableAutocomplete";
import { parseVariables, normalizeVariableKey } from "./utils/variable-utils";
import { VariableBadge } from "./VariableBadge";
import { ContractEditorToolbar } from "./ContractEditorToolbar";
import { ZenCard, ZenCardContent } from "@/components/ui/zen";
import { cn } from "@/lib/utils";

interface ContractEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: ContractVariable[];
  readonly?: boolean;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
}

export interface ContractEditorRef {
  insertVariableAtCursor: (variable: string) => void;
}

export const ContractEditor = forwardRef<ContractEditorRef, ContractEditorProps>(({
  content,
  onChange,
  variables,
  readonly = false,
  placeholder = "Escribe el contenido del contrato... Usa @ para insertar variables",
  className = "",
  showToolbar = false,
}, ref) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariableAtCursor = useCallback(
    (variable: string) => {
      if (!editorRef.current) return;

      // Asegurar que el editor tenga foco
      editorRef.current.focus();

      // Obtener posición actual del cursor
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // Si no hay selección, insertar al final del contenido
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const newSelection = window.getSelection();
        if (newSelection) {
          newSelection.removeAllRanges();
          newSelection.addRange(range);
        }
      }

      const currentSelection = window.getSelection();
      if (!currentSelection || currentSelection.rangeCount === 0) return;

      const range = currentSelection.getRangeAt(0);

      // Si hay texto seleccionado, eliminarlo primero
      if (!range.collapsed) {
        range.deleteContents();
      }

      // Crear el badge de la variable
      const badge = document.createElement('span');
      badge.contentEditable = 'false';
      badge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-400 text-xs font-mono border border-emerald-600/30 variable-badge';
      badge.setAttribute('data-variable', variable);
      badge.textContent = variable;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'ml-1 hover:text-emerald-300 transition-colors variable-remove';
      removeBtn.setAttribute('aria-label', 'Eliminar variable');
      removeBtn.textContent = '×';
      badge.appendChild(removeBtn);

      // Insertar el badge en la posición del cursor
      try {
        range.insertNode(badge);

        // Insertar un espacio después del badge si es necesario
        const textNode = document.createTextNode(' ');
        range.setStartAfter(badge);
        range.collapse(true);
        range.insertNode(textNode);

        // Mover el cursor después del espacio
        range.setStartAfter(textNode);
        range.collapse(true);
        const finalSelection = window.getSelection();
        if (finalSelection) {
          finalSelection.removeAllRanges();
          finalSelection.addRange(range);
        }
      } catch (e) {
        // Si falla, insertar al final
        editorRef.current.appendChild(badge);
        const textNode = document.createTextNode(' ');
        editorRef.current.appendChild(textNode);
      }

      // Disparar evento input para actualizar el contenido
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
    },
    []
  );

  const handleInsertVariable = useCallback(
    (variable: string) => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textBefore = content.substring(0, cursorPosition);
      const lastAtIndex = textBefore.lastIndexOf("@");

      if (lastAtIndex === -1) return;

      const newContent =
        content.substring(0, lastAtIndex) + variable + " " + content.substring(cursorPosition);

      onChange(newContent);

      setTimeout(() => {
        updateEditorContent(newContent);
        // Restaurar cursor
        const newPosition = lastAtIndex + variable.length + 1;
        setCursorPosition(newPosition);
        restoreCursor(newPosition);
      }, 0);
    },
    [content, cursorPosition, onChange]
  );

  useImperativeHandle(ref, () => ({
    insertVariableAtCursor,
  }));

  const cleanHtmlContent = (html: string) => {
    // Eliminar saltos de línea entre tags de cierre y apertura de bloque
    // Pero convertir a <br> para mantener separación visual
    let cleaned = html.replace(/(<\/[^>]+?>)\s*\n\s*(<[^/][^>]+?>)/g, '$1<br>$2');
    // Eliminar saltos de línea entre <li> tags
    cleaned = cleaned.replace(/(<\/li>)\s*\n\s*(<li>)/g, '$1$2');
    return cleaned;
  };

  const updateEditorContent = (newContent: string) => {
    if (!editorRef.current || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    // Si el contenido es HTML, preservarlo directamente
    // Si es texto plano, convertirlo a HTML básico
    let html = newContent;

    // Si no parece HTML (no tiene tags), convertir saltos de línea a <br>
    if (!/<[^>]+>/.test(newContent)) {
      html = newContent.replace(/\n/g, '<br>');
    } else {
      // Limpiar saltos de línea entre tags de bloque y entre <li>
      html = cleanHtmlContent(html);
    }

    // Parsear variables y reemplazarlas con badges
    // Usar DOM para preservar mejor la estructura HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || '';
    const parsedVars = parseVariables(plainText);

    // Si hay variables, reemplazarlas en el DOM preservando estructura
    if (parsedVars.length > 0) {
      parsedVars.forEach((variable) => {
        // Buscar el texto de la variable en el DOM y reemplazarlo con badge
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_TEXT,
          null
        );

        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            if (textNode.textContent?.includes(variable.fullMatch)) {
              textNodes.push(textNode);
            }
          }
        }

        // Reemplazar en cada nodo de texto encontrado
        textNodes.forEach((textNode) => {
          const text = textNode.textContent || '';
          if (text.includes(variable.fullMatch)) {
            const parts = text.split(variable.fullMatch);
            const fragment = document.createDocumentFragment();

            // Verificar si ya está dentro de un badge
            let parent = textNode.parentElement;
            while (parent && parent !== tempDiv) {
              if (parent.classList.contains('variable-badge')) {
                return; // Ya está en un badge, no reemplazar
              }
              parent = parent.parentElement;
            }

            parts.forEach((part, index) => {
              if (part) {
                fragment.appendChild(document.createTextNode(part));
              }
              if (index < parts.length - 1) {
                const badge = document.createElement('span');
                badge.contentEditable = 'false';
                badge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-400 text-xs font-mono border border-emerald-600/30 variable-badge';
                badge.setAttribute('data-variable', variable.fullMatch);
                badge.textContent = variable.fullMatch;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'ml-1 hover:text-emerald-300 transition-colors variable-remove';
                removeBtn.setAttribute('aria-label', 'Eliminar variable');
                removeBtn.textContent = '×';
                badge.appendChild(removeBtn);

                fragment.appendChild(badge);
              }
            });

            textNode.parentNode?.replaceChild(fragment, textNode);
          }
        });
      });

      html = tempDiv.innerHTML;
    }

    // Preservar la selección actual
    const selection = window.getSelection();
    let savedRange: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      try {
        savedRange = selection.getRangeAt(0).cloneRange();
      } catch (e) {
        // Si falla al clonar, no preservar selección
      }
    }

    // Solo actualizar si el HTML realmente cambió
    const currentHtml = editorRef.current.innerHTML;
    if (currentHtml !== html) {
      // Actualizar el HTML (esto puede disparar un evento input, pero isUpdatingRef lo previene)
      editorRef.current.innerHTML = html || '<br>';
    }

    // Restaurar selección si existe
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        // Si falla, simplemente poner el cursor al final
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, "<br>");
  };

  const restoreCursor = (position: number) => {
    if (!editorRef.current) return;

    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) return;

    let charCount = 0;
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.classList.contains('variable-badge')) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (charCount + textLength >= position) {
          range.setStart(node, position - charCount);
          range.setEnd(node, position - charCount);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        charCount += textLength;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.classList.contains('variable-badge')) {
          const varText = el.getAttribute('data-variable') || '';
          if (charCount + varText.length >= position) {
            // Cursor está dentro del badge, moverlo después
            range.setStartAfter(el);
            range.setEndAfter(el);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
          }
          charCount += varText.length;
        }
      }
    }

    // Si no encontramos posición, poner al final
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const isUpdatingRef = useRef(false);
  const lastContentRef = useRef<string>("");

  useEffect(() => {
    // Solo actualizar si el contenido realmente cambió y no estamos en medio de una actualización
    if (isUpdatingRef.current || !editorRef.current) {
      return;
    }

    // Si el contenido no cambió desde la última vez, no hacer nada
    if (content === lastContentRef.current) {
      return;
    }

    const currentHtml = editorRef.current.innerHTML;

    // Normalizar ambos HTMLs para comparar (sin badges, sin espacios extra, sin diferencias de formato de tags)
    const normalizeHtml = (html: string) => {
      return html
        .replace(/<span[^>]*class="[^"]*variable-badge[^"]*"[^>]*>.*?<\/span>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim()
        .toLowerCase();
    };

    const normalizedCurrent = normalizeHtml(currentHtml);
    const normalizedContent = normalizeHtml(content);

    // Solo actualizar si el contenido es realmente diferente
    if (normalizedCurrent !== normalizedContent) {
      // Marcar que estamos actualizando para evitar que handleEditorInput se ejecute
      isUpdatingRef.current = true;
      updateEditorContent(content);
      lastContentRef.current = content;

      // Resetear el flag después de que updateEditorContent termine
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  }, [content]);

  const {
    isOpen,
    query,
    filteredVariables,
    selectedIndex,
    position,
    textareaRef: autocompleteRef,
    handleSelect,
    handleKeyDown,
    setIsOpen,
  } = useVariableAutocomplete({
    content,
    cursorPosition,
    variables,
    onSelect: handleInsertVariable,
  });

  const cleanInlineStyles = (html: string): string => {
    // Crear un elemento temporal para limpiar estilos inline no deseados
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remover estilos inline de elementos que no deberían tenerlos
    // (excepto de los badges que necesitan sus estilos)
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach((el) => {
      // No tocar los badges
      if (el.classList.contains('variable-badge')) {
        return;
      }

      // Remover estilos inline de elementos de formato (h1, h2, strong, etc.)
      // que pueden ser agregados por execCommand
      const tagName = el.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'p', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote'].includes(tagName)) {
        el.removeAttribute('style');
      }
    });

    return tempDiv.innerHTML;
  };

  const handleEditorInput = () => {
    if (!editorRef.current || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    // Extraer HTML del editor directamente (preservando todos los formatos)
    let html = editorRef.current.innerHTML;

    // Limpiar estilos inline no deseados que el navegador pueda agregar
    html = cleanInlineStyles(html);

    // Crear un elemento temporal para procesar
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Reemplazar badges con su texto plano (preservando el HTML alrededor)
    const badges = tempDiv.querySelectorAll('.variable-badge');
    badges.forEach((badge) => {
      const variable = badge.getAttribute('data-variable') || '';
      const textNode = document.createTextNode(variable);
      badge.parentNode?.replaceChild(textNode, badge);
    });

    // Obtener HTML final (con formatos preservados pero variables como texto)
    let finalHtml = tempDiv.innerHTML;

    // Limpiar saltos de línea entre tags de bloque y entre <li>
    finalHtml = cleanHtmlContent(finalHtml);

    // Actualizar contenido con HTML preservado solo si cambió realmente
    // Comparar normalizado para evitar cambios mínimos
    const normalizeForCompare = (html: string) => {
      return html
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
    };

    const normalizedFinal = normalizeForCompare(finalHtml);
    const normalizedContent = normalizeForCompare(content);

    if (normalizedFinal !== normalizedContent) {
      // Actualizar la referencia ANTES de llamar onChange para evitar que useEffect se ejecute
      lastContentRef.current = finalHtml;
      onChange(finalHtml);
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);

    // Actualizar posición del cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let pos = 0;
      const walker = document.createTreeWalker(
        editorRef.current!,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node === range.endContainer) {
          if (node.nodeType === Node.TEXT_NODE) {
            pos += range.endOffset;
          }
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          pos += node.textContent?.length || 0;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.classList.contains('variable-badge')) {
            pos += el.getAttribute('data-variable')?.length || 0;
          } else if (el.tagName === 'BR') {
            pos += 1;
          }
        }
      }
      setCursorPosition(pos);
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Si click en botón de eliminar variable
    if (target.classList.contains('variable-remove') || target.closest('.variable-remove')) {
      e.preventDefault();
      e.stopPropagation();
      const button = target.classList.contains('variable-remove')
        ? target
        : target.closest('.variable-remove') as HTMLElement;
      const start = parseInt(button.getAttribute('data-start') || '0');
      const end = parseInt(button.getAttribute('data-end') || '0');

      const newContent = content.substring(0, start) + content.substring(end);
      onChange(newContent);

      setTimeout(() => {
        setCursorPosition(start);
        restoreCursor(start);
      }, 0);
      return;
    }

    // Actualizar posición del cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let pos = 0;
      const walker = document.createTreeWalker(
        editorRef.current!,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node === range.endContainer) {
          if (node.nodeType === Node.TEXT_NODE) {
            pos += range.endOffset;
          }
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          pos += node.textContent?.length || 0;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.classList.contains('variable-badge')) {
            pos += el.getAttribute('data-variable')?.length || 0;
          } else if (el.tagName === 'BR') {
            pos += 1;
          }
        }
      }
      setCursorPosition(pos);
    }
  };

  const handleKeyDownCombined = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isOpen) {
      handleKeyDown(e);
    }
  };

  const handleSelectVariable = (variable: ContractVariable) => {
    handleSelect(variable);
  };

  const parsedVariables = parseVariables(content);

  return (
    <div className={cn("relative", className)}>
      <ZenCard variant="default" className="h-full flex flex-col relative">
        <ZenCardContent className="p-0 flex flex-col flex-1 min-h-0">
          {!readonly && showToolbar && (
            <ContractEditorToolbar editorRef={editorRef} />
          )}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* Textarea oculto para autocompletado */}
            <textarea
              ref={(node) => {
                textareaRef.current = node;
                autocompleteRef.current = node;
              }}
              value={content}
              onChange={() => { }}
              onKeyDown={(e) => handleKeyDownCombined(e as any)}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
            />

            {/* Editor visual con badges */}
            <div
              ref={editorRef}
              contentEditable={!readonly}
              onInput={handleEditorInput}
              onClick={handleEditorClick}
              onKeyDown={handleKeyDownCombined}
              className={cn(
                "w-full h-full text-sm bg-zinc-950 text-zinc-300",
                "border-0 rounded-none focus-visible:ring-0 focus-visible:outline-none",
                "resize-none p-4 overflow-y-auto",
                "scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent",
                "contract-editor-content",
                !content && "text-zinc-600",
                readonly && "cursor-default"
              )}
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              data-placeholder={placeholder}
            />

            {!readonly && (
              <VariableAutocomplete
                isOpen={isOpen}
                variables={filteredVariables}
                selectedIndex={selectedIndex}
                position={position}
                onSelect={handleSelectVariable}
                onClose={() => setIsOpen(false)}
              />
            )}
          </div>

          {!readonly && (
            <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800 shrink-0">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <div className="flex items-center gap-4">
                  <span>{content.length} caracteres</span>
                  {parsedVariables.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{parsedVariables.length} variables</span>
                    </>
                  )}
                </div>
                <div>
                  <span className="text-emerald-400">
                    Tip: Escribe @ para insertar variables
                  </span>
                </div>
              </div>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <style dangerouslySetInnerHTML={{
        __html: `
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(82, 82, 91);
        }
        .variable-badge button {
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
        .contract-editor-content h1 {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          color: rgb(244, 244, 245) !important;
        }
        .contract-editor-content h1:first-child {
          margin-top: 0 !important;
        }
        .contract-editor-content h2 {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          color: rgb(244, 244, 245) !important;
        }
        .contract-editor-content h2:first-child {
          margin-top: 0 !important;
        }
        .contract-editor-content p {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          line-height: 1.6 !important;
        }
        .contract-editor-content p:first-child {
          margin-top: 0 !important;
        }
        .contract-editor-content strong,
        .contract-editor-content b {
          font-weight: 600 !important;
          color: rgb(244, 244, 245) !important;
        }
        .contract-editor-content em,
        .contract-editor-content i {
          font-style: italic !important;
        }
        .contract-editor-content ul,
        .contract-editor-content ol {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-left: 1.5rem !important;
          list-style-position: outside !important;
        }
        .contract-editor-content ul {
          list-style-type: disc !important;
        }
        .contract-editor-content ol {
          list-style-type: decimal !important;
        }
        .contract-editor-content li {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          line-height: 1.5 !important;
          display: list-item !important;
          padding-left: 0.5rem !important;
        }
        .contract-editor-content blockquote {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          padding-left: 1rem !important;
          border-left: 3px solid rgb(82, 82, 91) !important;
          color: rgb(161, 161, 170) !important;
          font-style: italic !important;
        }
        .contract-editor-content blockquote:first-child {
          margin-top: 0 !important;
        }
        `
      }} />
    </div>
  );
});

ContractEditor.displayName = "ContractEditor";
