// components/cotizaciones/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { formatearMoneda } from "@/lib/actions/studio/catalogo/calcular-precio"
import { ZenInput } from "@/components/ui/zen"

export interface ServicioParaCotizacion {
  id: string
  nombre: string
  categoria: string
  seccion: string
  precioUnitario: number
  costo: number
  gasto: number
  tipo_utilidad: 'servicio' | 'producto'
}

export const columnsCotizacion: ColumnDef<ServicioParaCotizacion>[] = [
  {
    accessorKey: "nombre",
    header: "Servicio",
    cell: ({ row }) => {
      const servicio = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium text-white">{servicio.nombre}</span>
          <span className="text-xs text-zinc-500">
            {servicio.seccion} • {servicio.categoria}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "precioUnitario",
    header: () => <div className="text-right">Precio</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("precioUnitario"))
      return (
        <div className="text-right">
          <div className="font-medium text-white">{formatearMoneda(amount)}</div>
          <div className="text-xs text-zinc-500">c/u</div>
        </div>
      )
    },
  },
  {
    id: "cantidad",
    header: () => <div className="text-center">Cantidad</div>,
    cell: ({ row, table }) => {
      const servicio = row.original
      const { items, updateQuantity } = table.options.meta as {
        items: { [id: string]: number }
        updateQuantity: (id: string, cantidad: number) => void
      }

      const cantidad = items[servicio.id] || 0

      return (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => updateQuantity(servicio.id, Math.max(0, cantidad - 1))}
            className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
            disabled={cantidad === 0}
          >
            -
          </button>
          <ZenInput
            type="number"
            min={0}
            value={cantidad}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
              if (!isNaN(val) && val >= 0) updateQuantity(servicio.id, val)
            }}
            className="w-16 text-center bg-zinc-800 border-zinc-700"
          />
          <button
            onClick={() => updateQuantity(servicio.id, cantidad + 1)}
            className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
          >
            +
          </button>
        </div>
      )
    },
  },
  {
    id: "subtotal",
    header: () => <div className="text-right">Subtotal</div>,
    cell: ({ row, table }) => {
      const servicio = row.original
      const { items } = table.options.meta as { items: { [id: string]: number } }
      const cantidad = items[servicio.id] || 0
      const subtotal = servicio.precioUnitario * cantidad

      return (
        <div className="text-right font-medium text-white">
          {cantidad > 0 ? formatearMoneda(subtotal) : '-'}
        </div>
      )
    },
  }
]