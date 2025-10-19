"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ZenButton, ZenInput, ZenTextarea } from "@/components/ui/zen";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { calcularPrecio, type ConfiguracionPrecios, type ResultadoPrecio } from "@/lib/actions/studio/builder/catalogo/calcular-precio";

interface Gasto {
    nombre: string;
    costo: string;
}

export interface ItemFormData {
    id?: string;
    name: string;
    cost: number;
    description?: string;
    tipoUtilidad?: 'servicio' | 'producto';
    gastos?: Array<{ nombre: string; costo: number }>;
}

interface ItemEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ItemFormData) => Promise<void>;
    item?: ItemFormData | null;
    preciosConfig?: ConfiguracionPrecios;
}

/**
 * Modal para crear/editar items con cálculo dinámico de precios
 * Incluye gastos, tipo de utilidad y desglose de precios
 */
export function ItemEditorModal({
    isOpen,
    onClose,
    onSave,
    item,
    preciosConfig,
}: ItemEditorModalProps) {
    const [formData, setFormData] = useState<ItemFormData>({
        name: "",
        cost: 0,
        description: "",
        tipoUtilidad: "servicio",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [nuevoGastoNombre, setNuevoGastoNombre] = useState("");
    const [nuevoGastoCosto, setNuevoGastoCosto] = useState("");
    const [showDesglosePrecios, setShowDesglosePrecios] = useState(false);
    const [configuracion, setConfiguracion] = useState<ConfiguracionPrecios | null>(preciosConfig || null);

    // Configuración por defecto si no se proporciona
    useEffect(() => {
        if (!configuracion && !preciosConfig) {
            setConfiguracion({
                utilidad_servicio: 0.30,
                utilidad_producto: 0.40,
                comision_venta: 0.10,
                sobreprecio: 0.05,
            });
        }
    }, [preciosConfig, configuracion]);

    // Resetear formulario cuando se abre/cierra
    useEffect(() => {
        if (isOpen) {
            if (item) {
                setFormData(item);
                setGastos(
                    item.gastos?.map((g) => ({ nombre: g.nombre, costo: g.costo.toString() })) || []
                );
            } else {
                setFormData({
                    name: "",
                    cost: 0,
                    description: "",
                    tipoUtilidad: "servicio",
                });
                setGastos([]);
            }
            setErrors({});
            setShowDesglosePrecios(false);
        }
    }, [isOpen, item]);

    // Cálculo dinámico de precios
    const resultadoPrecio: ResultadoPrecio = useMemo(() => {
        const costoNum = formData.cost || 0;
        const gastosArray = gastos.map((g) => parseFloat(g.costo) || 0);
        const totalGastos = parseFloat(
            gastosArray.reduce((acc, g) => acc + g, 0).toFixed(2)
        );

        if (!configuracion) {
            return {
                precio_final: costoNum + totalGastos,
                precio_base: costoNum + totalGastos,
                costo: costoNum,
                gasto: totalGastos,
                utilidad_base: 0,
                subtotal: costoNum + totalGastos,
                monto_comision: 0,
                monto_sobreprecio: 0,
                porcentaje_utilidad: 0,
                porcentaje_comision: 0,
                porcentaje_sobreprecio: 0,
                utilidad_real: 0,
                porcentaje_utilidad_real: 0,
            };
        }

        return calcularPrecio(
            costoNum,
            totalGastos,
            formData.tipoUtilidad || "servicio",
            configuracion
        );
    }, [formData.cost, formData.tipoUtilidad, gastos, configuracion]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatearNumero = (valor: string): string => {
        if (!valor) return "";
        const numero = parseFloat(valor);
        if (isNaN(numero)) return "";
        if (numero < 0) return "0.00";
        return numero.toFixed(2);
    };

    const validarNumeroInput = (valor: string): string => {
        if (!valor) return "";
        const valorLimpio = valor.replace(/[^0-9.]/g, "");
        const partes = valorLimpio.split(".");
        if (partes.length > 2) {
            return partes[0] + "." + partes.slice(1).join("");
        }
        if (partes[1] && partes[1].length > 2) {
            return partes[0] + "." + partes[1].substring(0, 2);
        }
        return valorLimpio;
    };

    const handleAgregarGasto = () => {
        if (!nuevoGastoNombre.trim()) {
            toast.error("Ingresa el concepto del gasto");
            return;
        }

        const costoNum = parseFloat(nuevoGastoCosto);
        if (isNaN(costoNum) || costoNum < 0) {
            toast.error("Ingresa un monto válido (no puede ser negativo)");
            return;
        }

        const costoFormateado = formatearNumero(nuevoGastoCosto);
        setGastos([...gastos, { nombre: nuevoGastoNombre, costo: costoFormateado }]);
        setNuevoGastoNombre("");
        setNuevoGastoCosto("");
    };

    const handleEliminarGasto = (index: number) => {
        setGastos(gastos.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        }

        if (formData.cost < 0) {
            newErrors.cost = "El costo no puede ser negativo";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setIsSubmitting(true);
            await onSave({
                ...formData,
                gastos: gastos.map((g) => ({
                    nombre: g.nombre,
                    costo: parseFloat(g.costo),
                })),
            });
            onClose();
        } catch (error) {
            console.error("Error guardando item:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {item?.id ? "Editar Item" : "Crear Nuevo Item"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nombre del Item como Textarea */}
                    <ZenTextarea
                        label="Nombre del Item"
                        name="name"
                        value={formData.name}
                        onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            if (errors.name) {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { name, ...rest } = errors;
                                setErrors(rest);
                            }
                        }}
                        error={errors.name}
                        placeholder="Ej: Fotografía de retrato"
                        minRows={2}
                        maxLength={200}
                        required
                    />

                    {/* Fila 1: Costo Base y Tipo de Utilidad (2 columnas) */}
                    <div className="grid grid-cols-2 gap-4">
                        <ZenInput
                            label="Costo Base (MXN)"
                            name="cost"
                            type="number"
                            value={formData.cost === 0 ? "" : formData.cost}
                            onChange={(e) => {
                                const value = e.target.value;
                                const cost = value === "" ? 0 : parseFloat(value);
                                if (!isNaN(cost)) {
                                    setFormData({ ...formData, cost });
                                    if (errors.cost) {
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        const { cost: _, ...rest } = errors;
                                        setErrors(rest);
                                    }
                                }
                            }}
                            error={errors.cost}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            required
                        />

                        {/* Tipo de utilidad */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-200 mb-2">
                                Tipo de Utilidad
                            </label>
                            <select
                                value={formData.tipoUtilidad || "servicio"}
                                onChange={(e) =>
                                    setFormData({ ...formData, tipoUtilidad: e.target.value as 'servicio' | 'producto' })
                                }
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100"
                            >
                                <option value="servicio">Servicio (30%)</option>
                                <option value="producto">Producto (40%)</option>
                            </select>
                        </div>
                    </div>

                    {/* Gastos */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-zinc-200">Gastos Adicionales</label>
                        {gastos.length > 0 && (
                            <div className="space-y-2">
                                {gastos.map((gasto, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded">
                                        <div className="flex-1">
                                            <p className="text-sm text-zinc-200">{gasto.nombre}</p>
                                            <p className="text-xs text-zinc-400">{formatCurrency(parseFloat(gasto.costo))}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleEliminarGasto(idx)}
                                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <ZenInput
                                placeholder="Concepto"
                                value={nuevoGastoNombre}
                                onChange={(e) => setNuevoGastoNombre(e.target.value)}
                            />
                            <ZenInput
                                placeholder="Costo"
                                type="number"
                                value={nuevoGastoCosto}
                                onChange={(e) => setNuevoGastoCosto(validarNumeroInput(e.target.value))}
                                step="0.01"
                                min="0"
                            />
                            <ZenButton
                                type="button"
                                onClick={handleAgregarGasto}
                                variant="secondary"
                                className="flex-shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                            </ZenButton>
                        </div>
                    </div>

                    {/* Desglose de precios */}
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setShowDesglosePrecios(!showDesglosePrecios)}
                            className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-zinc-100"
                        >
                            Desglose de Precios
                            {showDesglosePrecios ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Precio Calculado del Sistema - SIEMPRE VISIBLE */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-emerald-300">Precio del Sistema</span>
                                <span className="text-3xl font-bold text-emerald-400">
                                    {formatCurrency(resultadoPrecio.precio_final)}
                                </span>
                            </div>
                            <p className="text-xs text-emerald-300/70">
                                Costo: {formatCurrency(resultadoPrecio.costo)} + Gastos: {formatCurrency(resultadoPrecio.gasto)} = {formatCurrency(resultadoPrecio.precio_final)}
                            </p>
                        </div>

                        {showDesglosePrecios && (
                            <div className="bg-zinc-800/50 p-4 rounded space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Costo Base:</span>
                                    <span className="text-zinc-100">{formatCurrency(resultadoPrecio.costo)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Gastos:</span>
                                    <span className="text-zinc-100">{formatCurrency(resultadoPrecio.gasto)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Utilidad Base ({resultadoPrecio.porcentaje_utilidad}%):</span>
                                    <span className="text-zinc-100">{formatCurrency(resultadoPrecio.utilidad_base)}</span>
                                </div>
                                <div className="border-t border-zinc-600 pt-2 flex justify-between font-semibold">
                                    <span className="text-zinc-300">Subtotal:</span>
                                    <span className="text-emerald-400">{formatCurrency(resultadoPrecio.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Comisión ({resultadoPrecio.porcentaje_comision}%):</span>
                                    <span className="text-zinc-100">{formatCurrency(resultadoPrecio.monto_comision)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Sobreprecio ({resultadoPrecio.porcentaje_sobreprecio}%):</span>
                                    <span className="text-zinc-100">{formatCurrency(resultadoPrecio.monto_sobreprecio)}</span>
                                </div>
                                <div className="border-t border-zinc-600 pt-2 flex justify-between font-bold text-lg">
                                    <span className="text-zinc-200">Precio Final:</span>
                                    <span className="text-emerald-500">{formatCurrency(resultadoPrecio.precio_final)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <ZenTextarea
                        label="Descripción (Opcional)"
                        name="description"
                        value={formData.description || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Describe el item..."
                        rows={3}
                    />

                    <div className="flex gap-3 pt-4">
                        <ZenButton
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            loading={isSubmitting}
                            loadingText="Guardando..."
                            className="flex-1"
                        >
                            {item?.id ? "Actualizar" : "Crear"}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
