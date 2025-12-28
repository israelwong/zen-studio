import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Patrón Singleton para evitar múltiples instancias
declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

// Verificar que la URL de la base de datos esté disponible
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// WORKAROUND: En desarrollo, usar DIRECT_URL si está disponible para evitar problemas
// con validación de foreign keys en el pooler de Supabase
// El pooler (puerto 6543) puede tener schema cacheado que causa problemas
const connectionString = 
  process.env.NODE_ENV === 'development' && process.env.DIRECT_URL
    ? process.env.DIRECT_URL  // Usar conexión directa en desarrollo
    : process.env.DATABASE_URL; // Usar pooler en producción

// En desarrollo, forzar recreación si cambió la conexión
if (process.env.NODE_ENV !== 'production') {
  const currentConnection = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const cachedConnection = (globalThis as any).__cachedConnection;
  
  // Si cambió la conexión, limpiar singleton (sin await en nivel superior)
  if (cachedConnection && cachedConnection !== currentConnection) {
    if (globalThis.__prisma) {
      globalThis.__prisma.$disconnect().catch(() => {});
      globalThis.__prisma = undefined;
    }
    if (globalThis.__pgPool) {
      globalThis.__pgPool.end().catch(() => {});
      globalThis.__pgPool = undefined;
    }
  }
  (globalThis as any).__cachedConnection = currentConnection;
}

// Crear pool de conexiones PostgreSQL (singleton)
const pgPool = globalThis.__pgPool || new Pool({
  connectionString,
  max: 20, // Máximo de conexiones en el pool (aumentado de 10 a 20)
  idleTimeoutMillis: 60000, // Cerrar conexiones inactivas después de 60s (aumentado de 30s)
  connectionTimeoutMillis: 20000, // Timeout para obtener conexión del pool (aumentado de 10s a 20s)
});

// Reutilizar el pool en desarrollo (en producción Next.js cachea los módulos)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pgPool;
}

// Crear adapter de Prisma para PostgreSQL
// El adapter necesita el pool para manejar las conexiones
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma centralizado con singleton
// Prisma 7.x requiere adapter cuando se usa engineType: "client"
// En desarrollo, forzar recreación si el cliente existe para evitar problemas de cache
let prisma: PrismaClient;
if (process.env.NODE_ENV !== "production" && globalThis.__prisma) {
  // En desarrollo, desconectar cliente anterior y crear uno nuevo
  // Esto ayuda cuando el schema cambia y el cliente está cacheado
  globalThis.__prisma.$disconnect().catch(() => {});
  globalThis.__prisma = undefined;
}

prisma = globalThis.__prisma || new PrismaClient({
  adapter,
  // Configuración optimizada para producción
  log: ['error'], // Solo errores para mejor rendimiento
  errorFormat: 'pretty',
});

// Reutilización del cliente para evitar agotamiento de conexiones
// En producción Next.js reutiliza el módulo, pero en desarrollo necesitamos singleton explícito
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// En producción, asegurar que siempre se reutilice la misma instancia
// Next.js en producción cachea los módulos, pero es seguro mantener el singleton

export { prisma };
