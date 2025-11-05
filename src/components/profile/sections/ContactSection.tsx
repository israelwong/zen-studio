'use client';

import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { PublicStudioProfile, PublicContactInfo } from '@/types/public-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';

interface Horario {
    dia: string;
    apertura: string;
    cierre: string;
    cerrado: boolean;
}

interface HorarioAgrupado {
    dias: string;
    horario: string;
}

interface InfoViewProps {
    studio: PublicStudioProfile;
    contactInfo: PublicContactInfo;
}

interface PhoneOption {
    id: string;
    number: string;
    label: string | null;
}

/**
 * InfoView - Business information and contact details
 * Uses ZenButton and ZenCard from ZEN Design System
 * Shows contact actions, location, and social links
 */
export function ContactSection({ studio, contactInfo }: InfoViewProps) {
    const [phoneModal, setPhoneModal] = useState<{ open: boolean; phones: PhoneOption[]; action: 'call' | 'whatsapp' } | null>(null);

    // Función para traducir días de la semana al español
    const traducirDia = (dia: string): string => {
        const traducciones: { [key: string]: string } = {
            'monday': 'Lunes',
            'tuesday': 'Martes',
            'wednesday': 'Miércoles',
            'thursday': 'Jueves',
            'friday': 'Viernes',
            'saturday': 'Sábado',
            'sunday': 'Domingo'
        };
        return traducciones[dia.toLowerCase()] || dia;
    };

    // Función para formatear días en rangos legibles
    const formatearDias = (dias: string[]): string => {
        if (dias.length === 0) return '';
        if (dias.length === 1) return dias[0];
        if (dias.length === 2) return dias.join(' y ');

        // Ordenar días según el orden de la semana
        const ordenDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const diasOrdenados = dias.sort((a, b) =>
            ordenDias.indexOf(a) - ordenDias.indexOf(b)
        );

        // Verificar si son días consecutivos
        const esConsecutivo = diasOrdenados.every((dia, index) => {
            if (index === 0) return true;
            const diaActual = ordenDias.indexOf(dia);
            const diaAnterior = ordenDias.indexOf(diasOrdenados[index - 1]);
            return diaActual === diaAnterior + 1;
        });

        if (esConsecutivo && diasOrdenados.length > 2) {
            return `${diasOrdenados[0]} a ${diasOrdenados[diasOrdenados.length - 1]}`;
        }

        return diasOrdenados.join(', ');
    };

    // Función para agrupar horarios por horario similar
    const agruparHorarios = (horarios: Horario[]): HorarioAgrupado[] => {
        const grupos: { [key: string]: string[] } = {};

        horarios.forEach(horario => {
            if (horario.cerrado) {
                // Agrupar días cerrados
                const key = 'Cerrado';
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(traducirDia(horario.dia));
            } else {
                // Agrupar por horario
                const key = `${horario.apertura} - ${horario.cierre}`;
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(traducirDia(horario.dia));
            }
        });

        return Object.entries(grupos).map(([horario, dias]) => ({
            dias: formatearDias(dias),
            horario
        }));
    };

    const horariosAgrupados = contactInfo.horarios && Array.isArray(contactInfo.horarios)
        ? agruparHorarios(contactInfo.horarios)
        : [];

    // Lógica de botones: 1 teléfono = acción directa, 2+ = modal
    const handleCallAction = () => {
        const callPhones = contactInfo.phones.filter(p =>
            p.is_active && (p.type === 'LLAMADAS' || p.type === 'AMBOS')
        );

        if (callPhones.length === 0) return;

        if (callPhones.length === 1) {
            // Acción directa
            window.location.href = `tel:${callPhones[0].number}`;
        } else {
            // Mostrar modal
            setPhoneModal({
                open: true,
                phones: callPhones.map(p => ({ id: p.id, number: p.number, label: p.label })),
                action: 'call'
            });
        }
    };

    const handleWhatsAppAction = () => {
        const whatsappPhones = contactInfo.phones.filter(p =>
            p.is_active && (p.type === 'WHATSAPP' || p.type === 'AMBOS')
        );

        if (whatsappPhones.length === 0) return;

        if (whatsappPhones.length === 1) {
            // Acción directa
            const cleanNumber = whatsappPhones[0].number.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        } else {
            // Mostrar modal
            setPhoneModal({
                open: true,
                phones: whatsappPhones.map(p => ({ id: p.id, number: p.number, label: p.label })),
                action: 'whatsapp'
            });
        }
    };

    const handlePhoneSelect = (phone: PhoneOption) => {
        if (phoneModal?.action === 'call') {
            window.location.href = `tel:${phone.number}`;
        } else {
            const cleanNumber = phone.number.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        }
        setPhoneModal(null);
    };

    // Temporalmente deshabilitado
    // const handleSchedule = () => {
    //     // TODO: Open scheduling modal or redirect to booking page
    //     console.log('Schedule appointment clicked');
    // };

    // Contar teléfonos disponibles por tipo
    const callPhonesCount = contactInfo.phones.filter(p =>
        p.is_active && (p.type === 'LLAMADAS' || p.type === 'AMBOS')
    ).length;

    const whatsappPhonesCount = contactInfo.phones.filter(p =>
        p.is_active && (p.type === 'WHATSAPP' || p.type === 'AMBOS')
    ).length;

    return (
        <div className="px-4 space-y-6">

            {/* Business Description */}
            {studio.presentation && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-500">Presentación del negocio</h3>
                    <p className="text-zinc-300 leading-relaxed">
                        {studio.presentation.charAt(0).toUpperCase() + studio.presentation.slice(1)}
                    </p>
                </div>
            )}

            {/* Botones de contacto */}
            <div className="space-y-3">
                {/* <h3 className="text-sm font-medium text-zinc-500">Contacto</h3> */}
                <div className="space-y-3">
                    {/* Botón de llamada */}
                    {callPhonesCount > 0 && (
                        <ZenButton
                            variant="outline"
                            onClick={handleCallAction}
                            className="w-full rounded-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 py-3"
                        >
                            <Phone className="h-4 w-4" />
                            Llamar
                        </ZenButton>
                    )}

                    {/* Botón de WhatsApp */}
                    {whatsappPhonesCount > 0 && (
                        <ZenButton
                            variant="outline"
                            onClick={handleWhatsAppAction}
                            className="w-full rounded-full flex items-center justify-center gap-2 bg-green-800 hover:bg-green-700 py-3"
                        >
                            <WhatsAppIcon className="h-4 w-4" />
                            WhatsApp
                        </ZenButton>
                    )}

                    {/* Botón de Agendar - Temporalmente deshabilitado
                    <ZenButton
                        variant="outline"
                        onClick={handleSchedule}
                        className="w-full rounded-full flex items-center justify-center gap-2 py-3"
                    >
                        <Calendar className="h-4 w-4" />
                        Agendar
                    </ZenButton> */}
                </div>
            </div>

            {/* Work Zones */}
            {studio.zonas_trabajo && studio.zonas_trabajo.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-500">Zonas de trabajo</h3>
                    <div className="flex flex-wrap gap-2">
                        {studio.zonas_trabajo.map((zona) => (
                            <ZenBadge key={zona.id} variant="outline" className="text-xs">
                                {zona.nombre}
                            </ZenBadge>
                        ))}
                    </div>
                </div>
            )}

            {/* Horarios de atención */}
            {horariosAgrupados.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                        Horarios
                    </h3>
                    <div className="space-y-1.5">
                        {horariosAgrupados.map((grupo, index) => (
                            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className="text-zinc-300 font-medium text-xs leading-tight">
                                    {grupo.dias}
                                </span>
                                <span className="text-zinc-400 bg-zinc-800/40 px-2 py-1 rounded-full text-xs inline-block w-fit">
                                    {grupo.horario}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Location */}
            {contactInfo.address && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-500">Ubicación</h3>
                    <p className="text-zinc-300">{contactInfo.address}</p>
                    {contactInfo.google_maps_url && (
                        <a
                            href={contactInfo.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors underline decoration-dotted underline-offset-2"
                        >
                            - abrir en Google Maps
                        </a>
                    )}
                </div>
            )}

            {/* Modal de selección de teléfono */}
            <Dialog open={phoneModal?.open || false} onOpenChange={() => setPhoneModal(null)}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-zinc-100">
                            {phoneModal?.action === 'call' ? (
                                <>
                                    <Phone className="h-5 w-5 text-blue-400" />
                                    Selecciona un teléfono
                                </>
                            ) : (
                                <>
                                    <WhatsAppIcon className="h-5 w-5 text-green-400" />
                                    Selecciona un WhatsApp
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                        {phoneModal?.phones.map((phone) => (
                            <button
                                key={phone.id}
                                onClick={() => handlePhoneSelect(phone)}
                                className="w-full p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                            >
                                {phone.label && (
                                    <span className="text-sm text-zinc-400 block mb-1">
                                        {phone.label}
                                    </span>
                                )}
                                <span className="text-white font-medium text-lg">
                                    {phone.number}
                                </span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
