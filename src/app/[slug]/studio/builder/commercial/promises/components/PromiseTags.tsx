'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Settings2, Trash2 } from 'lucide-react';
import { ZenInput, ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { toast } from 'sonner';
import {
  getPromiseTagsByPromiseId,
  createOrFindTagAndAddToPromise,
  removeTagFromPromise,
  getPromiseTags,
  createPromiseTag,
  updatePromiseTag,
  deletePromiseTag,
  addTagToPromise as addTagToPromiseAction,
} from '@/lib/actions/studio/builder/commercial/promises';
import type { PromiseTag, UpdatePromiseTagData } from '@/lib/actions/studio/builder/commercial/promises/promise-tags.actions';

interface PromiseTagsProps {
  studioSlug: string;
  promiseId: string | null;
  isSaved: boolean;
}

interface TagWithPending extends PromiseTag {
  isPending?: boolean;
  tempId?: string;
}

export function PromiseTags({
  studioSlug,
  promiseId,
  isSaved,
}: PromiseTagsProps) {
  const [tags, setTags] = useState<TagWithPending[]>([]);
  const [globalTags, setGlobalTags] = useState<PromiseTag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isAddingTags, setIsAddingTags] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PromiseTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Cargar tags de la promesa
  const loadTags = useCallback(async () => {
    if (!promiseId) {
      setTags([]);
      return;
    }

    try {
      setIsLoadingTags(true);
      const result = await getPromiseTagsByPromiseId(promiseId);
      if (result.success && result.data) {
        setTags(result.data);
      } else {
        setTags([]);
      }
    } catch (error) {
      console.error('Error cargando tags:', error);
      setTags([]);
    } finally {
      setIsLoadingTags(false);
    }
  }, [promiseId]);

  // Cargar tags globales
  const loadGlobalTags = useCallback(async () => {
    try {
      const result = await getPromiseTags(studioSlug);
      if (result.success && result.data) {
        setGlobalTags(result.data);
      }
    } catch (error) {
      console.error('Error cargando tags globales:', error);
    }
  }, [studioSlug]);

  // Actualizar tag localmente (sin recargar)
  const updateTagLocally = useCallback((updatedTag: PromiseTag) => {
    // Actualizar en tags asignados
    setTags((prev) =>
      prev.map((tag) => (tag.id === updatedTag.id ? { ...tag, ...updatedTag } : tag))
    );
    // Actualizar en tags globales (para sugerencias)
    setGlobalTags((prev) =>
      prev.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
    );
  }, []);

  // Eliminar tag localmente
  const removeTagLocally = useCallback((tagId: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
    setGlobalTags((prev) => prev.filter((tag) => tag.id !== tagId));
  }, []);

  useEffect(() => {
    if (isSaved && promiseId) {
      loadTags();
      loadGlobalTags();
    } else {
      setTags([]);
    }
  }, [isSaved, promiseId, loadTags, loadGlobalTags]);

  // Filtrar sugerencias basadas en input
  useEffect(() => {
    // Si el input contiene "/", mostrar todas las etiquetas disponibles (o filtrar si hay texto después)
    if (inputValue.includes('/')) {
      const textAfterSlash = inputValue.split('/')[1]?.toLowerCase() || '';
      const allAvailable = globalTags.filter(
        (tag) =>
          !tags.some((t) => t.id === tag.id && !t.isPending) &&
          (textAfterSlash === '' || tag.name.toLowerCase().includes(textAfterSlash))
      );
      setSuggestions(allAvailable);
      setShowSuggestions(allAvailable.length > 0);
      setSelectedIndex(-1);
      return;
    }

    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    const searchTerm = inputValue.toLowerCase();
    const filtered = globalTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(searchTerm) &&
        !tags.some((t) => t.id === tag.id && !t.isPending)
    );

    setSuggestions(filtered.slice(0, 5));
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [inputValue, globalTags, tags]);

  // Scroll al item seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionItemsRef.current[selectedIndex]) {
      suggestionItemsRef.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Procesar input: separar por coma
  const processInput = useCallback((value: string): string[] => {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }, []);

  // Agregar tags
  const handleAddTags = useCallback(async () => {
    if (!promiseId || !inputValue.trim() || isAddingTags) return;

    const tagNames = processInput(inputValue);
    if (tagNames.length === 0) return;

    // Verificar duplicados antes de agregar
    const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
    const newTagNames = tagNames.filter((name) => !existingNames.has(name.toLowerCase()));

    if (newTagNames.length === 0) {
      toast.info('Las etiquetas ya están asignadas');
      setInputValue('');
      return;
    }

    setIsAddingTags(true);
    const inputToClear = inputValue;
    setInputValue('');

    // Crear tags temporales inmediatamente (actualización optimista)
    const tempTags: TagWithPending[] = newTagNames.map((name, index) => ({
      id: `temp-${Date.now()}-${index}`,
      tempId: `temp-${Date.now()}-${index}`,
      studio_id: '',
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      color: '#3B82F6',
      description: null,
      order: 0,
      is_active: true,
      isPending: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    // Agregar tags temporales inmediatamente
    setTags((prev) => [...prev, ...tempTags]);

    try {
      const results = await Promise.all(
        newTagNames.map((tagName) =>
          createOrFindTagAndAddToPromise(studioSlug, promiseId, tagName)
        )
      );

      const successfulTags: PromiseTag[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.success && result.data) {
          successfulTags.push(result.data);
        } else {
          console.error(`Error agregando tag "${newTagNames[index]}":`, result.error);
          errors.push(newTagNames[index]);
        }
      });

      // Reemplazar tags temporales con los reales
      setTags((prev) => {
        // Remover todos los tags temporales (exitosos y fallidos)
        const withoutTemp = prev.filter((t) => !t.isPending);

        // Agregar tags reales exitosos
        const existingIds = new Set(withoutTemp.map((t) => t.id));
        const newRealTags = successfulTags.filter((t) => !existingIds.has(t.id));

        return [...withoutTemp, ...newRealTags];
      });

      if (errors.length > 0) {
        toast.error(`${errors.length} etiqueta(s) no se pudieron agregar`);
      } else if (successfulTags.length > 0) {
        toast.success(`${successfulTags.length} etiqueta(s) agregada(s)`);
      }
    } catch (error) {
      console.error('Error agregando tags:', error);
      // Remover todos los tags temporales en caso de error
      setTags((prev) => prev.filter((t) => !t.isPending));
      toast.error('Error al agregar etiquetas');
      setInputValue(inputToClear);
    } finally {
      setIsAddingTags(false);
    }
  }, [promiseId, inputValue, studioSlug, processInput, tags, isAddingTags]);

  // Eliminar tag
  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      if (!promiseId) return;

      const tagToRemove = tags.find((t) => t.id === tagId);
      if (!tagToRemove) return;

      // Actualización optimista
      setTags((prev) => prev.filter((t) => t.id !== tagId));

      try {
        const result = await removeTagFromPromise(promiseId, tagId);
        if (!result.success) {
          // Rollback
          setTags((prev) => {
            const exists = prev.find((t) => t.id === tagId);
            if (!exists) {
              return [...prev, tagToRemove].sort((a, b) =>
                a.created_at.getTime() - b.created_at.getTime()
              );
            }
            return prev;
          });
          toast.error(result.error || 'Error al eliminar etiqueta');
        }
      } catch (error) {
        console.error('Error eliminando tag:', error);
        // Rollback
        setTags((prev) => {
          const exists = prev.find((t) => t.id === tagId);
          if (!exists) {
            return [...prev, tagToRemove].sort((a, b) =>
              a.created_at.getTime() - b.created_at.getTime()
            );
          }
          return prev;
        });
        toast.error('Error al eliminar etiqueta');
      }
    },
    [promiseId, tags]
  );

  // Seleccionar sugerencia
  const handleSelectSuggestion = useCallback(
    (tag: PromiseTag) => {
      if (!promiseId || isAddingTags) return;

      const alreadyAssigned = tags.some((t) => t.id === tag.id && !t.isPending);
      if (alreadyAssigned) {
        toast.info('Esta etiqueta ya está asignada');
        setInputValue((prev) => prev.replace('/', ''));
        setShowSuggestions(false);
        setSelectedIndex(-1);
        return;
      }

      setInputValue((prev) => prev.replace('/', ''));
      setShowSuggestions(false);
      setSelectedIndex(-1);

      // Crear tag temporal con estado pending (mismo comportamiento que tags nuevos)
      const tempTag: TagWithPending = {
        ...tag,
        isPending: true,
        tempId: `temp-${Date.now()}`,
      };

      // Agregar tag temporal inmediatamente
      setTags((prev) => [...prev, tempTag]);
      setIsAddingTags(true);

      // Agregar tag a la promesa
      addTagToPromiseAction(promiseId, tag.id)
        .then((result) => {
          if (result.success) {
            // Reemplazar tag temporal con el real
            setTags((prev) => {
              const withoutTemp = prev.filter((t) => !t.isPending || t.tempId !== tempTag.tempId);
              return [...withoutTemp, tag];
            });
            toast.success('Etiqueta agregada');
          } else {
            // Remover tag temporal en caso de error
            setTags((prev) => prev.filter((t) => !t.isPending || t.tempId !== tempTag.tempId));
            toast.error(result.error || 'Error al agregar etiqueta');
          }
        })
        .catch((error) => {
          console.error('Error agregando tag:', error);
          // Remover tag temporal en caso de error
          setTags((prev) => prev.filter((t) => !t.isPending || t.tempId !== tempTag.tempId));
          toast.error('Error al agregar etiqueta');
        })
        .finally(() => {
          setIsAddingTags(false);
        });
    },
    [promiseId, tags, isAddingTags]
  );

  // Manejar navegación con teclado
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Detectar "/" para mostrar todas las etiquetas
      if (e.key === '/' && !inputValue.includes('/')) {
        e.preventDefault();
        setInputValue((prev) => prev + '/');
        return;
      }

      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev < suggestions.length - 1 ? prev + 1 : 0;
            return next;
          });
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : suggestions.length - 1;
            return next;
          });
          return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[selectedIndex]);
            return;
          }
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          // Limpiar "/" si está presente
          if (inputValue.includes('/')) {
            setInputValue((prev) => prev.replace('/', ''));
          }
          return;
        }
      }

      // Enter normal si no hay sugerencias o no hay selección
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (inputValue.trim() && !inputValue.includes('/')) {
          handleAddTags();
        }
      }
    },
    [inputValue, handleAddTags, showSuggestions, suggestions, selectedIndex, handleSelectSuggestion]
  );

  if (!isSaved || !promiseId) {
    return null;
  }

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Etiquetas
            </ZenCardTitle>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => setIsManageModalOpen(true)}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="space-y-3">
            {/* Input para agregar tags */}
            <div className="relative">
              <ZenInput
                ref={inputRef}
                placeholder="Ingresa etiquetas separadas por coma"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                disabled={isLoadingTags || isAddingTags}
                className="text-sm"
              />
              {/* Sugerencias de autocompletado */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {suggestions.map((tag, index) => (
                    <button
                      key={tag.id}
                      ref={(el) => {
                        suggestionItemsRef.current[index] = el;
                      }}
                      type="button"
                      onClick={() => handleSelectSuggestion(tag)}
                      className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 ${selectedIndex === index
                        ? 'bg-emerald-500/20 border-l-2 border-emerald-500'
                        : 'hover:bg-zinc-700'
                        }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-zinc-300">{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Instrucción */}
            <p className="text-xs font-normal leading-normal text-zinc-500 mt-1">
              Usa / para listar todas las etiquetas
            </p>

            {/* Lista de tags */}
            {isLoadingTags ? (
              <div className="flex flex-wrap gap-2">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 animate-pulse"
                  >
                    <div className="h-4 w-16 bg-zinc-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {[...tags]
                  .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
                  .map((tag) => {
                    const isPending = tag.isPending || tag.id.startsWith('temp-');
                    return (
                      <div
                        key={tag.tempId || tag.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity ${isPending ? 'opacity-70 animate-pulse' : ''
                          }`}
                        style={{
                          backgroundColor: `${tag.color}20`,
                          border: `1px solid ${tag.color}40`,
                          color: tag.color,
                        }}
                      >
                        {isPending && (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-0.5" />
                        )}
                        <span>{tag.name}</span>
                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag.id)}
                            className="ml-0.5 hover:opacity-70 transition-opacity"
                            aria-label={`Eliminar etiqueta ${tag.name}`}
                            disabled={isAddingTags}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-4 text-zinc-500 text-sm">
                No hay etiquetas asignadas
              </div>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal de gestión de tags */}
      <TagsManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        studioSlug={studioSlug}
        onTagsUpdated={loadGlobalTags}
        onTagUpdated={updateTagLocally}
        onTagDeleted={removeTagLocally}
      />
    </>
  );
}

// Modal de gestión de tags
interface TagsManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onTagsUpdated: () => void;
  onTagUpdated?: (tag: PromiseTag) => void;
  onTagDeleted?: (tagId: string) => void;
}

function TagsManageModal({
  isOpen,
  onClose,
  studioSlug,
  onTagsUpdated,
  onTagUpdated,
  onTagDeleted,
}: TagsManageModalProps) {
  const [tags, setTags] = useState<(PromiseTag & { isPending?: boolean; tempId?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<PromiseTag | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isCreatingTags, setIsCreatingTags] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string; usageCount: number } | null>(null);
  const [isDeletingTag, setIsDeletingTag] = useState(false);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPromiseTags(studioSlug);
      if (result.success && result.data) {
        setTags(result.data);
      }
    } catch (error) {
      console.error('Error cargando tags:', error);
      toast.error('Error al cargar etiquetas');
    } finally {
      setIsLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen, loadTags]);

  // Procesar input: separar por coma
  const processInput = useCallback((value: string): string[] => {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }, []);

  const handleCreateTags = useCallback(async () => {
    if (!newTagInput.trim() || isCreatingTags) return;

    const tagNames = processInput(newTagInput);
    if (tagNames.length === 0) {
      toast.error('Ingresa al menos una etiqueta');
      return;
    }

    // Verificar duplicados
    const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
    const newTagNames = tagNames.filter((name) => !existingNames.has(name.toLowerCase()));

    if (newTagNames.length === 0) {
      toast.info('Todas las etiquetas ya existen');
      setNewTagInput('');
      return;
    }

    setIsCreatingTags(true);
    const inputToClear = newTagInput;
    setNewTagInput('');

    // Crear tags temporales inmediatamente (actualización optimista)
    const tempTags = newTagNames.map((name, index) => ({
      id: `temp-${Date.now()}-${index}`,
      tempId: `temp-${Date.now()}-${index}`,
      studio_id: '',
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      color: newTagColor,
      description: null,
      order: 0,
      is_active: true,
      isPending: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    // Agregar tags temporales inmediatamente
    setTags((prev) => [...prev, ...tempTags]);

    try {
      const results = await Promise.all(
        newTagNames.map((tagName) =>
          createPromiseTag(studioSlug, {
            name: tagName,
            color: newTagColor,
            order: 0,
          })
        )
      );

      const successfulTags: PromiseTag[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.success && result.data) {
          successfulTags.push(result.data);
        } else {
          console.error(`Error creando tag "${newTagNames[index]}":`, result.error);
          errors.push(newTagNames[index]);
        }
      });

      // Reemplazar tags temporales con los reales
      setTags((prev) => {
        // Remover todos los tags temporales
        const withoutTemp = prev.filter((t) => !t.isPending);

        // Agregar tags reales exitosos
        const existingIds = new Set(withoutTemp.map((t) => t.id));
        const newRealTags = successfulTags.filter((t) => !existingIds.has(t.id));

        return [...withoutTemp, ...newRealTags];
      });

      if (errors.length > 0) {
        toast.error(`${errors.length} etiqueta(s) no se pudieron crear`);
      } else if (successfulTags.length > 0) {
        toast.success(`${successfulTags.length} etiqueta(s) creada(s)`);
        onTagsUpdated();
      }
    } catch (error) {
      console.error('Error creando tags:', error);
      // Remover todos los tags temporales en caso de error
      setTags((prev) => prev.filter((t) => !t.isPending));
      toast.error('Error al crear etiquetas');
      setNewTagInput(inputToClear);
    } finally {
      setIsCreatingTags(false);
    }
  }, [newTagInput, newTagColor, tags, processInput, studioSlug, onTagsUpdated, isCreatingTags]);

  // Manejar Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (newTagInput.trim()) {
          handleCreateTags();
        }
      }
    },
    [newTagInput, handleCreateTags]
  );

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    const tagToUpdate = { ...editingTag };
    setEditingTag(null);

    // Actualización optimista local
    setTags((prev) =>
      prev.map((tag) =>
        tag.id === tagToUpdate.id ? { ...tag, name: tagToUpdate.name, color: tagToUpdate.color } : tag
      )
    );

    try {
      const data: UpdatePromiseTagData = {
        id: tagToUpdate.id,
        name: tagToUpdate.name,
        color: tagToUpdate.color,
      };

      const result = await updatePromiseTag(studioSlug, data);
      if (result.success && result.data) {
        toast.success('Etiqueta actualizada');
        // Actualizar con datos del servidor
        setTags((prev) =>
          prev.map((tag) => (tag.id === result.data!.id ? result.data! : tag))
        );
        // Notificar al componente principal
        if (onTagUpdated) {
          onTagUpdated(result.data);
        }
        onTagsUpdated();
      } else {
        // Rollback en caso de error
        setTags((prev) =>
          prev.map((tag) => (tag.id === tagToUpdate.id ? tagToUpdate : tag))
        );
        toast.error(result.error || 'Error al actualizar etiqueta');
      }
    } catch (error) {
      console.error('Error actualizando tag:', error);
      // Rollback
      setTags((prev) =>
        prev.map((tag) => (tag.id === tagToUpdate.id ? tagToUpdate : tag))
      );
      toast.error('Error al actualizar etiqueta');
    }
  };

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    const usageCount = tag.usage_count || 0;

    // Si no hay uso, eliminar directamente sin confirmación
    if (usageCount === 0) {
      performDeleteTag(tagId, tag);
      return;
    }

    // Si hay uso, mostrar confirmación
    setTagToDelete({
      id: tagId,
      name: tag.name,
      usageCount,
    });
  };

  const performDeleteTag = async (tagId: string, tagToDelete: PromiseTag & { isPending?: boolean; tempId?: string }) => {
    setIsDeletingTag(true);

    // Actualización optimista local
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));

    try {
      const result = await deletePromiseTag(studioSlug, tagId);
      if (result.success) {
        toast.success('Etiqueta eliminada');
        // Notificar al componente principal
        if (onTagDeleted) {
          onTagDeleted(tagId);
        }
        onTagsUpdated();
        setTagToDelete(null);
      } else {
        // Rollback en caso de error
        setTags((prev) => [...prev, tagToDelete].sort((a, b) => a.name.localeCompare(b.name)));
        toast.error(result.error || 'Error al eliminar etiqueta');
        setTagToDelete(null);
      }
    } catch (error) {
      console.error('Error eliminando tag:', error);
      // Rollback
      setTags((prev) => [...prev, tagToDelete].sort((a, b) => a.name.localeCompare(b.name)));
      toast.error('Error al eliminar etiqueta');
      setTagToDelete(null);
    } finally {
      setIsDeletingTag(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!tagToDelete || isDeletingTag) return;
    const tag = tags.find((t) => t.id === tagToDelete.id);
    if (!tag) return;
    performDeleteTag(tagToDelete.id, tag);
  };

  const handleCloseDeleteModal = () => {
    if (!isDeletingTag) {
      setTagToDelete(null);
    }
  };

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ];

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Gestionar Etiquetas"
      description="Crea, edita y elimina etiquetas globales reutilizables"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Crear nuevas etiquetas */}
        <div className="space-y-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300">Crear etiquetas</h3>
          <div className="flex gap-2">
            <ZenInput
              placeholder="Agregar etiquetas separadas por coma (Enter para agregar)"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreatingTags}
              className="flex-1"
            />
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${newTagColor === color ? 'border-white scale-110' : 'border-zinc-600'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lista de etiquetas */}
        {isLoading ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...Array(4)].map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 animate-pulse"
              >
                <div className="w-4 h-4 rounded-full bg-zinc-700 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-4 bg-zinc-700 rounded w-24" />
                  <div className="h-5 bg-zinc-700 rounded-full w-16" />
                </div>
                <div className="h-8 w-16 bg-zinc-700 rounded" />
                <div className="h-8 w-16 bg-zinc-700 rounded" />
              </div>
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No hay etiquetas creadas
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tags
              .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
              .map((tag) => {
                const isPending = tag.isPending || tag.id.startsWith('temp-');
                return (
                  <div
                    key={tag.tempId || tag.id}
                    className={`flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 transition-opacity ${isPending ? 'opacity-70' : ''
                      }`}
                  >
                    {isPending && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent flex-shrink-0" />
                    )}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {editingTag?.id === tag.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <ZenInput
                          value={editingTag.name}
                          onChange={(e) =>
                            setEditingTag({ ...editingTag, name: e.target.value })
                          }
                          className="flex-1"
                        />
                        <div className="flex gap-1">
                          {colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingTag({ ...editingTag, color })}
                              className={`w-6 h-6 rounded-full border transition-all ${editingTag.color === color ? 'border-white scale-110' : 'border-zinc-600'
                                }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <ZenButton
                          size="sm"
                          onClick={handleUpdateTag}
                        >
                          Guardar
                        </ZenButton>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTag(null)}
                        >
                          Cancelar
                        </ZenButton>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm text-zinc-300">{tag.name}</span>
                          {tag.usage_count !== undefined && tag.usage_count > 0 && (
                            <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">
                              {tag.usage_count} {tag.usage_count === 1 ? 'promesa' : 'promesas'}
                            </span>
                          )}
                        </div>
                        {!isPending && (
                          <>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTag(tag)}
                              disabled={isCreatingTags}
                            >
                              Editar
                            </ZenButton>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTag(tag.id)}
                              className="text-red-400 hover:text-red-300"
                              disabled={isCreatingTags}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ZenButton>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={!!tagToDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar etiqueta"
        description={
          tagToDelete
            ? `¿Estás seguro de eliminar la etiqueta "${tagToDelete.name}"? Se eliminará de ${tagToDelete.usageCount} ${tagToDelete.usageCount === 1 ? 'promesa' : 'promesas'}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeletingTag}
        disabled={isDeletingTag}
      />
    </ZenDialog>
  );
}

