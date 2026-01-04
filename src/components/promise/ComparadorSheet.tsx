'use client';

import React, { useState } from 'react';
import { X, Check, Eye } from 'lucide-react';
import { ZenBadge, ZenCard, ZenButton } from '@/components/ui/zen';
import type { PublicCotizacion, PublicPaquete, PublicSeccionData } from '@/types/public-promise';

interface ComparadorSheetProps {
  cotizaciones: PublicCotizacion[];
  paquetes: PublicPaquete[];
  isOpen: boolean;
  onClose: () => void;
  onViewDetails?: (item: PublicCotizacion | PublicPaquete, type: 'cotizacion' | 'paquete') => void;
}

type ComparableItem = (PublicCotizacion | PublicPaquete) & { type: 'cotizacion' | 'paquete' };

// Type guard para verificar si es cotización
function isCotizacion(item: ComparableItem): item is PublicCotizacion & { type: 'cotizacion' } {
  return item.type === 'cotizacion';
}

// Obtener todas las secciones únicas de todos los items
// Agrupa por NOMBRE (no por ID) porque los paquetes tienen IDs dinámicos y las cotizaciones guardan snapshots
function getAllUniqueSecciones(items: ComparableItem[]): PublicSeccionData[] {
  // Usar nombre como clave para agrupar secciones
  const seccionesMap = new Map<string, PublicSeccionData>();

  items.forEach((item) => {
    item.servicios.forEach((seccionDelItem) => {
      const seccionKey = seccionDelItem.nombre.toLowerCase().trim();
      
      // Si la sección no existe por nombre, crearla
      if (!seccionesMap.has(seccionKey)) {
        seccionesMap.set(seccionKey, {
          id: seccionDelItem.id, // Usar el primer ID encontrado
          nombre: seccionDelItem.nombre,
          orden: seccionDelItem.orden,
          categorias: [],
        });
      }

      const seccionMap = seccionesMap.get(seccionKey)!;
      // Crear mapa de categorías existentes agrupadas por nombre
      const categoriasMap = new Map<string, PublicCategoriaData>();
      seccionMap.categorias.forEach(c => {
        const categoriaKey = c.nombre.toLowerCase().trim();
        categoriasMap.set(categoriaKey, {
          ...c,
          servicios: [...c.servicios],
        });
      });

      // Procesar cada categoría de esta sección en este item específico
      seccionDelItem.categorias.forEach((categoriaDelItem) => {
        const categoriaKey = categoriaDelItem.nombre.toLowerCase().trim();
        
        // Si la categoría no existe por nombre, crearla
        if (!categoriasMap.has(categoriaKey)) {
          categoriasMap.set(categoriaKey, {
            id: categoriaDelItem.id, // Usar el primer ID encontrado
            nombre: categoriaDelItem.nombre,
            orden: categoriaDelItem.orden,
            servicios: [],
          });
        }

        const categoriaMap = categoriasMap.get(categoriaKey)!;
        // Crear mapa de servicios existentes agrupados por nombre
        const serviciosMap = new Map<string, PublicServicioData>();
        categoriaMap.servicios.forEach(s => {
          const servicioKey = (s.name || '').toLowerCase().trim();
          if (servicioKey) {
            serviciosMap.set(servicioKey, s);
          }
        });

        // Agregar servicios de esta categoría específica en esta sección específica de este item
        categoriaDelItem.servicios.forEach((servicio) => {
          const servicioKey = (servicio.name || '').toLowerCase().trim();
          if (servicioKey && !serviciosMap.has(servicioKey)) {
            serviciosMap.set(servicioKey, servicio);
          }
        });

        // Actualizar servicios de la categoría
        categoriaMap.servicios = Array.from(serviciosMap.values()).sort((a, b) => {
          return (a.name || '').localeCompare(b.name || '');
        });
        categoriasMap.set(categoriaKey, categoriaMap);
      });

      // Actualizar categorías de la sección
      seccionMap.categorias = Array.from(categoriasMap.values()).sort((a, b) => a.orden - b.orden);
      seccionesMap.set(seccionKey, seccionMap);
    });
  });

  return Array.from(seccionesMap.values()).sort((a, b) => a.orden - b.orden);
}

