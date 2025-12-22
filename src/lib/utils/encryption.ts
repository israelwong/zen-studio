'use server';

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Deriva una clave de encriptación desde ENCRYPTION_KEY usando scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return key;
}

/**
 * Encripta un token usando AES-256-GCM
 * @param token - Token a encriptar
 * @returns String en formato base64: salt:iv:tag:ciphertext
 */
export async function encryptToken(token: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY no está configurada en variables de entorno');
  }

  if (!token) {
    throw new Error('Token no puede estar vacío');
  }

  try {
    // Generar salt e IV aleatorios
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derivar clave desde password y salt
    const key = await deriveKey(encryptionKey, salt);

    // Crear cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encriptar
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Obtener auth tag
    const tag = cipher.getAuthTag();

    // Formato: salt:iv:tag:ciphertext (todos en base64)
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted,
    ].join(':');
  } catch (error) {
    console.error('[encryptToken] Error:', error);
    throw new Error('Error al encriptar token');
  }
}

/**
 * Desencripta un token encriptado
 * @param encrypted - String encriptado en formato base64: salt:iv:tag:ciphertext
 * @returns Token desencriptado
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY no está configurada en variables de entorno');
  }

  if (!encrypted) {
    throw new Error('Token encriptado no puede estar vacío');
  }

  try {
    // Parsear formato: salt:iv:tag:ciphertext
    const parts = encrypted.split(':');
    if (parts.length !== 4) {
      throw new Error('Formato de token encriptado inválido');
    }

    const [saltBase64, ivBase64, tagBase64, ciphertext] = parts;

    // Convertir de base64 a buffers
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');

    // Derivar clave
    const key = await deriveKey(encryptionKey, salt);

    // Crear decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Desencriptar
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[decryptToken] Error:', error);
    throw new Error('Error al desencriptar token. Token inválido o corrupto.');
  }
}

/**
 * Valida que ENCRYPTION_KEY esté configurada
 * Útil para verificar en tiempo de desarrollo
 */
export async function validateEncryptionKey(): Promise<boolean> {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.error('⚠️ ENCRYPTION_KEY no está configurada');
    return false;
  }

  if (key.length < 32) {
    console.warn('⚠️ ENCRYPTION_KEY debería tener al menos 32 caracteres para mayor seguridad');
    return false;
  }

  return true;
}

