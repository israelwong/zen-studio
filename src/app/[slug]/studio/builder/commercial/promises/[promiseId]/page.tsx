'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { PromiseForm, type PromiseFormRef } from '../components/PromiseForm';
import { PromiseQuickActions } from '../components/PromiseQuickActions';
import { getPromiseById } from '@/lib/actions/studio/builder/commercial/promises';
import { toast } from 'sonner';

export default function EditarPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const formRef = useRef<PromiseFormRef>(null);
  const [loading, setLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [contactData, setContactData] = useState<{
    contactId: string;
    contactName: string;
    phone: string;
    email: string | null;
    promiseId: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.contactData) {
        setContactData(formRef.current.contactData as {
          contactId: string;
          contactName: string;
          phone: string;
          email: string | null;
          promiseId: string;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);
  const [initialData, setInitialData] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    event_type_id: string | null;
    interested_dates: string[] | null;
    acquisition_channel_id?: string;
    social_network_id?: string;
    referrer_contact_id?: string;
    referrer_name?: string;
    promiseId?: string | null;
  } | null>(null);

  useEffect(() => {
    const loadPromise = async () => {
      try {
        setLoading(true);
        // Obtener promesa directamente por promiseId
        const result = await getPromiseById(promiseId);

        if (result.success && result.data) {
          setInitialData({
            id: result.data.contact_id,
            name: result.data.contact_name,
            phone: result.data.contact_phone,
            email: result.data.contact_email,
            event_type_id: result.data.event_type_id || null,
            interested_dates: result.data.interested_dates,
            acquisition_channel_id: result.data.acquisition_channel_id || undefined,
            social_network_id: result.data.social_network_id || undefined,
            referrer_contact_id: result.data.referrer_contact_id || undefined,
            referrer_name: result.data.referrer_name || undefined,
            promiseId: result.data.promise_id,
          });
        } else {
          toast.error(result.error || 'Promesa no encontrada');
          router.push(`/${studioSlug}/studio/builder/commercial/promises`);
        }
      } catch (error) {
        console.error('Error loading promise:', error);
        toast.error('Error al cargar la promesa');
        router.push(`/${studioSlug}/studio/builder/commercial/promises`);
      } finally {
        setLoading(false);
      }
    };

    if (promiseId) {
      loadPromise();
    }
  }, [promiseId, studioSlug, router]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-32 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => formRef.current?.cancel()}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>Editar Promesa</ZenCardTitle>
                <ZenCardDescription>
                  Actualiza la información de la promesa
                </ZenCardDescription>
              </div>
            </div>
            {contactData && (
              <PromiseQuickActions
                studioSlug={studioSlug}
                contactId={contactData.contactId}
                contactName={contactData.contactName}
                phone={contactData.phone}
                email={contactData.email}
              />
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <PromiseForm
            ref={formRef}
            studioSlug={studioSlug}
            initialData={initialData}
            onLoadingChange={setIsFormLoading}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

