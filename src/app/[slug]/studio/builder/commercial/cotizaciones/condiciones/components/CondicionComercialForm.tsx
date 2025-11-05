'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ZenButton,
    ZenInput,
    ZenTextarea
} from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { Modal } from '@/components/ui/shadcn/modal';
import { Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
    crearCondicionComercial,
    actualizarCondicionComercial,
    obtenerConfiguracionPrecios
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { createCondicionComercialSchema, type CondicionComercialForm as CondicionComercialFormType } from '@/lib/actions/schemas/condiciones-comerciales-schemas';
import { CondicionComercialData } from '../types';

interface CondicionComercialFormProps {
    studioSlug: string;
    condicion?: CondicionComercialData | null;
    onClose: () => void;
    onSuccess?: (condicion: CondicionComercialData) => void; // Callback para actualización local
}

export function CondicionComercialForm({ studioSlug, condicion, onClose, onSuccess }: CondicionComercialFormProps) {
    const [loading, setLoading] = useState(false);
    const [sobreprecio, setSobreprecio] = useState<number>(0);
    const isEditing = !!condicion;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        reset
    } = useForm<CondicionComercialFormType>({
        resolver: zodResolver(createCondicionComercialSchema(sobreprecio)),
        defaultValues: {
            nombre: '',
            descripcion: '',
            porcentaje_descuento: '',
            porcentaje_anticipo: '',
            status: 'active',
            orden: 0,
        }
    });

    // Cargar datos si estamos editando
    useEffect(() => {
        if (condicion) {
            reset({
                nombre: condicion.nombre,
                descripcion: condicion.descripcion || '',
                porcentaje_descuento: condicion.porcentaje_descuento?.toString() || '',
                porcentaje_anticipo: condicion.porcentaje_anticipo?.toString() || '',
                status: (condicion.status === 'active' || condicion.status === 'inactive')
                    ? condicion.status
                    : 'active' as 'active' | 'inactive',
                orden: condicion.orden ?? 0,
            });
        }
    }, [condicion, reset]);

    // Cargar configuración de precios para obtener sobreprecio
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const result = await obtenerConfiguracionPrecios(studioSlug);
                if (result.success && result.data) {
                    setSobreprecio(result.data.sobreprecio);
                }
            } catch (error) {
                console.error('Error al cargar configuración de precios:', error);
            }
        };

        cargarConfiguracion();
    }, [studioSlug]);

    const onSubmit = async (data: CondicionComercialFormType) => {
        // Validaciones personalizadas
        if (data.porcentaje_descuento) {
            const descuento = parseFloat(data.porcentaje_descuento);
            if (sobreprecio === 0) {
                toast.error('No se puede aplicar descuento. Configura el sobreprecio en Configuración de Precios primero.');
                return;
            }
            if (descuento > Math.round(sobreprecio * 100)) {
                toast.error(`El descuento (${descuento}%) no puede ser mayor al sobreprecio configurado (${Math.round(sobreprecio * 100)}%)`);
                return;
            }
        }

        if (data.porcentaje_anticipo) {
            const anticipo = parseFloat(data.porcentaje_anticipo);
            if (anticipo > 100) {
                toast.error('El anticipo no puede ser mayor al 100%');
                return;
            }
        }

        setLoading(true);
        const loadingToast = toast.loading(
            isEditing ? 'Actualizando condición comercial...' : 'Creando condición comercial...'
        );

        try {
            let result;

            if (isEditing && condicion) {
                result = await actualizarCondicionComercial(studioSlug, condicion.id, data);
            } else {
                result = await crearCondicionComercial(studioSlug, data);
            }

            // Cerrar toast de loading
            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success(
                    isEditing
                        ? 'Condición comercial actualizada exitosamente'
                        : 'Condición comercial creada exitosamente'
                );

                // Actualización local optimista
                if (onSuccess && result.data) {
                    onSuccess(result.data);
                }

                onClose();
            } else {
                const fieldErrors = result.error ? Object.values(result.error).flat() : [];
                const errorMessage = fieldErrors[0] || 'Hubo un error al guardar. Inténtalo de nuevo.';
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error al guardar condición:', error);
            // Cerrar toast de loading en caso de error
            toast.dismiss(loadingToast);
            toast.error('Error interno del servidor. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Observar cambios para preview
    const watchedValues = watch();

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={isEditing ? 'Editar Condición Comercial' : 'Nueva Condición Comercial'}
            description={isEditing
                ? 'Modifica los detalles de la condición comercial'
                : 'Define una nueva condición comercial para tu negocio'
            }
            maxWidth="2xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Nombre */}
                <ZenInput
                    label="Nombre *"
                    id="nombre"
                    {...register('nombre')}
                    placeholder="Ej: Pago de contado, 50% anticipo"
                    error={errors.nombre?.message}
                />

                {/* Descripción */}
                <ZenTextarea
                    label="Descripción"
                    id="descripcion"
                    {...register('descripcion')}
                    placeholder="Describe los términos de esta condición comercial"
                    minRows={3}
                />

                {/* Porcentajes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Porcentaje de Descuento */}
                    <ZenInput
                        label="Descuento (%)"
                        id="porcentaje_descuento"
                        type="number"
                        min="0"
                        max={sobreprecio > 0 ? (sobreprecio * 100) : 100}
                        step="1"
                        {...register('porcentaje_descuento')}
                        placeholder="0"
                        error={errors.porcentaje_descuento?.message}
                        hint={
                            sobreprecio > 0
                                ? `Máximo descuento permitido: ${Math.round(sobreprecio * 100)}% (según sobreprecio configurado)`
                                : 'No hay sobreprecio configurado. Configura el sobreprecio en Configuración de Precios para permitir descuentos.'
                        }
                    />

                    {/* Porcentaje de Anticipo */}
                    <ZenInput
                        label="Anticipo (%)"
                        id="porcentaje_anticipo"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        {...register('porcentaje_anticipo')}
                        placeholder="0"
                        error={errors.porcentaje_anticipo?.message}
                        hint="Máximo anticipo permitido: 100%"
                    />
                </div>

                {/* Estatus */}
                <div className="flex items-center space-x-3">
                    <Switch
                        id="status"
                        checked={watchedValues.status === 'active'}
                        onCheckedChange={(checked) => setValue('status', checked ? 'active' : 'inactive')}
                    />
                    <div className="flex items-center space-x-2">
                        <span>Condición activa</span>
                        {watchedValues.status === 'active' ? (
                            <span className="text-green-400 text-sm">(Activa)</span>
                        ) : (
                            <span className="text-zinc-500 text-sm">(Inactiva)</span>
                        )}
                    </div>
                </div>

                {/* Preview */}
                {(watchedValues.porcentaje_descuento || watchedValues.porcentaje_anticipo) && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                        <h4 className="font-medium text-white flex items-center space-x-2">
                            <span>Vista Previa</span>
                        </h4>

                        {/* Información de sobreprecio */}
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
                            <p className="text-sm text-zinc-300">
                                <span className="text-yellow-400 font-medium">Sobreprecio configurado:</span> {Math.round(sobreprecio * 100)}%
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                                Este es el máximo descuento que puedes aplicar sin afectar la utilidad base
                            </p>
                        </div>

                        <div className="text-sm text-zinc-300 space-y-2">
                            {watchedValues.porcentaje_descuento && (
                                <div className="flex items-center justify-between">
                                    <span className="text-green-400">Descuento aplicado:</span>
                                    <span className="font-medium">{watchedValues.porcentaje_descuento}%</span>
                                </div>
                            )}
                            {watchedValues.porcentaje_anticipo && (
                                <div className="flex items-center justify-between">
                                    <span className="text-blue-400">Anticipo requerido:</span>
                                    <span className="font-medium">{watchedValues.porcentaje_anticipo}%</span>
                                </div>
                            )}
                        </div>

                        {/* Advertencias */}
                        {sobreprecio === 0 && watchedValues.porcentaje_descuento && (
                            <div className="flex items-start space-x-2 text-amber-400 text-xs bg-amber-900/20 p-2 rounded">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>No hay sobreprecio configurado. Configura el sobreprecio en Configuración de Precios para permitir descuentos.</span>
                            </div>
                        )}

                        {sobreprecio > 0 && watchedValues.porcentaje_descuento && parseFloat(watchedValues.porcentaje_descuento) > Math.round(sobreprecio * 100) && (
                            <div className="flex items-start space-x-2 text-red-400 text-xs bg-red-900/20 p-2 rounded">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>El descuento excede el sobreprecio configurado. Esto afectará la utilidad base.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4">
                    <ZenButton type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </ZenButton>
                    <ZenButton type="submit" variant="primary" loading={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                    </ZenButton>
                </div>
            </form>
        </Modal>
    );
}

