/**
 * Formateador unificado de cantidades de ítems en contratos
 * 
 * Centraliza la lógica de renderizado de cantidades según billing_type
 * para eliminar duplicación y asegurar consistencia en PDF, Preview y Portal.
 */

import { calcularCantidadEfectiva } from './dynamic-billing-calc';

export interface FormatItemQuantityInput {
  /** Cantidad base del item */
  quantity: number;
  /** Tipo de facturación del catálogo */
  billingType: 'HOUR' | 'SERVICE' | 'UNIT';
  /** Horas del evento (requerido para HOUR) */
  eventDurationHours?: number | null;
  /** Cantidad efectiva pre-calculada (opcional, se calcula si no se proporciona) */
  cantidadEfectiva?: number;
}

export interface FormatItemQuantityOutput {
  /** Texto formateado para mostrar (ej: "x8 /hrs" o "x2") */
  displayText: string;
  /** Cantidad base */
  quantityBase: number;
  /** Cantidad efectiva calculada */
  quantityEffective: number;
  /** Si tiene horas asociadas */
  hasHours: boolean;
  /** Horas de duración (si aplica) */
  hours?: number;
}

/**
 * Formatea la cantidad de un item según su billing_type
 * 
 * Reglas de renderizado:
 * - HOUR: Muestra cantidad efectiva con "/hrs" (ej: "x8 /hrs") - SIEMPRE, incluso si es 1
 * - SERVICE: Muestra cantidad SIEMPRE (ej: "x1", "x2") - Inventario completo y auditado
 * - UNIT: Muestra cantidad SIEMPRE (ej: "x1", "x3") - Inventario completo y auditado
 * 
 * @param input - Parámetros de formateo
 * @returns Texto formateado y metadata
 * 
 * @example
 * ```typescript
 * // HOUR con 8 horas de evento
 * formatItemQuantity({
 *   quantity: 1,
 *   billingType: 'HOUR',
 *   eventDurationHours: 8
 * })
 * // → { displayText: 'x8 /hrs', quantityBase: 1, quantityEffective: 8, hasHours: true, hours: 8 }
 * 
 * // SERVICE con cantidad 2
 * formatItemQuantity({
 *   quantity: 2,
 *   billingType: 'SERVICE'
 * })
 * // → { displayText: 'x2', quantityBase: 2, quantityEffective: 2, hasHours: false }
 * 
 * // SERVICE con cantidad 1 (siempre mostrar para inventario completo)
 * formatItemQuantity({
 *   quantity: 1,
 *   billingType: 'SERVICE'
 * })
 * // → { displayText: 'x1', quantityBase: 1, quantityEffective: 1, hasHours: false }
 * 
 * // UNIT con cantidad 1 (siempre mostrar para inventario completo)
 * formatItemQuantity({
 *   quantity: 1,
 *   billingType: 'UNIT'
 * })
 * // → { displayText: 'x1', quantityBase: 1, quantityEffective: 1, hasHours: false }
 * ```
 */
export function formatItemQuantity({
  quantity,
  billingType,
  eventDurationHours = null,
  cantidadEfectiva,
}: FormatItemQuantityInput): FormatItemQuantityOutput {
  // Calcular cantidad efectiva si no está pre-calculada
  let effectiveQuantity = cantidadEfectiva ?? quantity;
  let hours: number | undefined = undefined;
  let hasHours = false;
  
  if (billingType === 'HOUR' && eventDurationHours !== null && eventDurationHours > 0) {
    // Calcular cantidad efectiva para items tipo HOUR
    effectiveQuantity = calcularCantidadEfectiva(
      'HOUR',
      quantity,
      eventDurationHours
    );
    hours = eventDurationHours;
    hasHours = true;
  }
  
  // Generar texto de display según billing_type
  let displayText = '';
  
  if (billingType === 'HOUR' && hasHours) {
    // HOUR: siempre mostrar cantidad efectiva con /hrs (incluso si es 1)
    displayText = `x${effectiveQuantity} /hrs`;
  } else if (billingType === 'SERVICE' || billingType === 'UNIT') {
    // SERVICE/UNIT: siempre mostrar cantidad (incluso si es 1)
    // Esto convierte el contrato en un inventario completo y auditado
    // El cliente ve explícitamente x1, eliminando ambigüedad
    displayText = `x${quantity || 1}`;
  }
  
  return {
    displayText,
    quantityBase: quantity,
    quantityEffective: effectiveQuantity,
    hasHours,
    hours,
  };
}
