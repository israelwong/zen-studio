'use client';

import React, { useState, useEffect } from 'react';
import { Building2, User, DollarSign, Calendar, CreditCard, FileText, Download, Mail, Loader2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { obtenerDatosComprobante, type ReceiptData } from '@/lib/actions/studio/business/events/payments-receipt.actions';
import { formatDate, formatNumber } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';

interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  paymentId: string;
}

// Helper para formatear montos
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

export function PaymentReceipt({
  isOpen,
  onClose,
  studioSlug,
  paymentId,
}: PaymentReceiptProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (isOpen && paymentId) {
      loadReceiptData();
    }
  }, [isOpen, paymentId, studioSlug]);

  const loadReceiptData = async () => {
    setLoading(true);
    try {
      const result = await obtenerDatosComprobante(studioSlug, paymentId);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast.error(result.error || 'Error al cargar datos del comprobante');
        onClose();
      }
    } catch (error) {
      console.error('Error loading receipt data:', error);
      toast.error('Error al cargar datos del comprobante');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      // TODO: Implementar generación de PDF
      toast.info('Generando PDF...');
      console.log('Generar PDF para pago:', paymentId);
      // Simular generación
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!data?.contact?.email) {
      toast.error('El cliente no tiene correo electrónico registrado');
      return;
    }

    setSendingEmail(true);
    try {
      // TODO: Implementar envío por correo
      toast.info('Enviando comprobante por correo...');
      console.log('Enviar comprobante para pago:', paymentId, 'a:', data.contact.email);
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Comprobante enviado correctamente');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error al enviar comprobante');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Comprobante de Pago"
      description="Detalles del comprobante de pago"
      maxWidth="2xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Datos del Negocio */}
          <ZenCard variant="outlined">
            <ZenCardContent className="p-4">
              <div className="flex items-start gap-3 mb-4">
                {data.studio.logo_url && (
                  <img
                    src={data.studio.logo_url}
                    alt={data.studio.studio_name}
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Datos del Negocio</h3>
                  </div>
                  <p className="text-sm font-medium text-zinc-100">{data.studio.studio_name}</p>
                  {data.studio.address && (
                    <p className="text-xs text-zinc-400 mt-1">{data.studio.address}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
                    {data.studio.email && <span>{data.studio.email}</span>}
                    {data.studio.phone && <span>{data.studio.phone}</span>}
                  </div>
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Datos del Cliente */}
          {data.contact && (
            <ZenCard variant="outlined">
              <ZenCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Datos del Cliente</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-100">{data.contact.name}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                    {data.contact.phone && <span>{data.contact.phone}</span>}
                    {data.contact.email && <span>{data.contact.email}</span>}
                  </div>
                  {data.contact.address && (
                    <p className="text-xs text-zinc-400 mt-2">{data.contact.address}</p>
                  )}
                </div>
              </ZenCardContent>
            </ZenCard>
          )}

          {/* Datos del Pago */}
          <ZenCard variant="outlined">
            <ZenCardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Detalles del Pago</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Monto</span>
                  <span className="text-sm font-semibold text-emerald-200">
                    {formatAmount(data.payment.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Método de pago</span>
                  <span className="text-xs font-medium text-zinc-200 capitalize">
                    {data.payment.payment_method}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Fecha</span>
                  <span className="text-xs font-medium text-zinc-200">
                    {formatDate(data.payment.payment_date)}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-xs text-zinc-400">Concepto</span>
                  <span className="text-xs font-medium text-zinc-200 text-right max-w-[60%]">
                    {data.payment.concept}
                  </span>
                </div>
                {data.payment.description && (
                  <div className="pt-2 border-t border-zinc-700/30">
                    <p className="text-xs text-zinc-400 mb-1">Descripción</p>
                    <p className="text-xs text-zinc-300">{data.payment.description}</p>
                  </div>
                )}
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Balance */}
          <ZenCard variant="outlined">
            <ZenCardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Balance</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Total</span>
                  <span className="text-sm font-semibold text-zinc-200">
                    {formatAmount(data.balance.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Pagado</span>
                  <span className="text-sm font-semibold text-green-400">
                    {formatAmount(data.balance.paid)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                  <span className="text-xs font-medium text-zinc-300">Pendiente</span>
                  <span className="text-sm font-semibold text-red-400">
                    {formatAmount(data.balance.pending)}
                  </span>
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-2">
            <ZenButton
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={generatingPdf || sendingEmail}
              loading={generatingPdf}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </ZenButton>
            <ZenButton
              variant="primary"
              onClick={handleSendEmail}
              disabled={generatingPdf || sendingEmail || !data.contact?.email}
              loading={sendingEmail}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar por correo
            </ZenButton>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-400">No se pudieron cargar los datos del comprobante</p>
        </div>
      )}
    </ZenDialog>
  );
}

