'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { updatePublicPromiseData, getPublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { autorizarCotizacionPublica } from '@/lib/actions/public/cotizaciones.actions';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';

interface ProgressOverlayWrapperProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Wrapper que siempre renderiza el ProgressOverlay cuando está activo
 * Contiene la lógica de procesamiento de autorización
 */
export function ProgressOverlayWrapper({ studioSlug, promiseId }: ProgressOverlayWrapperProps) {
  const router = useRouter();
  const { setNavigating, clearNavigating } = usePromiseNavigation();
  
  const {
    isAuthorizationInProgress,
    progressStep,
    progressError,
    autoGenerateContract,
    authorizationData,
    setIsAuthorizationInProgress,
    setProgressError,
    setProgressStep,
    setAuthorizationData,
  } = usePromisePageContext();

  // 💎 DEBUG: Log de render para verificar estado
  console.log('💎 ProgressOverlayWrapper render - isAuth:', isAuthorizationInProgress, 'step:', progressStep, 'hasData:', !!authorizationData);

  // Procesar autorización cuando se active el estado
  useEffect(() => {
    if (!isAuthorizationInProgress || !authorizationData) {
      return;
    }

    // Prevenir ejecuciones múltiples
    let isProcessing = false;

    // Función async para procesar la autorización
    const processAuthorization = async () => {
      if (isProcessing) {
        console.log('⚠️ [ProgressOverlayWrapper] Proceso ya en ejecución, ignorando');
        return;
      }

      isProcessing = true;
      console.log('🚀 Iniciando llamada al backend con:', authorizationData);

      try {
        const { 
          promiseId: authPromiseId, 
          cotizacionId, 
          studioSlug: authStudioSlug, 
          formData, 
          condicionesComercialesId, 
          condicionesComercialesMetodoPagoId, 
          autoGenerateContract: shouldGenerateContract 
        } = authorizationData;

        // Paso 1: Recopilando información (~400ms)
        setProgressStep('collecting');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Paso 2: Encriptando datos (~400ms)
        setProgressStep('validating');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Paso 3: Enviando solicitud a estudio (updatePublicPromiseData)
        setProgressStep('sending');
        console.log('📤 [ProgressOverlayWrapper] Actualizando datos de la promesa...');
        const updateResult = await updatePublicPromiseData(authStudioSlug, authPromiseId, {
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          contact_address: formData.contact_address,
          event_name: formData.event_name,
          event_location: formData.event_location,
        });

        if (!updateResult.success) {
          console.error('❌ [ProgressOverlayWrapper] Error al actualizar datos:', updateResult.error);
          setProgressError(updateResult.error || 'Error al actualizar datos');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        // Paso 4: Registrando solicitud (autorizarCotizacionPublica)
        setProgressStep('registering');
        console.log('📤 [ProgressOverlayWrapper] Autorizando cotización...');
        const result = await autorizarCotizacionPublica(
          authPromiseId,
          cotizacionId,
          authStudioSlug,
          condicionesComercialesId,
          condicionesComercialesMetodoPagoId
        );

        if (!result.success) {
          console.error('❌ [ProgressOverlayWrapper] Error al autorizar cotización:', result.error);
          setProgressError(result.error || 'Error al enviar solicitud');
          setProgressStep('error');
          setIsAuthorizationInProgress(false);
          (window as any).__IS_AUTHORIZING = false;
          setAuthorizationData(null);
          isProcessing = false;
          return;
        }

        console.log('✅ [ProgressOverlayWrapper] Cotización autorizada exitosamente');

        // Recopilar datos de cotización en paralelo
        (async () => {
          try {
            const reloadResult = await getPublicPromiseData(authStudioSlug, authPromiseId);
            if (reloadResult.success && reloadResult.data?.cotizaciones) {
              window.dispatchEvent(new CustomEvent('reloadCotizaciones', {
                detail: { cotizaciones: reloadResult.data.cotizaciones }
              }));
            }
          } catch (error) {
            console.error('[ProgressOverlayWrapper] Error al recargar cotizaciones:', error);
          }
        })();

        // Esperar 600ms mientras se recopilan datos
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paso 5: Generando contrato (condicional, solo si autoGenerateContract)
        if (shouldGenerateContract) {
          setProgressStep('generating_contract');
          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // Paso 6: Completado - Listo (~800ms)
        setProgressStep('completed');
        await new Promise(resolve => setTimeout(resolve, 800));

        isProcessing = false;
        // El estado isAuthorizationInProgress se reseteará en el useEffect de redirección
      } catch (error) {
        console.error('❌ [ProgressOverlayWrapper] Error en processAuthorization:', error);
        setProgressError('Error al enviar solicitud. Por favor, intenta de nuevo o contacta al estudio.');
        setProgressStep('error');
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        isProcessing = false;
      }
    };

    processAuthorization();
  }, [isAuthorizationInProgress, authorizationData, setProgressStep, setProgressError, setIsAuthorizationInProgress, setAuthorizationData]);

  // Redirigir a cierre cuando el proceso esté completado
  useEffect(() => {
    if (progressStep === 'completed' && isAuthorizationInProgress) {
      const redirectPath = `/${studioSlug}/promise/${promiseId}/cierre`;
      
      console.log('🎯 [ProgressOverlayWrapper] Proceso completado, redirigiendo a cierre...');
      
      // Delay de 500ms para que el usuario pueda leer el estado "¡Listo!" o "Contrato Generado"
      const timer = setTimeout(() => {
        // Limpiar flag de autorización del contexto y lock global antes de redirigir
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(redirectPath);
          clearNavigating(1000);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progressStep, isAuthorizationInProgress, studioSlug, promiseId, router, setNavigating, clearNavigating, setIsAuthorizationInProgress, setAuthorizationData]);

  if (!isAuthorizationInProgress) {
    return null;
  }

  return (
    <ProgressOverlay
      show={isAuthorizationInProgress}
      currentStep={progressStep}
      error={progressError}
      autoGenerateContract={autoGenerateContract}
      onClose={() => {
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
        setProgressError(null);
        setProgressStep('validating');
      }}
      onRetry={() => {
        setProgressError(null);
        setProgressStep('validating');
        setIsAuthorizationInProgress(false);
        (window as any).__IS_AUTHORIZING = false;
        setAuthorizationData(null);
      }}
    />
  );
}
