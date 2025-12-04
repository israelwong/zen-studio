'use client';

import React from 'react';

interface ProfileNavTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

/**
 * ProfileNavTabs - Componente para navegación de tabs del perfil público
 * Versión compacta sin iconos
 * 
 * Usado en:
 * - Perfil público (navegación de tabs)
 * - Preview del builder
 */
export function ProfileNavTabs({ activeTab, onTabChange }: ProfileNavTabsProps) {
    const tabs = [
        { id: 'inicio', label: 'Inicio' },
        { id: 'portafolio', label: 'Portafolio' },
        { id: 'contacto', label: 'Contacto' },
        { id: 'faq', label: 'FAQ' },
    ];

    return (
        <div className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-lg">
            <nav className="flex">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                relative flex-1 py-3 text-xs font-medium
                                transition-all duration-200
                                ${isActive
                                    ? 'text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }
                            `}
                        >
                            {tab.label}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
