"use client";

import { useState, useEffect, useRef } from "react";
import { ContractVariable } from "../types";
import { filterVariables, normalizeVariableKey, formatVariable } from "../utils/variable-utils";

interface UseVariableAutocompleteProps {
  content: string;
  cursorPosition: number;
  variables: ContractVariable[];
  onSelect: (variable: string) => void;
}

export function useVariableAutocomplete({
  content,
  cursorPosition,
  variables,
  onSelect,
}: UseVariableAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detectar @ antes del cursor
  useEffect(() => {
    if (cursorPosition === 0 || !textareaRef.current) {
      setIsOpen(false);
      return;
    }

    const textBeforeCursor = content.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
      setIsOpen(false);
      return;
    }

    // Verificar que no haya espacio después del @
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
      setIsOpen(false);
      return;
    }

    // Obtener query
    const queryText = textAfterAt.trim();
    setQuery(queryText);

    // Calcular posición del dropdown relativa al editor
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const textBeforeAt = textBeforeCursor.substring(0, lastAtIndex);
      
      // Encontrar el contenedor del editor (el div con contentEditable)
      const editorContainer = textarea.closest('.relative') || textarea.parentElement;
      
      if (!editorContainer) return;
      
      // Crear elemento temporal para medir
      const measureDiv = document.createElement("div");
      measureDiv.style.position = "absolute";
      measureDiv.style.visibility = "hidden";
      measureDiv.style.whiteSpace = "pre-wrap";
      measureDiv.style.font = window.getComputedStyle(textarea).font;
      measureDiv.style.width = `${textarea.offsetWidth}px`;
      measureDiv.textContent = textBeforeAt;
      document.body.appendChild(measureDiv);

      const rect = measureDiv.getBoundingClientRect();
      const editorRect = (editorContainer as HTMLElement).getBoundingClientRect();
      const textareaRect = textarea.getBoundingClientRect();

      // Calcular posición relativa al contenedor del editor
      setPosition({
        top: textareaRect.top - editorRect.top + rect.height + 5,
        left: textareaRect.left - editorRect.left + rect.width,
      });

      document.body.removeChild(measureDiv);
    }

    setIsOpen(true);
    setSelectedIndex(0);
  }, [content, cursorPosition]);

  const filteredVariables = filterVariables(variables, query);

  const handleSelect = (variable: ContractVariable) => {
    const normalizedKey = normalizeVariableKey(variable.key);
    const formatted = formatVariable(normalizedKey, "@");
    onSelect(formatted);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredVariables.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredVariables.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredVariables.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        handleSelect(filteredVariables[selectedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return {
    isOpen,
    query,
    filteredVariables,
    selectedIndex,
    position,
    textareaRef,
    handleSelect,
    handleKeyDown,
    setIsOpen,
  };
}

