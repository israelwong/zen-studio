'use client';

import { useState, useCallback, useEffect } from 'react';

interface GoogleFolder {
  id: string;
  name: string;
  url: string;
}

interface UseGooglePickerOptions {
  accessToken: string;
  onFolderSelect: (folder: GoogleFolder) => void;
  onError?: (error: string) => void;
}

interface UseGooglePickerReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  openPicker: () => void;
}

// Tipos para Google Picker API
interface GooglePickerAction {
  PICKED: string;
  CANCEL: string;
}

interface GooglePickerViewId {
  FOLDERS: string;
  DOCS: string;
  DOCUMENTS: string;
}

interface GooglePickerFeature {
  NAV_HIDDEN: string;
}

interface GooglePickerDoc {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
}

interface GooglePickerCallbackData {
  action: string;
  docs: GooglePickerDoc[];
}

interface GooglePickerView {
  setMimeTypes: (mimeType: string) => GooglePickerView;
  setIncludeFolders: (include: boolean) => GooglePickerView;
}

interface GooglePickerBuilder {
  enableFeature: (feature: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerCallbackData) => void) => GooglePickerBuilder;
  build: () => GooglePicker;
}

interface GooglePicker {
  setVisible: (visible: boolean) => void;
}

declare global {
  interface Window {
    gapi?: {
      load: (api: string, options: { callback: () => void }) => void;
    };
    google?: {
      picker: {
        Action: GooglePickerAction;
        ViewId: GooglePickerViewId;
        Feature: GooglePickerFeature;
        DocsView: new (viewId: string) => GooglePickerView;
        PickerBuilder: new () => GooglePickerBuilder;
      };
    };
  }
}

export function useGooglePicker({
  accessToken,
  onFolderSelect,
  onError,
}: UseGooglePickerOptions): UseGooglePickerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  // Cargar Google APIs dinámicamente
  useEffect(() => {
    // Limpiar error al inicio
    setError(null);
    
    if (!apiKey) {
      setError('NEXT_PUBLIC_GOOGLE_API_KEY no está configurada');
      setIsReady(false);
      return;
    }

    // No mostrar error si el token aún no está disponible (puede estar cargando)
    // Solo mostrar error si ya pasó tiempo y definitivamente no hay token
    if (!accessToken) {
      // No establecer error inmediatamente, solo marcar como no listo
      setIsReady(false);
      return;
    }

    // Verificar si ya están cargadas
    if (window.gapi && window.google && pickerApiLoaded) {
      setIsReady(true);
      return;
    }

    setIsLoading(true);

    // Función para cargar la API de Picker
    const loadPickerApi = () => {
      if (!window.gapi) {
        setError('gapi no está disponible');
        setIsLoading(false);
        return;
      }

      window.gapi.load('picker', {
        callback: () => {
          setPickerApiLoaded(true);
          setIsReady(true);
          setIsLoading(false);
        },
        onerror: () => {
          setError('Error al cargar Google Picker API');
          setIsLoading(false);
          onError?.('Error al cargar Google Picker API');
        },
      });
    };

    // Si gapi y google ya están disponibles, solo cargar picker API
    if (window.gapi && window.google) {
      loadPickerApi();
      return;
    }

    // Cargar gapi.js
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      // Cargar picker.js después de gapi
      const pickerScript = document.createElement('script');
      pickerScript.src = 'https://apis.google.com/js/picker.js';
      pickerScript.async = true;
      pickerScript.defer = true;
      pickerScript.onload = () => {
        // Esperar un momento para que las APIs estén disponibles
        setTimeout(() => {
          if (window.gapi && window.google) {
            loadPickerApi();
          } else {
            setError('Google APIs no están disponibles después de cargar');
            setIsLoading(false);
          }
        }, 100);
      };
      pickerScript.onerror = () => {
        setError('Error al cargar Google Picker API');
        setIsLoading(false);
        onError?.('Error al cargar Google Picker API');
      };
      document.head.appendChild(pickerScript);
    };
    gapiScript.onerror = () => {
      setError('Error al cargar Google API');
      setIsLoading(false);
      onError?.('Error al cargar Google API');
    };
    document.head.appendChild(gapiScript);

    return () => {
      // Cleanup: remover scripts si el componente se desmonta
      // (opcional, generalmente no es necesario)
    };
  }, [apiKey, accessToken, onError, pickerApiLoaded]);

  const openPicker = useCallback(() => {
    if (!isReady || !window.gapi || !window.google || !pickerApiLoaded) {
      onError?.('Google Picker no está listo. Espera un momento...');
      return;
    }

    if (!apiKey) {
      const err = 'NEXT_PUBLIC_GOOGLE_API_KEY no está configurada';
      console.error('[useGooglePicker] API Key no encontrada');
      setError(err);
      onError?.(err);
      return;
    }

    // Verificar formato de API Key (debe empezar con "AIza")
    if (!apiKey.startsWith('AIza')) {
      const err = 'API Key inválida. Debe empezar con "AIza"';
      console.error('[useGooglePicker] API Key con formato inválido:', apiKey.substring(0, 10) + '...');
      setError(err);
      onError?.(err);
      return;
    }

    if (!accessToken) {
      const err = 'Access token no disponible';
      setError(err);
      onError?.(err);
      return;
    }

    try {
      // Verificar que la API de Picker esté disponible
      if (!window.google.picker || !window.google.picker.DocsView || !window.google.picker.PickerBuilder) {
        onError?.('Google Picker API no está completamente cargada');
        return;
      }

      // Usar ViewId.DOCS con configuración para permitir seleccionar carpetas
      // ViewId.FOLDERS no permite navegar dentro de carpetas, así que usamos DOCS
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
      view.setIncludeFolders(true);
      // NO usar setMimeTypes aquí - necesitamos ver todo para navegar
      // La validación se hace en el callback

      // Crear el picker
      console.log('[useGooglePicker] Creando picker con API Key:', apiKey.substring(0, 10) + '...');
      console.log('[useGooglePicker] Access Token disponible:', !!accessToken);
      
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setDeveloperKey(apiKey)
        .setOAuthToken(accessToken)
        .addView(view) // Vista para navegar y seleccionar carpetas
        .setCallback((data: GooglePickerCallbackData) => {
          if (data.action === window.google!.picker.Action.PICKED) {
            const doc = data.docs[0];
            // Verificar que sea una carpeta (mimeType debe ser application/vnd.google-apps.folder)
            // Si no es carpeta, mostrar error
            if (doc.mimeType && doc.mimeType !== 'application/vnd.google-apps.folder') {
              onError?.('Por favor selecciona una carpeta, no un archivo');
              return;
            }
            onFolderSelect({
              id: doc.id,
              name: doc.name,
              url: doc.url,
            });
          } else if (data.action === window.google!.picker.Action.CANCEL) {
            // Usuario canceló, no hacer nada
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al abrir Google Picker';
      console.error('Error abriendo Google Picker:', err);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [isReady, apiKey, accessToken, onFolderSelect, onError, pickerApiLoaded]);

  return {
    isLoading,
    isReady,
    error,
    openPicker,
  };
}

