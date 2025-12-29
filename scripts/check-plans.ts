#!/usr/bin/env tsx
/**
 * Script para verificar planes existentes en la base de datos
 * 
 * Uso: tsx scripts/check-plans.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Cargar variables de entorno
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

// Crear pool de conexiones PostgreSQL
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Crear adapter de Prisma para PostgreSQL
const adapter = new PrismaPg(pgPool);

// Cliente de Prisma con adapter (requerido en Prisma 7)
const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

async function checkPlans() {
  try {
    console.log("🔍 Consultando planes en la base de datos...\n");

    // Obtener todos los planes
    const plans = await prisma.platform_plans.findMany({
      include: {
        plan_limits: {
          select: {
            limit_type: true,
            limit_value: true,
            unit: true,
          },
        },
        _count: {
          select: {
            studios: true,
            subscriptions: true,
          },
        },
      },
      orderBy: [
        { active: "desc" },
        { order: "asc" },
        { name: "asc" },
      ],
    });

    if (plans.length === 0) {
      console.log("⚠️  No se encontraron planes en la base de datos");
      console.log("\n💡 Para crear planes, ejecuta el seed:");
      console.log("   npm run db:seed\n");
      return;
    }

    console.log(`✅ Se encontraron ${plans.length} plan(es):\n`);

    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} (${plan.slug})`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Estado: ${plan.active ? "✅ Activo" : "❌ Inactivo"}`);
      console.log(`   Popular: ${plan.popular ? "⭐ Sí" : "No"}`);
      console.log(`   Orden: ${plan.order}`);
      
      if (plan.description) {
        console.log(`   Descripción: ${plan.description}`);
      }

      if (plan.price_monthly) {
        console.log(`   Precio Mensual: $${Number(plan.price_monthly).toFixed(2)} MXN`);
      } else {
        console.log(`   Precio Mensual: No configurado`);
      }

      if (plan.price_yearly) {
        console.log(`   Precio Anual: $${Number(plan.price_yearly).toFixed(2)} MXN`);
      } else {
        console.log(`   Precio Anual: No configurado`);
      }

      if (plan.stripe_product_id) {
        console.log(`   Stripe Product ID: ${plan.stripe_product_id}`);
      }

      if (plan.stripe_price_id) {
        console.log(`   Stripe Price ID: ${plan.stripe_price_id}`);
      }

      if (plan.features) {
        const features = Array.isArray(plan.features) 
          ? plan.features 
          : typeof plan.features === 'object' 
            ? Object.keys(plan.features) 
            : [];
        if (features.length > 0) {
          console.log(`   Features: ${features.length} feature(s)`);
        }
      }

      if (plan.plan_limits.length > 0) {
        console.log(`   Límites:`);
        plan.plan_limits.forEach((limit) => {
          console.log(`     - ${limit.limit_type}: ${limit.limit_value} ${limit.unit || ""}`);
        });
      }

      console.log(`   Estudios usando este plan: ${plan._count.studios}`);
      console.log(`   Suscripciones activas: ${plan._count.subscriptions}`);
      console.log(`   Creado: ${plan.created_at.toLocaleString()}`);
      console.log(`   Actualizado: ${plan.updated_at.toLocaleString()}`);
      console.log("");
    });

    // Resumen
    const activePlans = plans.filter((p) => p.active).length;
    const plansWithStripe = plans.filter((p) => p.stripe_price_id).length;
    const plansWithPrices = plans.filter(
      (p) => p.price_monthly || p.price_yearly
    ).length;

    console.log("📊 Resumen:");
    console.log(`   Total de planes: ${plans.length}`);
    console.log(`   Planes activos: ${activePlans}`);
    console.log(`   Planes con Stripe configurado: ${plansWithStripe}`);
    console.log(`   Planes con precios: ${plansWithPrices}`);

    if (plansWithStripe === 0) {
      console.log("\n⚠️  Ningún plan tiene Stripe Price ID configurado");
      console.log("   Necesitas crear los productos/precios en Stripe y actualizar los planes");
    }

    if (plansWithPrices === 0) {
      console.log("\n⚠️  Ningún plan tiene precios configurados");
      console.log("   Necesitas configurar price_monthly o price_yearly en los planes");
    }

  } catch (error) {
    console.error("❌ Error consultando planes:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pgPool.end();
  }
}

checkPlans();

