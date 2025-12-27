import { NextRequest, NextResponse } from 'next/server';

/**
 * Callback de OAuth directo de Google (Calendar/Drive)
 * Redirige a /auth/callback que maneja tanto OAuth directo como Supabase Auth
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Redirigir a /auth/callback con todos los parámetros
  const redirectUrl = new URL('/auth/callback', request.url);
  
  // Copiar todos los parámetros de la query string
  searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });
  
  return NextResponse.redirect(redirectUrl);
}

