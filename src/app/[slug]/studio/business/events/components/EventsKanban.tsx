'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Settings, Archive, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ZenInput } from '@/components/ui/zen';
import { EventKanbanCard } from './EventKanbanCard';
import { EventPipelineConfigModal } from './EventPipelineConfigModal';
import { moveEvent } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventWithContact, EventPipelineStage } from '@/lib/actions/schemas/events-schemas';

interface EventsKanbanProps {
  studioSlug: string;
  events: EventWithContact[];
  pipelineStages: EventPipelineStage[];
  search: string;
  onSearchChange: (search: string) => void;
  onEventMoved: () => void;
  onPipelineStagesUpdated: () => void;
}

export function EventsKanban({
  studioSlug,
  events,
  pipelineStages,
  search: externalSearch,
  onSearchChange,
  onEventMoved,
  onPipelineStagesUpdated,
}: EventsKanbanProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<EventWithContact[]>(events);
  const prevEventsRef = useRef<EventWithContact[]>(events);
  const isDraggingRef = useRef(false);
  const [showArchived, setShowArchived] = useState(false);
  const [localSearch, setLocalSearch] = useState(externalSearch || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local cuando cambian los eventos desde el padre
  useEffect(() => {
    if (isDraggingRef.current) {
      prevEventsRef.current = events;
      return;
    }

    const prevIds = new Set(prevEventsRef.current.map(e => e.id));
    const newIds = new Set(events.map(e => e.id));

    const hasIdChanges =
      prevIds.size !== newIds.size ||
      [...prevIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !prevIds.has(id));

    if (hasIdChanges || localEvents.length === 0) {
      setLocalEvents(events);
    }

    prevEventsRef.current = events;
  }, [events, localEvents.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sincronizar búsqueda externa
  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== localSearch) {
      setLocalSearch(externalSearch);
    }
  }, [externalSearch, localSearch]);

  // Manejar tecla Escape para limpiar búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setLocalSearch('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtrar eventos por búsqueda local
  const filteredEvents = useMemo(() => {
    if (!localSearch.trim()) return localEvents;

    const searchLower = localSearch.toLowerCase();
    return localEvents.filter((e) => {
      const nameMatch = e.name?.toLowerCase().includes(searchLower);
      const contactMatch = e.contact?.name.toLowerCase().includes(searchLower);
      const eventTypeMatch = e.event_type?.name.toLowerCase().includes(searchLower);
      const addressMatch = e.address?.toLowerCase().includes(searchLower);

      return nameMatch || contactMatch || eventTypeMatch || addressMatch;
    });
  }, [localEvents, localSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    searchInputRef.current?.focus();
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  // Ordenar eventos: por fecha de evento
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = new Date(a.event_date).getTime();
      const dateB = new Date(b.event_date).getTime();
      return dateA - dateB; // Más cercana primero
    });
  }, [filteredEvents]);

  // Filtrar stages según toggle de archivados
  const visibleStages = useMemo(() => {
    if (showArchived) {
      return pipelineStages;
    }
    return pipelineStages.filter((stage) => stage.slug !== 'archivado');
  }, [pipelineStages, showArchived]);

  // Agrupar eventos por stage
  const eventsByStage = useMemo(() => {
    const defaultStage = visibleStages
      .filter((s) => s.slug !== 'archivado')
      .sort((a, b) => a.order - b.order)[0];

    return visibleStages.reduce((acc: Record<string, EventWithContact[]>, stage: EventPipelineStage) => {
      acc[stage.id] = sortedEvents.filter((e: EventWithContact) => {
        if (!e.stage_id && defaultStage && stage.id === defaultStage.id) {
          return true;
        }
        return e.stage_id === stage.id;
      });
      return acc;
    }, {} as Record<string, EventWithContact[]>);
  }, [sortedEvents, visibleStages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    isDraggingRef.current = false;

    if (!over || active.id === over.id) return;

    const eventId = active.id as string;
    const newStageId = over.id as string;

    const stage = pipelineStages.find((s: EventPipelineStage) => s.id === newStageId);
    if (!stage) return;

    const evento = localEvents.find((e: EventWithContact) => e.id === eventId);
    if (!evento) {
      toast.error('No se pudo encontrar el evento');
      return;
    }

    const originalStage = evento.stage;

    // Actualización optimista local
    setLocalEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
            ...e,
            stage_id: newStageId,
            stage: {
              id: stage.id,
              name: stage.name,
              slug: stage.slug,
              color: stage.color,
              order: stage.order,
              stage_type: stage.stage_type,
            },
          }
          : e
      )
    );

    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Evento movido exitosamente');
        onEventMoved();
      } else {
        // Revertir actualización optimista
        setLocalEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                ...e,
                stage_id: originalStage?.id || null,
                stage: originalStage,
              }
              : e
          )
        );
        toast.error(result.error || 'Error al mover evento');
      }
    } catch (error) {
      // Revertir actualización optimista
      setLocalEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
              ...e,
              stage_id: originalStage?.id || null,
              stage: originalStage,
            }
            : e
        )
      );
      console.error('Error moviendo evento:', error);
      toast.error('Error al mover evento');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    isDraggingRef.current = true;
  };

  const handleEventClick = (event: EventWithContact) => {
    router.push(`/${studioSlug}/studio/business/events/${event.id}`);
  };

  const activeEvent = activeId
    ? localEvents.find((e: EventWithContact) => e.id === activeId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4 flex-shrink-0">
        <div className="flex-1 w-full relative">
          <div className="relative">
            <ZenInput
              ref={searchInputRef}
              id="search"
              placeholder="Buscar eventos..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={Search}
              iconClassName="h-4 w-4"
              className={localSearch ? 'pr-10' : ''}
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showArchived
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Ocultar' : 'Mostrar'} Archivados
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Pipeline
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1 min-h-0 pb-4">
          {visibleStages.length > 3 ? (
            visibleStages.map((stage: EventPipelineStage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                events={eventsByStage[stage.id] || []}
                onEventClick={handleEventClick}
                studioSlug={studioSlug}
                isFlexible={false}
              />
            ))
          ) : (
            <div className="flex gap-4 flex-1 min-w-0 w-full">
              {visibleStages.map((stage: EventPipelineStage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  events={eventsByStage[stage.id] || []}
                  onEventClick={handleEventClick}
                  studioSlug={studioSlug}
                  isFlexible={true}
                />
              ))}
            </div>
          )}
        </div>

        <DragOverlay style={{ cursor: 'grabbing' }}>
          {activeEvent ? (
            <div className="opacity-90 rotate-2 shadow-2xl">
              <EventKanbanCard event={activeEvent} studioSlug={studioSlug} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de configuración de pipeline */}
      <EventPipelineConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        studioSlug={studioSlug}
        pipelineStages={pipelineStages}
        onSuccess={onPipelineStagesUpdated}
      />
    </div>
  );
}

