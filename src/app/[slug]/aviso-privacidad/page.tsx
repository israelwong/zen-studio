import { notFound } from 'next/navigation';
import { obtenerAvisoPrivacidadPublico } from '@/lib/actions/public/promesas.actions';
import { MarkdownPreview } from '@/components/shared/terminos-condiciones/MarkdownPreview';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Shield } from 'lucide-react';
import { AvisoPrivacidadFooter } from './components/AvisoPrivacidadFooter';
import { obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BackButton } from './components/BackButton';

interface AvisoPrivacidadPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AvisoPrivacidadPage({ params }: AvisoPrivacidadPageProps) {
  const { slug } = await params;
  const [result, studioInfo] = await Promise.all([
    obtenerAvisoPrivacidadPublico(slug),
    obtenerStudioPublicInfo(slug),
  ]);

  // Si el studio no existe, 404
  if (!result.success || !studioInfo) {
    notFound();
  }

  // Si no hay aviso activo, mostrar mensaje
  if (!result.data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="sticky top-0 z-50">
          <ProfileHeader
            data={{
              studio_name: studioInfo.studio_name,
              logo_url: studioInfo.logo_url,
            }}
            studioSlug={slug}
            isEditMode={false}
          />
        </header>
        <main className="flex-1 overflow-auto bg-zinc-900/40 py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <BackButton />
            <ZenCard>
              <ZenCardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-zinc-500" />
                  <ZenCardTitle>Aviso de Privacidad</ZenCardTitle>
                </div>
              </ZenCardHeader>
              <ZenCardContent>
                <p className="text-zinc-400">
                  El aviso de privacidad no está disponible en este momento.
                </p>
              </ZenCardContent>
            </ZenCard>
          </div>
        </main>
        <AvisoPrivacidadFooter studioInfo={studioInfo} />
      </div>
    );
  }

  const aviso = result.data;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-50">
        <ProfileHeader
          data={{
            studio_name: studioInfo.studio_name,
            logo_url: studioInfo.logo_url,
          }}
          studioSlug={slug}
          isEditMode={false}
        />
      </header>
      <main className="flex-1 overflow-auto bg-zinc-900/40 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <BackButton />
          <ZenCard>
            <ZenCardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-emerald-500" />
                <ZenCardTitle>{aviso.title}</ZenCardTitle>
              </div>
              <p className="text-sm text-zinc-400 mt-2">Versión: {aviso.version}</p>
            </ZenCardHeader>
            <ZenCardContent>
              <div className="prose prose-invert max-w-none">
                <MarkdownPreview content={aviso.content} />
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      </main>
      <AvisoPrivacidadFooter studioInfo={studioInfo} />
    </div>
  );
}

