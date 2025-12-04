'use client';

import React, { useState, useEffect } from 'react';
import { ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { actualizarEmailStudio } from '@/lib/actions/studio/profile/email';

interface EmailSectionProps {
    email?: string | null;
    studioSlug: string;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function EmailSection({ email: initialEmail, studioSlug, loading = false, onDataChange }: EmailSectionProps) {
    const [email, setEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setEmail(initialEmail || '');
    }, [initialEmail]);

    const handleSave = async () => {
        if (!email.trim()) {
            toast.error('Ingresa un correo electrónico');
            return;
        }

        // Validación básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error('Ingresa un correo electrónico válido');
            return;
        }

        setIsSaving(true);

        try {
            const result = await actualizarEmailStudio(studioSlug, email.trim());

            if (result.success) {
                toast.success('Correo electrónico actualizado');
                await onDataChange?.();
            } else {
                throw new Error(result.error || 'Error al actualizar correo');
            }
        } catch (error) {
            console.error('Error saving email:', error);
            toast.error(error instanceof Error ? error.message : 'Error al guardar correo');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-400" />
                        <ZenCardTitle>Correo electrónico</ZenCardTitle>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="space-y-4 animate-pulse">
                        <div className="h-10 bg-zinc-800/50 rounded-lg"></div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        );
    }

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-400" />
                    <ZenCardTitle>Correo electrónico</ZenCardTitle>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-6 space-y-4">
                <ZenInput
                    label="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@estudio.com"
                    type="email"
                />

                <button
                    onClick={handleSave}
                    disabled={isSaving || !email.trim()}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </ZenCardContent>
        </ZenCard>
    );
}
