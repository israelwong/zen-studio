/**
 * Barrel export para integraciones de studio
 */

export {
  obtenerEstadoConexion,
  iniciarConexionGoogle, // @deprecated - Usar iniciarVinculacionDriveClient desde oauth-client.actions
  desconectarGoogle, // @deprecated - Usar desconectarGoogleDrive
  desconectarGoogleDrive,
  listarCarpetasDrive,
  listarSubcarpetas,
  obtenerContenidoCarpeta,
  obtenerDetallesCarpeta,
  obtenerAccessToken,
  procesarCallbackGoogle, // @deprecated - Ya no se usa, migrado a callback unificado
  type GoogleConnectionStatus,
  type GoogleOAuthUrlResult,
  type GoogleFolderListResult,
  type GoogleFolderContentsResult,
  type AccessTokenResult,
} from './google-drive.actions';