// Componente para cada columna del Kanban
function KanbanColumn({
  stage,
  events,
  onEventClick,
  studioSlug,
  isFlexible = false,
}: {
  stage: EventPipelineStage;
  events: EventWithContact[];
  onEventClick: (event: EventWithContact) => void;
  studioSlug: string;
  isFlexible?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${isFlexible
        ? 'flex-1 min-w-[280px]'
        : 'w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0'
        } flex flex-col rounded-lg border p-4 h-full overflow-hidden transition-all duration-200 ${isOver ? 'bg-zinc-800/70' : 'bg-zinc-900/50 border-zinc-700'
        }`}
      style={{
        borderColor: isOver ? stage.color : undefined,
        boxShadow: isOver
          ? `0 10px 15px -3px ${stage.color}20, 0 4px 6px -2px ${stage.color}10`
          : undefined,
      }}
    >
      {/* Header de columna */}
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-700"
        style={{ borderBottomColor: stage.color + '40' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium text-white text-sm">{stage.name}</h3>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
          {events.length}
        </span>
      </div>

      {/* Lista de eventos */}
      <div
        className="space-y-3 flex-1 overflow-y-auto min-h-0"
        style={{
          minHeight: events.length === 0 ? '200px' : 'auto',
        }}
      >
        <SortableContext
          items={events.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {events.map((event) => (
            <EventKanbanCard
              key={event.id}
              event={event}
              onClick={onEventClick}
              studioSlug={studioSlug}
            />
          ))}
        </SortableContext>

        {events.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Sin eventos
          </div>
        )}
      </div>
    </div>
  );
}

