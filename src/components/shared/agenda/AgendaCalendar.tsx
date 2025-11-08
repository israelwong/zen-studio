'use client';

import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
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
  defaultDate?: Date;
  defaultView?: View;
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

  let backgroundColor = '#3B82F6'; // Azul por defecto
  let borderColor = '#2563EB';

  if (contexto === 'promise') {
    backgroundColor = '#3B82F6'; // Azul para promises
    borderColor = '#2563EB';
  } else if (contexto === 'evento') {
    backgroundColor = '#10B981'; // Verde para eventos
    borderColor = '#059669';
  }

  return {
    style: {
      backgroundColor,
      borderColor,
      borderWidth: '2px',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '0.875rem',
      fontWeight: 500,
      padding: '4px 8px',
    },
  };
};

export function AgendaCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  defaultDate = new Date(),
  defaultView = 'month',
  className,
}: AgendaCalendarProps) {
  const calendarEvents = useMemo(() => {
    return events.map(agendaItemToEvent);
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

  return (
    <div className={`h-[600px] bg-zinc-900 rounded-lg ${className}`}>
      <style jsx global>{`
        .rbc-calendar {
          background: rgb(24 24 27);
          color: rgb(228 228 231);
          font-family: inherit;
        }
        
        .rbc-header {
          border-bottom: 1px solid rgb(63 63 70);
          padding: 12px 8px;
          font-weight: 500;
          color: rgb(161 161 170);
          font-size: 0.875rem;
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
          border: 1px solid rgb(63 63 70);
        }
        
        .rbc-toolbar {
          padding: 16px;
          border-bottom: 1px solid rgb(63 63 70);
          background: rgb(39 39 42);
        }
        
        .rbc-toolbar button {
          color: rgb(228 228 231);
          background: rgb(39 39 42);
          border: 1px solid rgb(63 63 70);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .rbc-toolbar button:hover {
          background: rgb(63 63 70);
          color: rgb(255 255 255);
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
        }
        
        .rbc-event {
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rbc-event:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        
        .rbc-event-content {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .rbc-time-view {
          border-color: rgb(63 63 70);
        }
        
        .rbc-time-header-content {
          border-left-color: rgb(63 63 70);
        }
        
        .rbc-time-content {
          border-top-color: rgb(63 63 70);
        }
        
        .rbc-time-slot {
          border-top-color: rgb(63 63 70);
        }
        
        .rbc-day-slot .rbc-time-slot {
          border-top-color: rgb(63 63 70);
        }
        
        .rbc-agenda-view table {
          background: rgb(24 24 27);
        }
        
        .rbc-agenda-view table tbody > tr > td {
          border-color: rgb(63 63 70);
          padding: 12px;
        }
        
        .rbc-agenda-view table tbody > tr > td + td {
          border-left-color: rgb(63 63 70);
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
        onSelectEvent={onSelectEvent ? (event) => onSelectEvent(event.resource) : undefined}
        onSelectSlot={onSelectSlot}
        selectable={!!onSelectSlot}
        eventPropGetter={zenEventStyleGetter}
        formats={formats}
        culture={culture}
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
  );
}

