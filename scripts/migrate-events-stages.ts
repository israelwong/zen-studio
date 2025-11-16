#!/usr/bin/env tsx
/**
 * Migration Script: Events Stages
 * 
 * Migra de studio_events_stage → studio_manager_pipeline_stages
 * y actualiza studio_events.event_stage_id → studio_events.stage_id
 * 
 * EJECUTAR ANTES DE: db push con schema changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StageMapping {
  oldStageId: string;
  newStageId: string;
  studioId: string;
}

async function main() {
  console.log('🚀 Iniciando migración de stages...\n');

  // 1. Obtener todos los studios
  const studios = await prisma.studios.findMany({
    select: { id: true, studio_name: true },
  });

  console.log(`📊 Studios encontrados: ${studios.length}\n`);

  let totalMigrated = 0;
  let totalEventsUpdated = 0;
  const stageMappings: StageMapping[] = [];

  for (const studio of studios) {
    console.log(`\n🏢 Procesando studio: ${studio.studio_name}`);

    // 2. Verificar si ya tiene manager_pipeline_stages
    const existingManagerStages = await prisma.studio_manager_pipeline_stages.findMany({
      where: { studio_id: studio.id, is_active: true },
      orderBy: { order: 'asc' },
    });

    console.log(`  📋 Manager stages existentes: ${existingManagerStages.length}`);

    // 3. Obtener events_stages actuales
    const eventsStages = await prisma.studio_events_stage.findMany({
      where: { studio_id: studio.id, is_active: true },
      orderBy: { order: 'asc' },
    });

    console.log(`  📋 Events stages legacy: ${eventsStages.length}`);

    if (eventsStages.length === 0) {
      console.log(`  ⚠️  No hay events_stages para migrar`);
      
      // Si no hay manager stages tampoco, crear defaults
      if (existingManagerStages.length === 0) {
        console.log(`  ✨ Creando stages por defecto...`);
        await createDefaultStages(studio.id);
      }
      continue;
    }

    // 4. Migrar cada stage de events_stage a manager_pipeline
    for (const eventsStage of eventsStages) {
      // Buscar si ya existe un stage equivalente en manager_pipeline
      let managerStage = existingManagerStages.find(
        (ms) => ms.slug === eventsStage.slug || ms.name === eventsStage.name
      );

      if (!managerStage) {
        // Crear nuevo stage en manager_pipeline
        console.log(`  ➕ Creando manager stage: ${eventsStage.name}`);
        
        // Determinar stage_type basado en el slug/name
        const stageType = determineStageType(eventsStage.slug, eventsStage.name);

        managerStage = await prisma.studio_manager_pipeline_stages.create({
          data: {
            studio_id: studio.id,
            name: eventsStage.name,
            slug: eventsStage.slug,
            description: `Migrado desde events_stage: ${eventsStage.name}`,
            color: determineStageColor(stageType),
            order: eventsStage.order,
            stage_type: stageType,
            is_active: eventsStage.is_active,
            is_system: eventsStage.is_system,
          },
        });

        totalMigrated++;
      }

      // Guardar mapeo para actualizar eventos
      stageMappings.push({
        oldStageId: eventsStage.id,
        newStageId: managerStage.id,
        studioId: studio.id,
      });

      console.log(`  ✓ Mapeado: ${eventsStage.name} → ${managerStage.name}`);
    }

    // 5. Actualizar eventos del studio
    const eventsToUpdate = await prisma.studio_events.findMany({
      where: {
        studio_id: studio.id,
        event_stage_id: { not: null },
      },
      select: { id: true, event_stage_id: true },
    });

    console.log(`  📝 Eventos a actualizar: ${eventsToUpdate.length}`);

    for (const event of eventsToUpdate) {
      const mapping = stageMappings.find((m) => m.oldStageId === event.event_stage_id);
      
      if (mapping) {
        await prisma.studio_events.update({
          where: { id: event.id },
          data: { stage_id: mapping.newStageId },
        });
        totalEventsUpdated++;
      }
    }

    console.log(`  ✅ Studio completado`);
  }

  console.log(`\n\n📊 Resumen de migración:`);
  console.log(`  - Stages migrados: ${totalMigrated}`);
  console.log(`  - Eventos actualizados: ${totalEventsUpdated}`);
  console.log(`\n✅ Migración completada con éxito\n`);
}

/**
 * Crear stages por defecto si no existen
 */
async function createDefaultStages(studioId: string) {
  const defaultStages = [
    { name: 'Planeación', slug: 'planning', stage_type: 'PLANNING' as const, color: '#3B82F6', order: 1 },
    { name: 'Producción', slug: 'production', stage_type: 'PRODUCTION' as const, color: '#10B981', order: 2 },
    { name: 'Revisión', slug: 'review', stage_type: 'REVIEW' as const, color: '#F59E0B', order: 3 },
    { name: 'Entrega', slug: 'delivery', stage_type: 'DELIVERY' as const, color: '#8B5CF6', order: 4 },
    { name: 'Archivado', slug: 'archived', stage_type: 'ARCHIVED' as const, color: '#6B7280', order: 5 },
  ];

  for (const stage of defaultStages) {
    await prisma.studio_manager_pipeline_stages.create({
      data: {
        studio_id: studioId,
        ...stage,
        is_system: true,
        is_active: true,
      },
    });
  }

  console.log(`  ✨ ${defaultStages.length} stages por defecto creados`);
}

/**
 * Determinar stage_type basado en slug/name
 */
function determineStageType(slug: string, name: string): 'PLANNING' | 'PRODUCTION' | 'REVIEW' | 'DELIVERY' | 'ARCHIVED' {
  const slugLower = slug.toLowerCase();
  const nameLower = name.toLowerCase();

  // Planning
  if (
    slugLower.includes('plan') ||
    slugLower.includes('pendiente') ||
    nameLower.includes('plan') ||
    nameLower.includes('pendiente')
  ) {
    return 'PLANNING';
  }

  // Production
  if (
    slugLower.includes('prod') ||
    slugLower.includes('ejecucion') ||
    nameLower.includes('prod') ||
    nameLower.includes('ejecución')
  ) {
    return 'PRODUCTION';
  }

  // Review
  if (
    slugLower.includes('revi') ||
    slugLower.includes('control') ||
    nameLower.includes('revi') ||
    nameLower.includes('control')
  ) {
    return 'REVIEW';
  }

  // Delivery
  if (
    slugLower.includes('entrega') ||
    slugLower.includes('delivery') ||
    nameLower.includes('entrega') ||
    nameLower.includes('delivery')
  ) {
    return 'DELIVERY';
  }

  // Archived
  if (
    slugLower.includes('archiv') ||
    slugLower.includes('completado') ||
    nameLower.includes('archiv') ||
    nameLower.includes('completado')
  ) {
    return 'ARCHIVED';
  }

  // Default: PLANNING
  return 'PLANNING';
}

/**
 * Determinar color basado en stage_type
 */
function determineStageColor(stageType: string): string {
  const colors: Record<string, string> = {
    PLANNING: '#3B82F6',    // Blue
    PRODUCTION: '#10B981',  // Green
    REVIEW: '#F59E0B',      // Orange
    DELIVERY: '#8B5CF6',    // Purple
    ARCHIVED: '#6B7280',    // Gray
  };

  return colors[stageType] || '#3B82F6';
}

// Ejecutar migración
main()
  .catch((error) => {
    console.error('\n❌ Error en migración:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

