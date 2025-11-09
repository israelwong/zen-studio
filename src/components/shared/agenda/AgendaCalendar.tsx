'use client';

import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { ZenButton } from '@/components/ui/zen';
import { ZenAvatar, ZenAvatarImage, ZenAvatarFallback } from '@/components/ui/zen/media/ZenAvatar';
import { ExternalLink, Mail, Phone, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatInitials } from '@/lib/actions/utils/formatting';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configurar moment en español
moment.locale('es');

// Configurar localizador con moment
const localizer = momentLocalizer(moment);

interface AgendaCalendarProps {
  events: AgendaItem[];
  onSelectEvent?: (event: AgendaItem) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onViewPromise?: (promiseId: string) => void;
  onViewEvento?: (eventoId: string) => void;
  defaultDate?: Date;
  defaultView?: View;
  view?: View;
  onViewChange?: (view: View) => void;
  className?: string;
}

// Convertir AgendaItem a formato de react-big-calendar
function agendaItemToEvent(item: AgendaItem) {
  const start = new Date(item.date);
  const end = new Date(item.date);

  // Si hay hora, agregarla
  if (item.time) {
    const [hours, minutes] = item.time.split(':').map(Number);
    start.setHours(hours || 0, minutes || 0, 0);
    end.setHours(hours || 0, minutes || 0, 0);
    // Duración por defecto: 1 hora
    end.setHours(end.getHours() + 1);
  } else {
    // Si no hay hora, usar todo el día
    start.setHours(0, 0, 0);
    end.setHours(23, 59, 59);
  }

  return {
    id: item.id,
    title: item.concept || item.contact_name || item.event_name || 'Agendamiento',
    start,
    end,
    resource: item,
  };
}

// Estilos personalizados ZEN
const zenEventStyleGetter = (event: { resource?: AgendaItem }) => {
  const item = event.resource as AgendaItem | undefined;
  const contexto = item?.contexto;
  const isPending = item?.is_pending_date;
  const isConfirmedEvent = item?.is_confirmed_event_date;
  const isExpired = item?.is_expired;
  const hasAgendamiento = !isPending && !isConfirmedEvent && item?.type_scheduling; // Cita (virtual o presencial)

  // 1. Fecha de interés pendiente - Gris (normal) o Rojo (caducada)
  if (isPending) {
    if (isExpired) {
      // Fecha caducada - Rojo
      return {
        style: {
          backgroundColor: '#DC2626', // red-600
          borderColor: '#B91C1C', // red-700
          borderWidth: '2px',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '4px 8px',
          opacity: 0.8,
        },
      };
    }
    // Fecha de interés normal - Gris
    return {
      style: {
        backgroundColor: '#52525B', // zinc-600
        borderColor: '#71717A', // zinc-500
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#D4D4D8', // zinc-300
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '4px 8px',
        opacity: 0.7,
      },
    };
  }

  // 2. Fecha de evento confirmada - Amarillo/Dorado (normal) o Rojo (caducada)
  if (isConfirmedEvent) {
    if (isExpired) {
      // Fecha de evento caducada - Rojo
      return {
        style: {
          backgroundColor: '#DC2626', // red-600
          borderColor: '#B91C1C', // red-700
          borderWidth: '2px',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '4px 8px',
          opacity: 0.8,
        },
      };
    }
    // Fecha de evento normal - Amarillo/Dorado
    return {
      style: {
        backgroundColor: '#EAB308', // yellow-500
        borderColor: '#CA8A04', // yellow-600
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#1C1917', // stone-900 (texto oscuro para contraste)
        fontSize: '0.875rem',
        fontWeight: 600,
        padding: '4px 8px',
      },
    };
  }

  // 3. Cita (virtual o presencial) - Azul con variación según tipo
  if (hasAgendamiento && contexto === 'promise') {
    const isVirtual = item.type_scheduling === 'virtual';
    return {
      style: {
        backgroundColor: isVirtual ? '#8B5CF6' : '#3B82F6', // purple-500 para virtual, blue-500 para presencial
        borderColor: isVirtual ? '#7C3AED' : '#2563EB', // purple-600 para virtual, blue-600 para presencial
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '4px 8px',
      },
    };
  }

  // 4. Evento (no promesa)
  if (contexto === 'evento') {
    return {
      style: {
        backgroundColor: '#10B981', // emerald-500
        borderColor: '#047857', // emerald-700
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '4px 8px',
      },
    };
  }

  // Default: Azul
  return {
    style: {
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: '2px',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '0.875rem',
      fontWeight: 500,
      padding: '4px 8px',
    },
  };
};

