'use client';

import React from 'react';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';

type HeaderVariant = 'pendientes' | 'negociacion' | 'cierre';

interface PublicPromisePageHeaderProps {
  prospectName: string;
  eventName: string | null;
  eventTypeName: string | null;
  eventDate: Date | string | null;
  variant: HeaderVariant;
  isContractSigned?: boolean;
  minDaysToHire?: number;
}

/**
 * Header evolutivo que cambia según la etapa de la promesa
 * Utiliza lógica de "Asesoría Profesional" en lugar de urgencia genérica
 */
export function PublicPromisePageHeader({
  prospectName,
  eventName,
  eventTypeName,
  eventDate,
  variant,
  isContractSigned = false,
  minDaysToHire = 30,
}: PublicPromisePageHeaderProps) {
  // Parsear fecha
  const parseDate = (date: Date | string | null): Date | null => {
    if (!date) return null;
    if (typeof date === 'string') {
      const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      }
      return new Date(date);
    }
    return date;
  };

  const dateObj = parseDate(eventDate);
  const formattedDate = dateObj ? formatDisplayDateLong(dateObj) : null;

  // Calcular días restantes hasta el evento
  const daysUntilEvent = dateObj
    ? (() => {
        const today = new Date();
        const todayUtc = new Date(Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        ));
        const eventUtc = new Date(Date.UTC(
          dateObj.getUTCFullYear(),
          dateObj.getUTCMonth(),
          dateObj.getUTCDate()
        ));
        const diffTime = eventUtc.getTime() - todayUtc.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      })()
    : null;

  // Calcular fecha recomendada (eventDate - minDaysToHire)
  const recommendedDate = dateObj && minDaysToHire
    ? (() => {
        const recommended = new Date(dateObj);
        recommended.setDate(recommended.getDate() - minDaysToHire);
        return recommended;
      })()
    : null;

  const formattedRecommendedDate = recommendedDate ? formatDisplayDateLong(recommendedDate) : null;

  // Renderizar contenido según la variante
  const renderContent = () => {
    switch (variant) {
      case 'pendientes':
        return (
          <>
            {/* Badge de tipo de evento */}
            {eventTypeName && (
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                  {eventTypeName}
                </span>
              </div>
            )}

            {/* Saludo grande */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              ¡Hola, {prospectName}!
            </h1>

            {/* Descripción principal */}
            <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-4">
              Te compartimos las opciones para tu evento de{' '}
              <span className="text-white font-medium">{eventTypeName || 'especial'}</span>
              {eventName && (
                <> para <span className="text-white font-medium">{eventName}</span></>
              )}
              {dateObj && formattedDate && (
                <> que se celebrará <span className="text-white font-medium">{formattedDate}</span></>
              )}.
            </p>

          </>
        );

      case 'negociacion':
        return (
          <>
            {/* Badge de tipo de evento */}
            {eventTypeName && (
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                  {eventTypeName}
                </span>
              </div>
            )}

            {/* Saludo grande */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {prospectName}
            </h1>

            {/* Descripción principal */}
            <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-4">
              Hemos diseñado esta propuesta especial para tu evento de{' '}
              <span className="text-white font-medium">{eventTypeName || 'especial'}</span>
              {eventName && (
                <> para <span className="text-white font-medium">{eventName}</span></>
              )}
              {dateObj && formattedDate && (
                <> que se celebrará <span className="text-white font-medium">{formattedDate}</span></>
              )}{' '}
              basándonos en lo que platicamos.
            </p>

            {/* Texto secundario */}
            {dateObj && formattedDate && (
              <p className="text-xs md:text-sm text-zinc-500 max-w-2xl mx-auto">
                Esta propuesta tiene condiciones preferenciales. Recomendamos revisarla pronto.
              </p>
            )}
          </>
        );

      case 'cierre':
        return (
          <>
            {/* Badge de tipo de evento */}
            {eventTypeName && (
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                  {eventTypeName}
                </span>
              </div>
            )}

            {/* Saludo grande */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {!isContractSigned ? (
                <>¡Felicidades, {prospectName}!</>
              ) : (
                <>¡Paso completado, {prospectName}!</>
              )}
            </h1>

            {/* Descripción principal */}
            {!isContractSigned ? (
              <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-4">
                Estás a un par de pasos de asegurar la cobertura para tu evento de{' '}
                <span className="text-white font-medium">{eventTypeName || 'especial'}</span>
                {eventName && (
                  <> para <span className="text-white font-medium">{eventName}</span></>
                )}
                {dateObj && formattedDate && (
                  <> que se celebrará <span className="text-white font-medium">{formattedDate}</span></>
                )}. Revisa y firma tu contrato para proceder.
              </p>
            ) : (
              <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-4">
                Tu contrato ya está firmado. Para bloquear oficialmente la fecha en nuestra agenda, solo falta el registro de tu anticipo.
              </p>
            )}

          </>
        );

      default:
        return null;
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradado */}
      <div className="absolute inset-0 bg-linear-to-b from-zinc-900/40 via-zinc-950 to-zinc-950" />

      {/* Pattern de fondo - más sutil */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Contenido principal */}
        <div className="text-center">
          {renderContent()}
        </div>

        {/* Indicador de scroll (solo mobile) */}
        <div className="mt-8 flex justify-center md:hidden">
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <p className="text-xs">Desliza para ver más</p>
            <div className="animate-bounce">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
