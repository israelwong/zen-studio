'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import { obtenerSeccionesConStats } from '@/lib/actions/studio/builder/catalogo';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/utilidad.actions';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { SeccionData } from '@/lib/actions/studio/builder/catalogo/secciones.actions';

interface PaqueteModalProps {
    studioSlug: string;
    paquete: PaqueteFromDB;
    onClose: () => void;
    onSave: (paquete: PaqueteFromDB) => void;
}

export function PaqueteModal({ studioSlug, paquete, onClose, onSave }: PaqueteModalProps) {
    // Estado del formulario
    const [nombre, setNombre] = useState(paquete.name || '');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState(paquete.precio || 0);
    const [selectedItems, setSelectedItems] = useState<{ [itemId: string]: { cantidad: number, precioPersonalizado?: number } }>({});

    // Datos del catálogo
    const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);

            const [catalogoResult, configResult] = await Promise.all([
                obtenerSeccionesConStats(studioSlug),
                obtenerConfiguracionPrecios(studioSlug)
            ]);

            if (catalogoResult.success && catalogoResult.data) {
                setCatalogo(catalogoResult.data);
            }

            if (configResult) {
                // Configuración cargada correctamente
                console.log('Configuración cargada:', configResult);
            }

            // Inicializar items seleccionados del paquete existente
            if (paquete.paquete_items) {
                const items: { [itemId: string]: { cantidad: number, precioPersonalizado?: number } } = {};
                paquete.paquete_items.forEach(servicio => {
                    items[servicio.item_id] = {
                        cantidad: servicio.quantity,
                        precioPersonalizado: undefined
                    };
                });
                setSelectedItems(items);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    }, [studioSlug, paquete.paquete_items]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Calcular totales
    const calculos = useMemo(() => {
        // TODO: Implementar cálculo real cuando esté disponible la estructura de servicios
        const itemsSeleccionados: Array<{
            item: unknown;
            cantidad: number;
            precioUnitario: number;
            subtotal: number;
        }> = [];

        const subtotal = 0;
        const precioFinalCalculado = precio > 0 ? precio : subtotal;
        const utilidad = precioFinalCalculado - subtotal;

        return {
            subtotal,
            precioFinal: precioFinalCalculado,
            utilidad,
            itemsSeleccionados
        };
    }, [precio]);

    const handleSave = async () => {
        if (!nombre.trim()) {
            alert('El nombre del paquete es requerido');
            return;
        }

        if (Object.keys(selectedItems).length === 0) {
            alert('Agrega al menos un servicio');
            return;
        }

        setSaving(true);
        try {
            // TODO: Implementar guardado
            console.log('Guardando paquete:', {
                nombre,
                descripcion,
                precio: calculos.precioFinal,
                items: selectedItems
            });

            // Simular guardado exitoso
            setTimeout(() => {
                onSave({
                    ...paquete,
                    name: nombre,
                    precio: calculos.precioFinal,
                    utilidad: calculos.utilidad
                });
            }, 1000);
        } catch (error) {
            console.error('Error guardando paquete:', error);
        } finally {
            setSaving(false);
        }
    };

    // TODO: Implementar funciones cuando esté disponible la estructura de servicios
    // const updateItemQuantity = (itemId: string, cantidad: number) => {
    //     setSelectedItems(prev => ({
    //         ...prev,
    //         [itemId]: {
    //             ...prev[itemId],
    //             cantidad: Math.max(0, cantidad)
    //         }
    //     }));
    // };

    // const updateItemPrice = (itemId: string, precioPersonalizado: number) => {
    //     setSelectedItems(prev => ({
    //         ...prev,
    //         [itemId]: {
    //             ...prev[itemId],
    //             precioPersonalizado: precioPersonalizado > 0 ? precioPersonalizado : undefined
    //         }
    //     }));
    // };

    if (loading) {
        return (
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="max-w-7xl h-[90vh]">
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                            <p className="text-zinc-400">Cargando datos...</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] overflow-hidden p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-3">
                        <ArrowLeft
                            className="w-5 h-5 cursor-pointer hover:text-emerald-400 transition-colors"
                            onClick={onClose}
                        />
                        <span>Configurar Paquete: {paquete.name}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden p-6 pt-4">
                    {/* Columna 1: Servicios (Scrollable) */}
                    <div className="lg:col-span-2 overflow-y-auto">
                        <ZenCard>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Servicios Disponibles
                                </h3>

                                <div className="space-y-4">
                                    {catalogo.map((seccion) => (
                                        <div key={seccion.id} className="border border-zinc-800 rounded-lg p-4">
                                            <h4 className="text-md font-medium text-white mb-3">
                                                {seccion.name}
                                            </h4>

                                            {seccion.categories?.map((categoria) => (
                                                <div key={categoria.id} className="mb-4 last:mb-0">
                                                    <h5 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                        {categoria.name}
                                                    </h5>

                                                    <div className="space-y-2">
                                                        {/* TODO: Implementar servicios cuando esté disponible la estructura correcta */}
                                                        <div className="text-zinc-400 text-sm">
                                                            Servicios no disponibles en esta versión
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ZenCard>
                    </div>

                    {/* Columna 2: Configuración + Resumen */}
                    <div className="space-y-6">
                        {/* Configuración del paquete */}
                        <ZenCard>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Configuración
                                </h3>

                                <div className="space-y-4">
                                    <ZenInput
                                        label="Nombre del Paquete *"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Ej: Básico, Intermedio, Alto"
                                    />

                                    <ZenTextarea
                                        label="Descripción"
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        placeholder="Descripción del paquete..."
                                        rows={3}
                                    />

                                    <ZenInput
                                        label="Precio Final"
                                        type="number"
                                        value={precio}
                                        onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                                        placeholder="Precio personalizado"
                                    />
                                </div>
                            </div>
                        </ZenCard>

                        {/* Resumen financiero */}
                        <ZenCard>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Resumen Financiero
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Subtotal</span>
                                        <span className="text-white font-medium">
                                            {formatearMoneda(calculos.subtotal)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Precio Final</span>
                                        <span className="text-emerald-400 font-bold text-lg">
                                            {formatearMoneda(calculos.precioFinal)}
                                        </span>
                                    </div>

                                    <div className="border-t border-zinc-800 pt-3">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Utilidad</span>
                                            <span className={`font-bold ${calculos.utilidad > 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {formatearMoneda(calculos.utilidad)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ZenCard>

                        {/* Acciones */}
                        <div className="flex gap-3">
                            <ZenButton
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1"
                                disabled={saving}
                            >
                                Cancelar
                            </ZenButton>
                            <ZenButton
                                onClick={handleSave}
                                disabled={saving || !nombre.trim()}
                                className="flex-1"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar
                                    </>
                                )}
                            </ZenButton>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