// Componente personalizado de evento con HoverCard
const AgendaEventComponent = ({
  event,
  onViewPromise,
  onViewEvento
}: {
  event: { resource?: AgendaItem; title?: string };
  onViewPromise?: (promiseId: string) => void;
  onViewEvento?: (eventoId: string) => void;
}) => {
  const item = event.resource as AgendaItem | undefined;

  if (!item) {
    return <div className="rbc-event-content cursor-pointer w-full h-full">{event.title}</div>;
  }

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.contexto === 'promise' && item.promise_id && onViewPromise) {
      onViewPromise(item.promise_id);
    } else if (item.contexto === 'evento' && item.evento_id && onViewEvento) {
      onViewEvento(item.evento_id);
    }
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="rbc-event-content cursor-pointer w-full h-full relative z-10">
          {event.title ? event.title.charAt(0).toUpperCase() + event.title.slice(1).toLowerCase() : ''}
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        sideOffset={8}
        className="w-80 bg-zinc-900 border-zinc-700 !z-[100]"
      >
        <div className="space-y-3">
          {/* Mensaje para fechas pendientes */}
          {item.is_pending_date && (
            <div className={`rounded-lg p-3 mb-2 ${
              item.is_expired
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-zinc-800/50 border border-zinc-700'
            }`}>
              <p className={`text-xs font-medium ${
                item.is_expired ? 'text-red-400' : 'text-zinc-400'
              }`}>
                {item.is_expired
                  ? 'Fecha caducada - Pendiente de confirmar'
                  : 'Fecha pendiente de confirmar'}
              </p>
            </div>
          )}

          {/* Mensaje para fechas de evento confirmadas */}
          {item.is_confirmed_event_date && (
            <div className={`rounded-lg p-3 mb-2 ${
              item.is_expired
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              <p className={`text-xs font-medium ${
                item.is_expired ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {item.is_expired
                  ? 'Fecha de evento caducada'
                  : 'Fecha de evento confirmada'}
              </p>
            </div>
          )}

          {/* Mensaje para citas */}
          {!item.is_pending_date && !item.is_confirmed_event_date && item.type_scheduling && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
              <p className="text-xs font-medium text-blue-400">
                Cita {item.type_scheduling === 'virtual' ? 'virtual' : 'presencial'}
              </p>
            </div>
          )}

          {/* Avatar y Nombre del contacto */}
          <div className="flex items-center gap-3">
            {item.contact_avatar_url || item.contact_name ? (
              <ZenAvatar className="h-10 w-10 flex-shrink-0">
                {item.contact_avatar_url ? (
                  <ZenAvatarImage
                    src={item.contact_avatar_url}
                    alt={item.contact_name || 'Contacto'}
                  />
                ) : null}
                <ZenAvatarFallback>
                  {item.contact_name ? formatInitials(item.contact_name) : '?'}
                </ZenAvatarFallback>
              </ZenAvatar>
            ) : null}
            {item.contact_name && (
              <div className="font-semibold text-white text-sm">
                {item.contact_name}
              </div>
            )}
          </div>

          {/* Teléfono */}
          {item.contact_phone && (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Phone className="h-3.5 w-3.5 text-zinc-400" />
              <span>{item.contact_phone}</span>
            </div>
          )}

          {/* Correo */}
          {item.contact_email && (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Mail className="h-3.5 w-3.5 text-zinc-400" />
              <span>{item.contact_email}</span>
            </div>
          )}

          {/* Fecha registro */}
          {item.created_at && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                Registro:{' '}
                {new Intl.DateTimeFormat('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(item.created_at))}
              </span>
            </div>
          )}

          {/* Fecha actualización */}
          {item.updated_at && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Actualizado:{' '}
                {new Intl.DateTimeFormat('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(item.updated_at))}
              </span>
            </div>
          )}

          {/* Botón ver promesa/evento */}
          {(item.contexto === 'promise' && item.promise_id) || (item.contexto === 'evento' && item.evento_id) ? (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleViewClick}
              className="w-full text-xs h-7 mt-2"
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              {item.contexto === 'promise' ? 'Ver Promesa' : 'Ver Evento'}
            </ZenButton>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export function AgendaCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onViewPromise,
  onViewEvento,
  defaultDate = new Date(),
  defaultView = 'month',
  view,
  onViewChange,
  className,
}: AgendaCalendarProps) {
  const calendarEvents = useMemo(() => {
    return events.map(agendaItemToEvent);
  }, [events]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const citas = events.filter(
      (item) => item.contexto === 'promise' && !item.is_pending_date && !item.is_confirmed_event_date && item.type_scheduling
    ).length;
    const fechasInteres = events.filter((item) => item.is_pending_date === true).length;
    const fechasEvento = events.filter((item) => item.is_confirmed_event_date === true).length;
    return { citas, fechasInteres, fechasEvento };
  }, [events]);

  // Configurar inicio de semana (lunes) y formatos en español
  const culture = 'es';
  const formats = {
    dayFormat: 'dddd',
    dayHeaderFormat: (date: Date) => moment(date).format('dddd'),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('D MMM')} - ${moment(end).format('D MMM')}`,
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
    monthHeaderFormat: (date: Date) => moment(date).format('MMMM YYYY'),
    weekdayFormat: (date: Date) => moment(date).format('dddd'),
  };

  // Toolbar personalizado: solo botones de vista, sin navegación
  const CustomToolbar = ({
    view,
    onView,
    label,
  }: {
    view: string;
    onView: (view: string) => void;
    label: string;
  }) => {
    const views: Array<'month' | 'week' | 'day' | 'agenda'> = ['month', 'week', 'day', 'agenda'];
    const viewLabels: Record<string, string> = {
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      agenda: 'Agenda',
    };

    return (
      <div className="rbc-toolbar flex items-center justify-between pb-4">
        <div className="rbc-toolbar-label text-left flex-shrink-0">{label}</div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className={`rbc-toolbar-button ${view === v ? 'rbc-active' : ''}`}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-zinc-900 overflow-hidden ${className}`}>
      <div className="h-[600px]">
        <style jsx global>{`
        .rbc-calendar {
          background: rgb(24 24 27);
          color: rgb(228 228 231);
          font-family: inherit;
          border-radius: 0;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        
        /* Bordes generales - zinc-800 (rgb(39 39 42)) */
        .rbc-calendar * {
          border-color: rgb(39 39 42) !important;
        }
        
        .rbc-event {
          position: relative;
          z-index: 2;
        }
        
        /* Contenedor de headers - borde superior completo */
        .rbc-month-view .rbc-row-bg,
        .rbc-month-view .rbc-header {
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-header {
          border-bottom: 1px solid rgb(39 39 42);
          border-top: 1px solid rgb(39 39 42);
          padding: 12px 0px;
          font-weight: 500;
          color: rgb(161 161 170);
          font-size: 0.875rem;
        }
        
        /* Primer header - borde izquierdo */
        .rbc-header:first-child {
          border-left: 1px solid rgb(39 39 42);
        }
        
        /* Último header - borde derecho */
        .rbc-header:last-child {
          border-right: 1px solid rgb(39 39 42);
        }
        
        /* Headers intermedios - sin borde izquierdo para evitar duplicados */
        .rbc-header:not(:first-child) {
          border-left: none;
        }
        
        .rbc-today {
          background-color: rgb(39 39 42);
        }
        
        .rbc-off-range-bg {
          background: rgb(39 39 42);
        }
        
        .rbc-date-cell {
          text-align: right;
          padding: 4px;
        }
        
        .rbc-date-cell > a {
          color: rgb(228 228 231);
        }
        
        .rbc-date-cell.rbc-off-range > a {
          color: rgb(113 113 122);
        }
        
        .rbc-date-cell.rbc-now > a {
          color: rgb(59 130 246);
          font-weight: 600;
        }
        
        .rbc-day-bg {
          border: 1px solid rgb(39 39 42);
        }
        
        /* Vista de mes - cuadrícula */
        .rbc-month-view {
          border: none;
        }
        
        .rbc-month-row {
          border: none;
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-month-row:first-child {
          border-top: none;
        }
        
        .rbc-row {
          border: none;
        }
        
        .rbc-row-segment {
          border: none;
        }
        
        .rbc-selected-cell {
          border-color: rgb(39 39 42);
        }
        
        .rbc-day-slot {
          border: none;
        }
        
        .rbc-time-slot {
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-header-gutter {
          border-right: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-content {
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-header-content {
          border-left: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-view {
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-day-view {
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-week-view {
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-toolbar {
          padding: 0;
          border-bottom: none;
          background: transparent;
        }
        
        .rbc-toolbar button {
          color: rgb(228 228 231);
          background: rgb(39 39 42);
          border: 1px solid rgb(39 39 42);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .rbc-toolbar button:hover {
          background: rgb(63 63 70);
          color: rgb(255 255 255);
          border-color: rgb(63 63 70);
        }
        
        .rbc-toolbar button:active,
        .rbc-toolbar button.rbc-active {
          background: rgb(59 130 246);
          color: rgb(255 255 255);
          border-color: rgb(59 130 246);
        }
        
        .rbc-toolbar-label {
          font-weight: 600;
          color: rgb(255 255 255);
          font-size: 1rem;
          text-align: left !important;
        }
        
        .rbc-event {
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rbc-event:hover {
          opacity: 0.85;
          transform: translateY(-1px);
          border-color: rgb(39 39 42);
        }
        
        .rbc-event-content {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        /* Vista de agenda */
        .rbc-agenda-view table {
          background: rgb(24 24 27);
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-view table thead > tr > th {
          border-bottom: 1px solid rgb(39 39 42);
          border-right: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-view table tbody > tr > td {
          border-color: rgb(39 39 42);
          padding: 12px;
        }
        
        .rbc-agenda-view table tbody > tr > td + td {
          border-left: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-view table tbody > tr {
          border-bottom: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          color: rgb(161 161 170);
        }
        
        .rbc-agenda-event-cell {
          color: rgb(228 228 231);
        }
      `}</style>

        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          defaultDate={defaultDate}
          defaultView={defaultView}
          view={view}
          onView={onViewChange}
          onSelectEvent={onSelectEvent ? (event) => onSelectEvent(event.resource) : undefined}
          onSelectSlot={onSelectSlot}
          selectable={!!onSelectSlot}
          eventPropGetter={zenEventStyleGetter}
          formats={formats}
          culture={culture}
          components={{
            event: (props: { event: { resource?: AgendaItem; title?: string } }) => (
              <AgendaEventComponent
                event={props.event}
                onViewPromise={onViewPromise}
                onViewEvento={onViewEvento}
              />
            ),
            toolbar: (props: {
              view: string;
              onView: (view: string) => void;
              label: string;
            }) => (
              <CustomToolbar
                view={props.view}
                onView={props.onView}
                label={props.label}
              />
            ),
          }}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay agendamientos en este rango',
          }}
        />
      </div>

      {/* Footer con estadísticas */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-zinc-300">
              <span className="font-semibold text-white">{stats.citas}</span> cita{stats.citas !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-500"></div>
            <span className="text-zinc-300">
              <span className="font-semibold text-white">{stats.fechasInteres}</span> fecha{stats.fechasInteres !== 1 ? 's' : ''} de interés
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span className="text-zinc-300">
              <span className="font-semibold text-white">{stats.fechasEvento}</span> fecha{stats.fechasEvento !== 1 ? 's' : ''} de evento
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

