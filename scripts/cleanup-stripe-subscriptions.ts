#!/usr/bin/env tsx
/**
 * Script para limpiar suscripciones canceladas en Stripe
 * 
 * Útil cuando hay desincronización entre Stripe y nuestra DB
 * 
 * Uso:
 * npx tsx scripts/cleanup-stripe-subscriptions.ts <studio-slug>
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { getStripe } from "../src/lib/stripe";
import Stripe from "stripe";

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

async function listStripeSubscriptions(customerId: string) {
  const stripe = getStripe();
  
  console.log(`\n📋 Suscripciones en Stripe para customer: ${customerId}\n`);
  
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
    status: "all", // Todas: active, past_due, canceled, unpaid, trialing, incomplete, incomplete_expired, paused
  });

  if (subscriptions.data.length === 0) {
    console.log("✅ No hay suscripciones en Stripe para este customer");
    return [];
  }

  subscriptions.data.forEach((sub, index) => {
    console.log(`${index + 1}. Suscripción: ${sub.id}`);
    console.log(`   Estado: ${sub.status}`);
    console.log(`   Cancelada al final del período: ${sub.cancel_at_period_end ? "Sí" : "No"}`);
    console.log(`   Fecha de cancelación: ${sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : "N/A"}`);
    console.log(`   Período actual: ${new Date(sub.current_period_start * 1000).toISOString()} - ${new Date(sub.current_period_end * 1000).toISOString()}`);
    console.log(`   Plan: ${sub.items.data[0]?.price?.nickname || sub.items.data[0]?.price?.id}`);
    console.log("");
  });

  return subscriptions.data;
}

async function cleanupCancelledSubscriptions(customerId: string) {
  const stripe = getStripe();
  
  console.log(`\n🧹 Limpiando suscripciones canceladas para customer: ${customerId}\n`);
  
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
    status: "canceled",
  });

  if (subscriptions.data.length === 0) {
    console.log("✅ No hay suscripciones canceladas para limpiar");
    return;
  }

  for (const sub of subscriptions.data) {
    try {
      // Intentar eliminar permanentemente (solo funciona si está cancelada)
      await stripe.subscriptions.cancel(sub.id);
      console.log(`✅ Suscripción ${sub.id} eliminada`);
    } catch (error: any) {
      if (error.code === "resource_missing") {
        console.log(`⚠️ Suscripción ${sub.id} ya no existe en Stripe`);
      } else {
        console.error(`❌ Error eliminando ${sub.id}:`, error.message);
      }
    }
  }
}

async function main() {
  const studioSlug = process.argv[2];

  if (!studioSlug) {
    console.error("❌ Uso: npx tsx scripts/cleanup-stripe-subscriptions.ts <studio-slug>");
    process.exit(1);
  }

  try {
    console.log(`🔍 Buscando studio: ${studioSlug}\n`);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
        subscription_status: true,
      },
    });

    if (!studio) {
      console.error(`❌ Studio ${studioSlug} no encontrado`);
      process.exit(1);
    }

    console.log(`✅ Studio encontrado: ${studio.studio_name}`);
    console.log(`   ID: ${studio.id}`);
    console.log(`   Stripe Customer ID: ${studio.stripe_customer_id || "No tiene"}`);
    console.log(`   Stripe Subscription ID: ${studio.stripe_subscription_id || "No tiene"}`);
    console.log(`   Estado en DB: ${studio.subscription_status}`);

    if (!studio.stripe_customer_id) {
      console.log("\n⚠️ Studio no tiene stripe_customer_id. No hay nada que limpiar en Stripe.");
      process.exit(0);
    }

    // Listar todas las suscripciones
    const subscriptions = await listStripeSubscriptions(studio.stripe_customer_id);

    // Preguntar si quiere limpiar (por ahora solo mostrar)
    console.log("\n📊 Resumen:");
    console.log(`   Total suscripciones en Stripe: ${subscriptions.length}`);
    console.log(`   Canceladas: ${subscriptions.filter(s => s.status === "canceled").length}`);
    console.log(`   Activas: ${subscriptions.filter(s => s.status === "active").length}`);
    console.log(`   En trial: ${subscriptions.filter(s => s.status === "trialing").length}`);

    // Mostrar recomendaciones
    const cancelled = subscriptions.filter(s => s.status === "canceled");
    if (cancelled.length > 0) {
      console.log("\n💡 Recomendación:");
      console.log("   Hay suscripciones canceladas en Stripe.");
      console.log("   Si quieres limpiarlas, ejecuta:");
      console.log(`   await cleanupCancelledSubscriptions("${studio.stripe_customer_id}")`);
    }

    // Verificar sincronización
    if (studio.stripe_subscription_id) {
      const existsInStripe = subscriptions.some(s => s.id === studio.stripe_subscription_id);
      if (!existsInStripe) {
        console.log("\n⚠️ ADVERTENCIA:");
        console.log(`   La suscripción ${studio.stripe_subscription_id} en nuestra DB no existe en Stripe.`);
        console.log("   Deberías limpiar este campo en la DB.");
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  });

