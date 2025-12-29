#!/usr/bin/env tsx
/**
 * Script para limpiar studios cancelados después del período de retención (30 días)
 * 
 * Ejecutar manualmente o configurar como cron job:
 * 
 * Ejemplo cron (diario a las 2 AM):
 * 0 2 * * * cd /path/to/zen-platform && npx tsx scripts/cleanup-cancelled-studios.ts
 * 
 * O ejecutar manualmente:
 * npx tsx scripts/cleanup-cancelled-studios.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { cleanupCancelledStudio, findStudiosNeedingCleanup } from "../src/lib/actions/studio/account/suscripcion/cleanup-cancelled-studio.actions";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL no está definida en las variables de entorno");
  process.exit(1);
}

// Crear adapter de Prisma para PostgreSQL
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Iniciando limpieza de studios cancelados...");
  console.log(`📅 Fecha actual: ${new Date().toISOString()}\n`);

  try {
    // Encontrar studios que necesitan limpieza
    const studioIds = await findStudiosNeedingCleanup();

    if (studioIds.length === 0) {
      console.log("✅ No hay studios que necesiten limpieza en este momento.");
      return;
    }

    console.log(`📋 Encontrados ${studioIds.length} studio(s) para limpiar:\n`);

    // Limpiar cada studio
    let successCount = 0;
    let errorCount = 0;

    for (const studioId of studioIds) {
      try {
        console.log(`🔧 Limpiando studio: ${studioId}...`);
        const result = await cleanupCancelledStudio(studioId);

        if (result.success) {
          successCount++;
          console.log(`✅ Studio ${studioId} limpiado exitosamente`);
          if (result.details) {
            console.log(`   - Google Drive: ${result.details.googleDriveDisconnected ? "✅" : "❌"}`);
            console.log(`   - Google Calendar: ${result.details.googleCalendarDisconnected ? "✅" : "❌"}`);
            console.log(`   - Google Contacts: ${result.details.googleContactsDisconnected ? "✅" : "❌"}`);
            console.log(`   - Eventos cancelados: ${result.details.eventsCancelled}`);
            console.log(`   - Tareas canceladas: ${result.details.tasksCancelled}`);
            console.log(`   - Studio desactivado: ${result.details.studioDeactivated ? "✅" : "❌"}`);
          }
        } else {
          errorCount++;
          console.error(`❌ Error limpiando studio ${studioId}: ${result.error}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error inesperado limpiando studio ${studioId}:`, error);
      }
      console.log(""); // Línea en blanco para separar
    }

    // Resumen
    console.log("=".repeat(50));
    console.log("📊 Resumen de limpieza:");
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📋 Total procesados: ${studioIds.length}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error fatal en el script:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Ejecutar script
main()
  .then(() => {
    console.log("\n✅ Script completado exitosamente");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  });

