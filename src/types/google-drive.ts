export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string; // Solo disponible para imágenes
  webContentLink?: string; // Link para descargar (requiere permisos)
  webViewLink?: string; // Link para ver en Google Drive
  size?: string;
  modifiedTime?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

export interface GoogleOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleDriveConfig {
  apiKey?: string;
  oauth: GoogleOAuthCredentials;
}

export interface GoogleFolderSelection {
  id: string;
  name: string;
  url: string;
}

