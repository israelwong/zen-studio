// components/ui/paquetes/ResumenPaquete.tsx

"use client";

import { ZenCard, ZenButton, ZenInput, ZenTextarea } from "@/components/ui/zen"; // Revisa tus rutas
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs"; // Revisa tus rutas
import { formatearMoneda } from "@/lib/actions/studio/catalogo/calcular-precio";

// Tipos para los datos que este componente espera recibir.
// Deberían coincidir con los que ya tienes en tu lógica.
type CalculoPaquete = {
    precioSistema: number;
    // ...agrega aquí todos los demás campos que tu función de cálculo retorna
    totalCosto: number;
    totalGasto: number;
    comisionVentaReal: number;
};

type AnalisisFinanciero = {
    estado: 'perdida' | 'alerta' | 'precaucion' | 'saludable';
    utilidadReal: number;
    margenPorcentaje: number;
    precioVenta: number;
    desviacion: number;
    porcentajeDesviacion: number;
    costosTotal: number;
    // ...agrega aquí todos los demás campos de tu análisis
};

interface ResumenPaqueteProps {
    nombre: string;
    setNombre: (value: string) => void;
    descripcion: string;
    setDescripcion: (value: string) => void;
    precioVenta: number;
    setPrecioVenta: (value: number) => void;

    calculoPaquete: CalculoPaquete | null;
    analisisFinanciero: AnalisisFinanciero | null;

    handleGuardar: () => void;
    handleCancelar: () => void;
    guardando: boolean;
    eliminando: boolean;
    modo: 'crear' | 'editar';
}

export function ResumenPaquete({
    nombre,
    setNombre,
    descripcion,
    setDescripcion,
    precioVenta,
    setPrecioVenta,
    calculoPaquete,
    analisisFinanciero,
    handleGuardar,
    handleCancelar,
    guardando,
    eliminando,
    modo,
}: ResumenPaqueteProps) {

    // Si no hay cálculos, mostramos un estado vacío.
    if (!calculoPaquete) return <div>Cargando...</div>;

    return (
        // 'sticky' y 'top-6' hacen que el panel se quede fijo al hacer scroll
        <div className="space-y-4 lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold text-white">
                Resumen del Paquete
            </h2>

            {/* Card 1: Información Básica */}
            <ZenCard>
                <div className="p-4 space-y-4">
                    <div>
                        <ZenInput
                            label="Nombre del Paquete *"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Paquete Boda Premium"
                        />
                    </div>
                    <div>
                        <ZenTextarea
                            label="Descripción (opcional)"
                            value={descripcion || ''}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción del paquete..."
                            rows={3}
                        />
                    </div>
                </div>
            </ZenCard>

            {/* Pestañas para organizar el resto de la información */}
            <Tabs defaultValue="precio" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="precio">Precio</TabsTrigger>
                    <TabsTrigger value="analisis" disabled={!analisisFinanciero}>Análisis</TabsTrigger>
                </TabsList>

                {/* Pestaña de Precio y Acciones */}
                <TabsContent value="precio">
                    <ZenCard className="mt-2">
                        <div className="p-4 space-y-4">
                            <div className="bg-zinc-800/50 p-3 rounded-lg">
                                <div className="text-xs text-zinc-400 mb-1">
                                    Precio Sugerido (Sistema)
                                </div>
                                <div className="text-2xl font-bold text-yellow-400">
                                    {formatearMoneda(calculoPaquete.precioSistema)}
                                </div>
                            </div>

                            <div>
                                <ZenInput
                                    type="number"
                                    label="Precio Final del Paquete *"
                                    value={precioVenta === 0 ? '' : precioVenta}
                                    onChange={(e) =>
                                        setPrecioVenta(
                                            e.target.value === '' ? 0 : parseFloat(e.target.value)
                                        )
                                    }
                                    placeholder="Ingresa el precio de venta"
                                    step="0.01"
                                    min="0"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full pt-2">
                                <ZenButton
                                    className="flex-1"
                                    onClick={handleCancelar}
                                    variant="secondary"
                                    disabled={guardando || eliminando}
                                >
                                    Cancelar
                                </ZenButton>
                                <ZenButton
                                    className="flex-1"
                                    onClick={handleGuardar}
                                    disabled={guardando || eliminando}
                                >
                                    {guardando
                                        ? 'Guardando...'
                                        : modo === 'crear'
                                            ? 'Guardar Paquete'
                                            : 'Actualizar Paquete'}
                                </ZenButton>
                            </div>
                        </div>
                    </ZenCard>
                </TabsContent>

                {/* Pestaña de Análisis Financiero */}
                <TabsContent value="analisis">
                    <div className="space-y-4 mt-2">
                        {analisisFinanciero && (() => {
                            const { estado, utilidadReal, margenPorcentaje, costosTotal } = analisisFinanciero;
                            const config = {
                                perdida: { color: 'text-red-400', bgLight: 'bg-red-900/10', border: 'border-red-800/30', icon: '❌', label: 'PÉRDIDAS' },
                                alerta: { color: 'text-orange-400', bgLight: 'bg-orange-900/10', border: 'border-orange-800/30', icon: '⚠️', label: 'UTILIDAD BAJA' },
                                precaucion: { color: 'text-yellow-400', bgLight: 'bg-yellow-900/10', border: 'border-yellow-800/30', icon: '💡', label: 'BAJO OBJETIVO' },
                                saludable: { color: 'text-emerald-400', bgLight: 'bg-emerald-900/10', border: 'border-emerald-800/30', icon: '✅', label: 'OBJETIVO CUMPLIDO' }
                            };
                            const colorActual = config[estado];

                            return (
                                <ZenCard className={colorActual.border}>
                                    <div className={`p-4 ${colorActual.bgLight}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-semibold tracking-wider ${colorActual.color} uppercase`}>{colorActual.label}</span>
                                            <span className="text-xl">{colorActual.icon}</span>
                                        </div>
                                        <div className="mb-1">
                                            <div className="text-xs text-zinc-500 mb-1 uppercase">Ganancia</div>
                                            <div className={`text-3xl font-bold ${colorActual.color}`}>{formatearMoneda(utilidadReal)}</div>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-md font-semibold ${colorActual.color}`}>
                                                {margenPorcentaje >= 0 ? '↑' : '↓'} {Math.abs(margenPorcentaje).toFixed(1)}%
                                            </span>
                                            <span className="text-xs text-zinc-500">de margen</span>
                                        </div>

                                        {/* Barra de distribución */}
                                        <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                            <div className="relative h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                {(() => {
                                                    const porcentajeCostos = (costosTotal / precioVenta) * 100;
                                                    const porcentajeComision = (calculoPaquete.comisionVentaReal / precioVenta) * 100;
                                                    return (
                                                        <>
                                                            <div className="absolute h-full bg-red-500" style={{ width: `${porcentajeCostos}%` }} title={`Costos: ${formatearMoneda(costosTotal)}`} />
                                                            <div className="absolute h-full bg-orange-500" style={{ left: `${porcentajeCostos}%`, width: `${porcentajeComision}%` }} title={`Comisión: ${formatearMoneda(calculoPaquete.comisionVentaReal)}`} />
                                                            <div className="absolute h-full bg-emerald-500" style={{ left: `${porcentajeCostos + porcentajeComision}%`, width: `auto`, right: '0' }} title={`Ganancia: ${formatearMoneda(utilidadReal)}`} />
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </ZenCard>
                            );
                        })()}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}