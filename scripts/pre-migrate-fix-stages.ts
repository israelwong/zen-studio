#!/usr/bin/env tsx
/**
 * Pre-Migration: Fix stage_type values
 * 
 * Actualiza valores de enum obsoletos antes de cambiar el schema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Corrigiendo valores de stage_type...\n');

  // Actualizar POST_PRODUCTION → REVIEW
  const result = await prisma.$executeRaw`
    UPDATE studio_manager_pipeline_stages
    SET stage_type = 'REVIEW'
    WHERE stage_type = 'POST_PRODUCTION';
  `;

  console.log(`✅ Registros actualizados: ${result}`);
  
  // Actualizar WARRANTY → DELIVERY
  const result2 = await prisma.$executeRaw`
    UPDATE studio_manager_pipeline_stages  
    SET stage_type = 'DELIVERY'
    WHERE stage_type = 'WARRANTY';
  `;

  console.log(`✅ Registros WARRANTY → DELIVERY: ${result2}`);
  
  // Actualizar COMPLETED → ARCHIVED
  const result3 = await prisma.$executeRaw`
    UPDATE studio_manager_pipeline_stages
    SET stage_type = 'ARCHIVED'
    WHERE stage_type = 'COMPLETED';
  `;

  console.log(`✅ Registros COMPLETED → ARCHIVED: ${result3}\n`);
  console.log('✅ Pre-migración completada\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

