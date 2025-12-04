'use client';

import React, { useState } from 'react';
import { Phone, Globe, Mail, Hash } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import InstagramIcon from '@/components/ui/icons/InstagramIcon';
import FacebookIcon from '@/components/ui/icons/FacebookIcon';
import TikTokIcon from '@/components/ui/icons/TikTokIcon';
import YouTubeIcon from '@/components/ui/icons/YouTubeIcon';
import LinkedInIcon from '@/components/ui/icons/LinkedInIcon';
import ThreadsIcon from '@/components/ui/icons/ThreadsIcon';
import SpotifyIcon from '@/components/ui/icons/SpotifyIcon';
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

    // Debug: Log para verificar datos recibidos
    console.log('🔍 [ContactSection] Datos recibidos:', {
        phones: contactInfo.phones,
        phonesLength: contactInfo.phones?.length || 0,
        phonesActive: contactInfo.phones?.filter(p => p.is_active) || []
    });

    // Función para obtener icono de red social
    const getSocialIcon = (plataforma: string | undefined | null) => {
        if (!plataforma || typeof plataforma !== 'string') {
            return <Globe className="w-4 h-4" />;
        }

        const platform = plataforma.toLowerCase();
        switch (platform) {
            case 'instagram':
                return <InstagramIcon className="w-4 h-4" />;
            case 'facebook':
                return <FacebookIcon className="w-4 h-4" />;
            case 'tiktok':
                return <TikTokIcon className="w-4 h-4" />;
            case 'youtube':
                return <YouTubeIcon className="w-4 h-4" />;
            case 'linkedin':
                return <LinkedInIcon className="w-4 h-4" />;
            case 'threads':
                return <ThreadsIcon className="w-4 h-4" />;
            case 'spotify':
                return <SpotifyIcon className="w-4 h-4" />;
            default:
                return <Globe className="w-4 h-4" />;
        }
    };

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
    const callPhones = contactInfo.phones.filter(p =>
        p.is_active && (p.type === 'LLAMADAS' || p.type === 'AMBOS')
    );
    const callPhonesCount = callPhones.length;

    const whatsappPhones = contactInfo.phones.filter(p =>
        p.is_active && (p.type === 'WHATSAPP' || p.type === 'AMBOS')
    );
    const whatsappPhonesCount = whatsappPhones.length;

    // Debug: Log para verificar datos
    console.log('🔍 [ContactSection] Phones data:', {
        allPhones: contactInfo.phones,
        callPhones,
        whatsappPhones,
        callPhonesCount,
        whatsappPhonesCount
    });

    return (
        <div className="px-4 space-y-6">

            {/* Business Description */}
            {studio.presentation && (
                <div className="space-y-2">
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        {studio.presentation.charAt(0).toUpperCase() + studio.presentation.slice(1)}
                    </p>
                </div>
            )}

            {/* Botones de contacto */}
            <div className="space-y-3">
                {/* Botón de WhatsApp */}
                {whatsappPhonesCount > 0 && (
                    <ZenButton
                        variant="outline"
                        onClick={handleWhatsAppAction}
                        className="w-full rounded-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 border-green-600 text-white py-3 shadow-sm"
                    >
                        <WhatsAppIcon className="h-5 w-5" />
                        <span className="font-medium">WhatsApp</span>
                    </ZenButton>
                )}

                {/* Botón de llamada */}
                {callPhonesCount > 0 && (
                    <ZenButton
                        variant="outline"
                        onClick={handleCallAction}
                        className="w-full rounded-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white py-3 shadow-sm"
                    >
                        <Phone className="h-5 w-5" />
                        <span className="font-medium">Llamar</span>
                    </ZenButton>
                )}
            </div>


            {/* Email */}
            {contactInfo.email && (
                <a
                    href={`mailto:${contactInfo.email}`}
                    className="flex items-center gap-3 px-4 py-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg transition-colors group"
                >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                        <Mail className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">Correo electrónico</p>
                        <p className="text-sm text-zinc-300 truncate">{contactInfo.email}</p>
                    </div>
                </a>
            )}

            {/* Website */}
            {studio.website && (
                <a
                    href={studio.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg transition-colors group"
                >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                        <Globe className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">Página web</p>
                        <p className="text-sm text-zinc-300 truncate">{studio.website}</p>
                    </div>
                </a>
            )}

            {/* Location */}
            {contactInfo.address && (
                <div className="px-4 py-3 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-500 mb-1">Dirección</p>
                            <p className="text-sm text-zinc-300 leading-relaxed">{contactInfo.address}</p>
                            {contactInfo.google_maps_url && (
                                <a
                                    href={contactInfo.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 mt-2"
                                >
                                    Ver en Google Maps
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Horarios de atención */}
            {horariosAgrupados.length > 0 && (
                <div className="px-4 py-3 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-500 mb-2">Horarios de atención</p>
                            <div className="space-y-2">
                                {horariosAgrupados.map((grupo, index) => (
                                    <div key={index} className="flex items-center justify-between gap-2">
                                        <span className="text-sm text-zinc-300 font-medium">
                                            {grupo.dias}
                                        </span>
                                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                                            {grupo.horario}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Especialidades con # */}
            {studio.keywords && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {(Array.isArray(studio.keywords)
                            ? studio.keywords
                            : studio.keywords.split(',')
                        ).map((palabra, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800/40 hover:bg-zinc-800/60 rounded-full text-xs text-zinc-300 transition-colors"
                            >
                                <Hash className="w-3 h-3 text-zinc-500" />
                                {typeof palabra === 'string' ? palabra.trim() : palabra}
                            </span>
                        ))}
                    </div>
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
