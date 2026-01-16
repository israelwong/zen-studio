'use client';

import React, { useState, useEffect } from 'react';
import { StudioSidebar } from '../sidebar/StudioSidebar';
import { AppHeader } from '../header/AppHeader';
import { ZenMagicChatWrapper } from '../ZenMagic';
import { UtilityDock } from '../tools/UtilityDock';
import { CommandMenu } from '../tools/CommandMenu';
import { useZenMagicChat } from '../ZenMagic';
import { useContactsSheet } from '@/components/shared/contacts/ContactsSheetContext';
import { AgendaUnifiedSheet } from '@/components/shared/agenda';
import { ContactsSheet } from '@/components/shared/contacts';
import { CrewMembersManager } from '@/components/shared/crew-members';
import { TareasOperativasSheet } from '@/components/shared/tareas-operativas/TareasOperativasSheet';
import { PromisesConfigProvider, usePromisesConfig } from '../../commercial/promises/context/PromisesConfigContext';
import { ConfigurationCatalogModal, type ConfigurationSection } from '@/components/shared/configuracion';
import { FileText, Shield, Receipt, CreditCard, Tag, Settings } from 'lucide-react';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { TerminosCondicionesEditor } from '@/components/shared/terminos-condiciones';
import { AvisoPrivacidadManager } from '@/components/shared/avisos-privacidad/AvisoPrivacidadManager';
import { PaymentMethodsModal } from '@/components/shared/payments/PaymentMethodsModal';
import { PipelineConfigModal } from '../../commercial/promises/components/PipelineConfigModal';
import { PromiseTagsManageModal } from '../../commercial/promises/components/PromiseTagsManageModal';
import { getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';

interface StudioLayoutWrapperProps {
  studioSlug: string;
  children: React.ReactNode;
}

function StudioLayoutContent({
  studioSlug,
  children,
}: StudioLayoutWrapperProps) {
  const { toggleChat } = useZenMagicChat();
  const { isOpen: contactsOpen, openContactsSheet, closeContactsSheet, initialContactId } = useContactsSheet();
  const promisesConfig = usePromisesConfig();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [crewSheetOpen, setCrewSheetOpen] = useState(false);
  const [tareasOperativasOpen, setTareasOperativasOpen] = useState(false);
  
  // Estados para modales de configuración
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [showTerminosManager, setShowTerminosManager] = useState(false);
  const [showAvisoPrivacidad, setShowAvisoPrivacidad] = useState(false);
  const [showPipelineConfig, setShowPipelineConfig] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);

  // Cargar etapas del pipeline
  useEffect(() => {
    const loadPipelineStages = async () => {
      const result = await getPipelineStages(studioSlug);
      if (result.success && result.data) {
        setPipelineStages(result.data);
      }
    };
    loadPipelineStages();
  }, [studioSlug]);

  const handlePipelineStagesUpdated = () => {
    const loadPipelineStages = async () => {
      const result = await getPipelineStages(studioSlug);
      if (result.success && result.data) {
        setPipelineStages(result.data);
      }
    };
    loadPipelineStages();
  };

  // Escuchar eventos del catálogo de configuración
  useEffect(() => {
    const handleOpenTerminos = () => setShowTerminosManager(true);
    const handleOpenAviso = () => setShowAvisoPrivacidad(true);
    const handleOpenCondiciones = () => setShowCondicionesManager(true);
    const handleOpenPaymentMethods = () => setShowPaymentMethods(true);
    const handleOpenTags = () => setShowTagsModal(true);
    const handleOpenPipeline = () => setShowPipelineConfig(true);

    window.addEventListener('open-terminos-modal', handleOpenTerminos);
    window.addEventListener('open-aviso-modal', handleOpenAviso);
    window.addEventListener('open-condiciones-modal', handleOpenCondiciones);
    window.addEventListener('open-payment-methods-modal', handleOpenPaymentMethods);
    window.addEventListener('open-tags-modal', handleOpenTags);
    window.addEventListener('open-pipeline-modal', handleOpenPipeline);

    return () => {
      window.removeEventListener('open-terminos-modal', handleOpenTerminos);
      window.removeEventListener('open-aviso-modal', handleOpenAviso);
      window.removeEventListener('open-condiciones-modal', handleOpenCondiciones);
      window.removeEventListener('open-payment-methods-modal', handleOpenPaymentMethods);
      window.removeEventListener('open-tags-modal', handleOpenTags);
      window.removeEventListener('open-pipeline-modal', handleOpenPipeline);
    };
  }, []);

  const handlePromisesConfigClick = () => {
    if (promisesConfig?.openConfigCatalog) {
      promisesConfig.openConfigCatalog();
    } else {
      console.warn('PromisesConfig context not available');
    }
  };

  const handleAgendaClick = () => {
    setAgendaOpen(true);
  };

  const handleContactsClick = () => {
    openContactsSheet();
  };

  const handleMagicClick = () => {
    toggleChat();
  };

  const handlePersonalClick = () => {
    setCrewSheetOpen(true);
  };

  const handleTareasOperativasClick = () => {
    setTareasOperativasOpen(true);
  };

  // Configuraciones disponibles para el catálogo
  const configurationSections: ConfigurationSection[] = [
    {
      id: 'legal',
      title: 'Documentos Legales',
      items: [
        {
          id: 'terminos',
          title: 'Términos y Condiciones',
          description: 'Gestiona los términos y condiciones que aceptan tus clientes',
          icon: FileText,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-terminos-modal'));
            }, 100);
          },
          category: 'legal',
        },
        {
          id: 'aviso',
          title: 'Aviso de Privacidad',
          description: 'Configura el aviso de privacidad para el cumplimiento legal',
          icon: Shield,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-aviso-modal'));
            }, 100);
          },
          category: 'legal',
        },
      ],
    },
    {
      id: 'comercial',
      title: 'Configuración Comercial',
      items: [
        {
          id: 'condiciones',
          title: 'Condiciones Comerciales',
          description: 'Gestiona las condiciones comerciales y métodos de pago disponibles',
          icon: Receipt,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-condiciones-modal'));
            }, 100);
          },
          category: 'comercial',
        },
        {
          id: 'pagos',
          title: 'Métodos de Pago',
          description: 'Configura los métodos de pago aceptados y transferencias',
          icon: CreditCard,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-payment-methods-modal'));
            }, 100);
          },
          category: 'comercial',
        },
      ],
    },
    {
      id: 'promesas',
      title: 'Gestión de Promesas',
      items: [
        {
          id: 'etiquetas',
          title: 'Etiquetas',
          description: 'Gestiona las etiquetas para organizar y categorizar promesas',
          icon: Tag,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-tags-modal'));
            }, 100);
          },
          category: 'promesas',
        },
        {
          id: 'pipeline',
          title: 'Configuración del Pipeline',
          description: 'Personaliza las etapas del pipeline de promesas',
          icon: Settings,
          onClick: () => {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-pipeline-modal'));
            }, 100);
          },
          category: 'promesas',
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* COLUMNA 1: Main Column (AppHeader + Sidebar + Content en flex-col) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* AppHeader - Full width */}
        <AppHeader
          studioSlug={studioSlug}
          onCommandOpen={() => setCommandOpen(true)}
        />

        {/* Container: Sidebar + Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Izquierdo (Navegación) */}
          <StudioSidebar studioSlug={studioSlug} onCommandOpen={() => setCommandOpen(true)} />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-zinc-900/40">
            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>

        <CommandMenu
          studioSlug={studioSlug}
          onAgendaClick={handleAgendaClick}
          onContactsClick={handleContactsClick}
          onMagicClick={handleMagicClick}
          onPersonalClick={handlePersonalClick}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>

      {/* COLUMNA 2: Utility Dock (Full height) */}
      <UtilityDock
        studioSlug={studioSlug}
        onAgendaClick={handleAgendaClick}
        onContactsClick={handleContactsClick}
        onTareasOperativasClick={handleTareasOperativasClick}
        onPromisesConfigClick={handlePromisesConfigClick}
      />

      {/* ZEN Magic Chat (siempre al final) */}
      <ZenMagicChatWrapper studioSlug={studioSlug} />

      {/* Sheet de Agenda */}
      <AgendaUnifiedSheet
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        studioSlug={studioSlug}
      />

      {/* Sheet de Contactos */}
      <ContactsSheet
        open={contactsOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeContactsSheet();
          }
        }}
        studioSlug={studioSlug}
        initialContactId={initialContactId}
      />

      {/* Sheet de Personal */}
      <CrewMembersManager
        studioSlug={studioSlug}
        isOpen={crewSheetOpen}
        onClose={() => setCrewSheetOpen(false)}
        mode="manage"
      />

      {/* Sheet de Tareas Operativas */}
      <TareasOperativasSheet
        open={tareasOperativasOpen}
        onOpenChange={setTareasOperativasOpen}
        studioSlug={studioSlug}
      />

      {/* Catálogo de Configuración */}
      {promisesConfig && (
        <ConfigurationCatalogModal
          isOpen={promisesConfig.isConfigCatalogOpen}
          onClose={promisesConfig.closeConfigCatalog}
          sections={configurationSections}
          title="Configuración de Promesas"
          description="Gestiona todas las configuraciones relacionadas con promesas y contratación"
        />
      )}

      {/* Modales de Configuración (universales) */}
      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showCondicionesManager}
        onClose={() => setShowCondicionesManager(false)}
      />

      <TerminosCondicionesEditor
        studioSlug={studioSlug}
        isOpen={showTerminosManager}
        onClose={() => setShowTerminosManager(false)}
      />

      <AvisoPrivacidadManager
        studioSlug={studioSlug}
        isOpen={showAvisoPrivacidad}
        onClose={() => setShowAvisoPrivacidad(false)}
      />

      <PipelineConfigModal
        isOpen={showPipelineConfig}
        onClose={() => setShowPipelineConfig(false)}
        studioSlug={studioSlug}
        pipelineStages={pipelineStages}
        onSuccess={handlePipelineStagesUpdated}
      />

      <PromiseTagsManageModal
        isOpen={showTagsModal}
        onClose={() => setShowTagsModal(false)}
        studioSlug={studioSlug}
      />

      <PaymentMethodsModal
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
        studioSlug={studioSlug}
      />
    </div>
  );
}

export function StudioLayoutWrapper({
  studioSlug,
  children,
}: StudioLayoutWrapperProps) {
  return (
    <PromisesConfigProvider>
      <StudioLayoutContent studioSlug={studioSlug}>
        {children}
      </StudioLayoutContent>
    </PromisesConfigProvider>
  );
}
