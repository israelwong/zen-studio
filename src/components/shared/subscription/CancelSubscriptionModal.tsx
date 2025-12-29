"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import { AlertTriangle, Calendar, Database, XCircle, Link2, Users, Clock } from 'lucide-react';

interface CancelSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  subscriptionEndDate: Date | null;
  loading?: boolean;
}

export function CancelSubscriptionModal({
  open,
  onClose,
  onConfirm,
  subscriptionEndDate,
  loading = false,
}: CancelSubscriptionModalProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const retentionDate = subscriptionEndDate
    ? new Date(new Date(subscriptionEndDate).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-white text-xl">
              ¿Cancelar tu suscripción?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-zinc-300 text-sm mb-4">
            Antes de continuar, es importante que sepas qué pasará con tu cuenta y datos:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-zinc-300 space-y-4">
          <div className="space-y-3">
              {/* Acceso hasta vencimiento */}
              <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">Acceso hasta el vencimiento</div>
                  <div className="text-zinc-400 text-sm">
                    {subscriptionEndDate
                      ? `Podrás acceder a tu estudio hasta el ${formatDate(subscriptionEndDate)}.`
                      : 'Podrás acceder hasta el final de tu período actual.'}
                  </div>
                </div>
              </div>

              {/* Retención de datos */}
              <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Database className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">Retención de datos (30 días)</div>
                  <div className="text-zinc-400 text-sm">
                    Mantendremos tus datos activos durante 30 días posteriores a la cancelación
                    {retentionDate && ` (hasta el ${formatDate(retentionDate)})`} por si decides regresar.
                    No perderás tu configuración durante este período.
                  </div>
                </div>
              </div>

              {/* Después del período de retención */}
              <div className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg border border-red-800/50">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">
                    Después del período de retención
                  </div>
                  <div className="text-zinc-400 text-sm space-y-1">
                    <div>Pasados los 30 días, se realizarán las siguientes acciones automáticamente:</div>
                    <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                      <li>Se desvincularán las integraciones de Google Drive</li>
                      <li>Se desvincularán los contactos de Google Contacts</li>
                      <li>Se cancelarán los eventos del calendario de Google Calendar</li>
                      <li>Se cancelarán las tareas operativas sincronizadas</li>
                      <li>Google Drive ya no estará disponible</li>
                      <li>Tus clientes ya no podrán acceder a su portal</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recordatorio de emails */}
              <div className="flex items-start gap-3 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
                <Clock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">Recordatorios automáticos</div>
                  <div className="text-zinc-400 text-sm">
                    Te enviaremos correos automáticos recordándote que tienes N días para regresar
                    antes de que tus datos se eliminen permanentemente.
                  </div>
                </div>
              </div>
          </div>

          <div className="pt-2 border-t border-zinc-700">
            <div className="text-amber-300 text-sm font-medium mb-2">
              ⚠️ Esta acción no se puede deshacer después del período de retención.
            </div>
            <div className="text-zinc-400 text-sm">
              Al confirmar, serás redirigido al portal de Stripe donde podrás completar la cancelación de tu suscripción.
            </div>
          </div>
        </div>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
          >
            Mantener Suscripción
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Redirigiendo...' : 'Sí, ir a Stripe para cancelar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

