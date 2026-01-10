import { resolveShortUrl } from '@/lib/actions/studio/commercial/promises/promise-short-url.actions';
import { redirect } from 'next/navigation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  if (!code || typeof code !== 'string' || code.trim() === '') {
    console.warn('⚠️ [SHORT_URL] Invalid code:', code);
    redirect('/');
  }

  const result = await resolveShortUrl(code);

  if (!result.success || !result.data) {
    console.warn('⚠️ [SHORT_URL] Failed to resolve:', code, result.error);
    redirect('/');
  }

  // redirect() lanza NEXT_REDIRECT que es una excepción especial de Next.js
  // No debe ser capturada, se propaga automáticamente
  redirect(result.data.originalUrl);
}
