'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { InicioData, FeaturedContent } from '../types';
import { Grid3X3, Package, Check, X } from 'lucide-react';

interface InicioSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: InicioData | null;
}

export function InicioSettingsModal({ isOpen, onClose, data }: InicioSettingsModalProps) {
    const [featuredContent, setFeaturedContent] = useState<FeaturedContent>({
        portfolios: [],
        items: []
    });

    // Cargar contenido destacado cuando se abre el modal
    useEffect(() => {
        if (data) {
            setFeaturedContent({
                portfolios: data.featured_portfolios.map(p => p.id),
                items: data.featured_items.map(i => i.id)
            });
        }
    }, [data, isOpen]);

    const handlePortfolioToggle = (portfolioId: string) => {
        setFeaturedContent(prev => ({
            ...prev,
            portfolios: prev.portfolios.includes(portfolioId)
                ? prev.portfolios.filter(id => id !== portfolioId)
                : [...prev.portfolios, portfolioId]
        }));
    };

    const handleItemToggle = (itemId: string) => {
        setFeaturedContent(prev => ({
            ...prev,
            items: prev.items.includes(itemId)
                ? prev.items.filter(id => id !== itemId)
                : [...prev.items, itemId]
        }));
    };

    const handleSave = () => {
        // Aquí se implementaría la lógica para guardar la configuración
        console.log('Guardando configuración de inicio:', featuredContent);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configuración de Página de Inicio</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Portafolios destacados */}
                    <ZenCard variant="outline" className="p-4">
                        <ZenCardHeader className="pb-3">
                            <ZenCardTitle className="text-base flex items-center gap-2">
                                <Grid3X3 className="h-4 w-4 text-purple-400" />
                                Portafolios Destacados
                            </ZenCardTitle>
                        </ZenCardHeader>
                        <ZenCardContent>
                            <p className="text-sm text-zinc-400 mb-4">
                                Selecciona los portafolios que quieres mostrar en la página de inicio
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {data?.featured_portfolios.map((portfolio) => (
                                    <div
                                        key={portfolio.id}
                                        onClick={() => handlePortfolioToggle(portfolio.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${featuredContent.portfolios.includes(portfolio.id)
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            }`}
                                    >
                                        {featuredContent.portfolios.includes(portfolio.id) ? (
                                            <Check className="h-4 w-4 text-blue-400" />
                                        ) : (
                                            <X className="h-4 w-4 text-zinc-500" />
                                        )}
                                        {portfolio.cover_image_url ? (
                                            <img
                                                src={portfolio.cover_image_url}
                                                alt={portfolio.title}
                                                className="w-8 h-8 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center">
                                                <Grid3X3 className="h-4 w-4 text-zinc-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">
                                                {portfolio.title}
                                            </p>
                                            {portfolio.category && (
                                                <p className="text-xs text-zinc-400">{portfolio.category}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Items destacados */}
                    <ZenCard variant="outline" className="p-4">
                        <ZenCardHeader className="pb-3">
                            <ZenCardTitle className="text-base flex items-center gap-2">
                                <Package className="h-4 w-4 text-green-400" />
                                Items Destacados
                            </ZenCardTitle>
                        </ZenCardHeader>
                        <ZenCardContent>
                            <p className="text-sm text-zinc-400 mb-4">
                                Selecciona los items que quieres mostrar en la página de inicio
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {data?.featured_items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemToggle(item.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${featuredContent.items.includes(item.id)
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            }`}
                                    >
                                        {featuredContent.items.includes(item.id) ? (
                                            <Check className="h-4 w-4 text-blue-400" />
                                        ) : (
                                            <X className="h-4 w-4 text-zinc-500" />
                                        )}
                                        <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center">
                                            <Package className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {item.type} • ${item.cost.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-3 pt-4">
                        <ZenButton
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={handleSave}
                        >
                            Guardar Configuración
                        </ZenButton>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
