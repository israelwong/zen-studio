'use client';

import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import { ProgressStepItem } from './ProgressStepItem';

type ProgressStep = 'validating' | 'sending' | 'registering' | 'collecting' | 'generating_contract' | 'preparing' | 'completed' | 'error';

interface ProgressOverlayProps {
  show: boolean;
  currentStep: ProgressStep;
  error: string | null;
  autoGenerateContract?: boolean;
  onClose?: () => void;
  onRetry?: () => void;
}

const getStepLabel = (step: ProgressStep): string => {
  switch (step) {
    case 'validating':
      return 'Validando datos';
    case 'sending':
      return 'Enviando solicitud';
    case 'registering':
      return 'Registrando solicitud';
    case 'collecting':
      return 'Recopilando datos de cotización';
    case 'generating_contract':
      return 'Generando contrato';
    case 'preparing':
      return 'Preparando flujo de contratación';
    case 'completed':
      return '¡Completado!';
    case 'error':
      return 'Error';
    default:
      return '';
  }
};

export function ProgressOverlay({
  show,
  currentStep,
  error,
  autoGenerateContract = false,
  onClose,
  onRetry,
}: ProgressOverlayProps) {
  if (!show || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 10070 }}
      onClick={(e) => {
        // Prevenir que clicks en el overlay lo cierren
        e.stopPropagation();
      }}
    >
      <ZenCard className="max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            Iniciando proceso de contratación
          </h3>
          <p className="text-sm text-zinc-400">
            Por favor espera mientras procesamos tu solicitud
          </p>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-red-400 font-medium mb-2">Error al procesar</p>
              <p className="text-sm text-zinc-400 mb-4">{error}</p>
              <div className="flex gap-3">
                {onClose && (
                  <ZenButton
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cerrar
                  </ZenButton>
                )}
                {onRetry && (
                  <ZenButton
                    onClick={onRetry}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                  </ZenButton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pasos según autoGenerateContract */}
            {autoGenerateContract ? (
              <>
                <ProgressStepItem
                  label={getStepLabel('validating')}
                  completed={['sending', 'registering', 'collecting', 'generating_contract', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'validating'}
                />
                <ProgressStepItem
                  label={getStepLabel('sending')}
                  completed={['registering', 'collecting', 'generating_contract', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'sending'}
                />
                <ProgressStepItem
                  label={getStepLabel('registering')}
                  completed={['collecting', 'generating_contract', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'registering'}
                />
                <ProgressStepItem
                  label={getStepLabel('collecting')}
                  completed={['generating_contract', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'collecting'}
                />
                <ProgressStepItem
                  label={getStepLabel('generating_contract')}
                  completed={['preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'generating_contract'}
                />
                <ProgressStepItem
                  label={getStepLabel('preparing')}
                  completed={currentStep === 'completed'}
                  active={currentStep === 'preparing'}
                />
              </>
            ) : (
              <>
                <ProgressStepItem
                  label={getStepLabel('validating')}
                  completed={['sending', 'registering', 'collecting', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'validating'}
                />
                <ProgressStepItem
                  label={getStepLabel('sending')}
                  completed={['registering', 'collecting', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'sending'}
                />
                <ProgressStepItem
                  label={getStepLabel('registering')}
                  completed={['collecting', 'preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'registering'}
                />
                <ProgressStepItem
                  label={getStepLabel('collecting')}
                  completed={['preparing', 'completed'].includes(currentStep)}
                  active={currentStep === 'collecting'}
                />
                <ProgressStepItem
                  label={getStepLabel('preparing')}
                  completed={currentStep === 'completed'}
                  active={currentStep === 'preparing'}
                />
              </>
            )}

            {/* Loading final */}
            {currentStep === 'completed' && (
              <div className="flex items-center justify-center pt-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">¡Proceso completado!</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ZenCard>
    </div>,
    document.body
  );
}

