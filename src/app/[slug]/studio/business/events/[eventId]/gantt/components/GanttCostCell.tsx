import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface GanttCostCellProps {
  item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
}

export function GanttCostCell({ item }: GanttCostCellProps) {
  // Usar subtotal (unit_price * quantity) en lugar de cost
  // cost es el costo interno, subtotal es lo que paga el cliente
  const totalCost = item.subtotal ?? 0;

  return (
    <div className="text-sm text-zinc-300 font-medium">
      {totalCost > 0 ? formatCurrency(totalCost) : '—'}
    </div>
  );
}
