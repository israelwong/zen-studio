'use client';

import { useState } from 'react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenBadge,
} from '@/components/ui/zen';
import { FileText, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { signContract } from '@/lib/actions/cliente/contract.actions';

interface ClientContractViewCardProps {
  studioSlug: string;
  contactId: string;
  contract: {
    id: string;
    content: string;
    status: string;
    created_at: Date | string;
    signed_at?: Date | string | null;
  };
  cotizacionStatus: string;
  onSuccess?: () => void;
}

export function ClientContractViewCard({
  studioSlug,
  contactId,
  contract,
  cotizacionStatus,
  onSuccess,
}: ClientContractViewCardProps) {
  const [isSigning, setIsSigning] = useState(false);

  // Validar que el contrato tenga contenido
  if (!contract?.content) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800">
          <ZenCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Tu Contrato
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <p className="text-sm text-zinc-400">El contrato aún no está disponible.</p>
        </ZenCardContent>
      </ZenCard>
    );
  }

  const handleSign = async () => {
    setIsSigning(true);
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const clientIp = ipData.ip || '0.0.0.0';

      const result = await signContract(studioSlug, contactId, {
        contract_id: contract.id,
        ip_address: clientIp,
      });

      if (result.success) {
        toast.success('Contrato firmado exitosamente');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al firmar contrato');
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Error al firmar contrato');
    } finally {
      setIsSigning(false);
    }
  };

  const getStatusBadge = () => {
    if (contract.status === 'SIGNED') {
      return (
        <ZenBadge variant="success" className="text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Firmado
        </ZenBadge>
      );
    }
    if (contract.status === 'PUBLISHED') {
      return (
        <ZenBadge variant="info" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente de Firma
        </ZenBadge>
      );
    }
    return (
      <ZenBadge variant="secondary" className="text-xs">
        {contract.status}
      </ZenBadge>
    );
  };

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Tu Contrato
          </ZenCardTitle>
          {getStatusBadge()}
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-6">
        <div className="space-y-4">
          {/* Preview del contrato inline - contenido ya renderizado desde snapshot */}
          <div className="overflow-y-auto max-h-[400px] p-4 bg-white text-black rounded-lg border border-zinc-700">
            <style dangerouslySetInnerHTML={{
              __html: `
                .contract-preview-client {
                  color: rgb(0, 0, 0);
                  font-size: 0.875rem;
                  line-height: 1.5;
                }
                .contract-preview-client br {
                  display: block;
                  margin: 0.5rem 0;
                }
                .contract-preview-client h1 {
                  font-size: 1.5rem !important;
                  font-weight: 700 !important;
                  line-height: 1.2 !important;
                  margin-top: 1.5rem !important;
                  margin-bottom: 1rem !important;
                  color: rgb(0, 0, 0) !important;
                  text-transform: uppercase;
                }
                .contract-preview-client h1:first-child {
                  margin-top: 0 !important;
                }
                .contract-preview-client h2 {
                  font-size: 1.25rem;
                  font-weight: 600;
                  margin-top: 1rem;
                  margin-bottom: 0.5rem;
                  color: rgb(0, 0, 0);
                }
                .contract-preview-client h3 {
                  font-size: 1.125rem;
                  font-weight: 500;
                  margin-top: 0.75rem;
                  margin-bottom: 0.5rem;
                  color: rgb(0, 0, 0);
                }
                .contract-preview-client p {
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  line-height: 1.6;
                  color: rgb(0, 0, 0);
                }
                .contract-preview-client ul,
                .contract-preview-client ol {
                  list-style-position: outside;
                  padding-left: 1.5rem;
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  color: rgb(0, 0, 0);
                }
                .contract-preview-client ul {
                  list-style-type: disc;
                }
                .contract-preview-client ol {
                  list-style-type: decimal;
                }
                .contract-preview-client ul li,
                .contract-preview-client ol li {
                  margin-top: 0.25rem;
                  margin-bottom: 0.25rem;
                  padding-left: 0.5rem;
                  line-height: 1.5;
                  display: list-item;
                }
                .contract-preview-client strong {
                  font-weight: 600;
                  color: rgb(0, 0, 0);
                }
                .contract-preview-client em {
                  font-style: italic;
                  color: rgb(0, 0, 0);
                }
                .contract-preview-client table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1rem 0;
                }
                .contract-preview-client table td,
                .contract-preview-client table th {
                  padding: 0.5rem;
                  border: 1px solid rgb(200, 200, 200);
                  text-align: left;
                }
                .contract-preview-client table th {
                  font-weight: 600;
                  background-color: rgb(240, 240, 240);
                }
              `
            }} />
            <div
              className="contract-preview-client"
              dangerouslySetInnerHTML={{ __html: contract.content || '' }}
            />
          </div>

          {/* Botón de firmar solo si no está firmado */}
          {contract.status === 'PUBLISHED' && (
            <ZenButton
              onClick={handleSign}
              disabled={isSigning}
              className="w-full"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Firmar Contrato
                </>
              )}
            </ZenButton>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