export function ComparadorSheet({
  cotizaciones,
  paquetes,
  isOpen,
  onClose,
  onViewDetails,
}: ComparadorSheetProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Combinar cotizaciones y paquetes
  const items: ComparableItem[] = [
    ...cotizaciones.map((c) => ({ ...c, type: 'cotizacion' as const })),
    ...paquetes.map((p) => ({ ...p, type: 'paquete' as const })),
  ];

  // Estado para ocultar columnas
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  // Filtrar items visibles
  const visibleItems = items.filter((item) => !hiddenItems.has(item.id));

  // Toggle ocultar/mostrar
  const toggleItemVisibility = (itemId: string) => {
    setHiddenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Obtener todas las secciones únicas
  const allSecciones = getAllUniqueSecciones(visibleItems);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                Comparador de Opciones
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                Compara las características y servicios de todas las opciones disponibles
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Columnas ocultas */}
          {hiddenItems.size > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <p className="text-xs text-zinc-400 w-full mb-1">Columnas ocultas:</p>
              {items
                .filter((item) => hiddenItems.has(item.id))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItemVisibility(item.id)}
                    className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-300 transition-colors"
                  >
                    {item.name} ✕
                  </button>
                ))}
            </div>
          )}

          {/* Contenedor con scroll único para el comparador */}
          <div className="overflow-x-auto">
            <div className="space-y-4 min-w-max">
              {/* Header con nombres de columnas */}
              <div className="flex gap-3">
                {/* Columna Característica - STICKY */}
                <div className="sticky left-0 z-20 bg-zinc-900 px-4 py-1.5 w-[180px] sm:w-[220px] shrink-0 flex items-center">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-400">Incluye</p>
                </div>

                {/* Columnas de items - SCROLLABLE */}
                <div className="flex gap-2">
                  {visibleItems.map((item) => {
                    const finalPrice =
                      isCotizacion(item) && item.discount
                        ? item.price - (item.price * item.discount) / 100
                        : item.price;

                    return (
                      <div key={item.id} className="px-3 py-1.5 w-[150px] sm:w-[180px] shrink-0 text-center relative">
                        {/* Botón ocultar arriba */}
                        <button
                          onClick={() => toggleItemVisibility(item.id)}
                          className="absolute top-1 right-1 p-1 hover:bg-zinc-800 rounded transition-colors"
                          title="Ocultar columna"
                        >
                          <X className="h-3 w-3 text-zinc-500" />
                        </button>

                        <ZenBadge
                          className={
                            item.type === 'cotizacion'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-2 py-0.5'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0.5'
                          }
                        >
                          {item.type === 'cotizacion' ? 'Cotización' : 'Paquete'}
                        </ZenBadge>
                        <p className="font-semibold text-white text-xs sm:text-sm truncate mt-1.5 capitalize">{item.name}</p>
                        <p className="text-md sm:text-base font-bold text-white mt-1">
                          {formatPrice(finalPrice)}
                        </p>
                        {isCotizacion(item) && item.discount && (
                          <p className="text-[10px] text-zinc-500 line-through">
                            {formatPrice(item.price)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secciones con Cards */}
              {allSecciones.map((seccion) => (
                <ZenCard key={`seccion-${seccion.nombre}`} className="overflow-visible">
                  {/* Sección Header */}
                  <div className="flex gap-2 bg-zinc-900/50 border-b border-zinc-800">
                    <div className="sticky left-0 z-20 bg-zinc-900/50 p-3 sm:p-4 w-[180px] sm:w-[220px] shrink-0 border-r border-zinc-800">
                      <h3 className="text-sm sm:text-base font-semibold text-zinc-200">{seccion.nombre}</h3>
                    </div>
                    <div className="flex-1 p-3 sm:p-4">
                      <div className="h-full" />
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-800/50">
                    {seccion.categorias
                      .sort((a, b) => a.orden - b.orden)
                      .map((categoria) => (
                        <div key={`categoria-${categoria.nombre}`} className="bg-zinc-950/30">
                          {/* Categoría Header */}
                          <div className="flex gap-2 border-b border-zinc-800/30">
                            <div className="sticky left-0 z-10 bg-zinc-950/30 px-2 sm:px-3 py-2 sm:py-3 w-[180px] sm:w-[220px] shrink-0 border-r border-zinc-800/30">
                              <p className="text-xs sm:text-sm font-medium text-zinc-300">{categoria.nombre}</p>
                            </div>
                            <div className="flex-1 py-2 sm:py-3">
                              <div className="h-full" />
                            </div>
                          </div>

                          {/* Items de la categoría */}
                          <div className="space-y-1">
                            {categoria.servicios.map((servicio) => (
                              <div key={`servicio-${servicio.name || servicio.id}`} className="flex gap-2">
                                {/* Columna servicio - STICKY */}
                                <div className="sticky left-0 z-10 bg-zinc-950 px-3 sm:px-4 py-2 w-[180px] sm:w-[220px] shrink-0 border-r border-zinc-800/30">
                                  <p className="text-xs sm:text-sm text-zinc-400 pl-2 sm:pl-4 border-l-2 border-zinc-800/50">
                                    {servicio.name}
                                  </p>
                                </div>

                                {/* Columnas checks - SCROLLABLE */}
                                <div className="flex gap-2">
                                  {visibleItems.map((item) => {
                                    // Buscar por nombre en lugar de por ID
                                    const seccionItem = item.servicios.find(
                                      (s) => s.nombre.toLowerCase().trim() === seccion.nombre.toLowerCase().trim()
                                    );
                                    const categoriaItem = seccionItem?.categorias.find(
                                      (c) => c.nombre.toLowerCase().trim() === categoria.nombre.toLowerCase().trim()
                                    );
                                    const servicioEncontrado = categoriaItem?.servicios.find(
                                      (s) => (s.name || '').toLowerCase().trim() === (servicio.name || '').toLowerCase().trim()
                                    );
                                    const hasServicio = !!servicioEncontrado;
                                    const cantidad = servicioEncontrado && 'quantity' in servicioEncontrado && servicioEncontrado.quantity
                                      ? servicioEncontrado.quantity
                                      : null;
                                    
                                    return (
                                      <div key={item.id} className="px-3 py-2 w-[150px] sm:w-[180px] shrink-0 flex items-center justify-center">
                                        {hasServicio ? (
                                          <div className="flex items-center gap-1.5">
                                            <Check className={`h-3.5 w-3.5 shrink-0 ${item.type === 'cotizacion' ? 'text-emerald-400' : 'text-blue-400'}`} />
                                            {cantidad !== null && (
                                              <span className="text-xs text-zinc-400">x{cantidad}</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-zinc-700 text-sm">—</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </ZenCard>
              ))}

              {/* Precio Final y Acciones */}
              <div className="flex gap-2 items-stretch">
                <div className="sticky left-0 z-20 bg-zinc-900 w-[180px] sm:w-[220px] shrink-0">
                  <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50 px-3 py-2 h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm font-medium text-zinc-400">Precio Total</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {visibleItems.map((item) => {
                    const finalPrice =
                      isCotizacion(item) && item.discount
                        ? item.price - (item.price * item.discount) / 100
                        : item.price;

                    return (
                      <div key={item.id} className="w-[150px] sm:w-[180px] shrink-0">
                        <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50 px-3 py-2">
                          <div className="text-center">
                            <p className="text-lg sm:text-base font-bold text-white">
                              {formatPrice(finalPrice)}
                            </p>
                            {isCotizacion(item) && item.discount && (
                              <p className="text-[10px] text-zinc-500 line-through mt-0.5">
                                {formatPrice(item.price)}
                              </p>
                            )}
                            {onViewDetails && (
                              <ZenButton
                                onClick={() => {
                                  onViewDetails(
                                    item.type === 'cotizacion'
                                      ? cotizaciones.find(c => c.id === item.id)!
                                      : paquetes.find(p => p.id === item.id)!,
                                    item.type
                                  );
                                }}
                                variant="ghost"
                                className={`w-full text-xs ${item.type === 'cotizacion' ? 'text-emerald-400' : 'text-blue-400'}`}
                                size="sm"
                              >
                                {item.type === 'cotizacion' ? 'Autorizar' : 'Ver detalles'}
                              </ZenButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tip - Fuera del scroll */}
          <div className="p-3 sm:p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <p className="text-xs sm:text-sm text-zinc-400">
              💡 <span className="font-semibold">Tip:</span> Desliza horizontalmente para
              ver todas las opciones
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

