import { PrismaClient } from '@prisma/client'

// Patrón Singleton para evitar múltiples instancias
declare global {
  var __prisma: PrismaClient | undefined;
}

// Verificar que la URL de la base de datos esté disponible
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Cliente de Prisma centralizado con singleton
// Prisma 7.x lee DATABASE_URL automáticamente del schema.prisma o variables de entorno
// Si el generator tiene engineType: "client", se requiere adapter o accelerateUrl
// Para uso estándar sin Accelerate, no pasar ninguna configuración especial
const prisma = globalThis.__prisma || new PrismaClient({
  // Configuración optimizada para producción
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
