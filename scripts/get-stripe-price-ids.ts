#!/usr/bin/env tsx
/**
 * Script para obtener Price IDs de Stripe desde Product IDs
 * 
 * Uso: tsx scripts/get-stripe-price-ids.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { getStripe } from "@/lib/stripe";

// Cargar variables de entorno
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ ERROR: STRIPE_SECRET_KEY no está definida en .env.local");
  process.exit(1);
}

// Mapeo de Product IDs proporcionados
const products = [
  {
    name: "Starter",
    productId: "prod_Th9NR9W7LV3yQb",
    price: 299.00,
    dbSlug: "basic",
  },
  {
    name: "Pro",
    productId: "prod_Th9OnyjTk3S3O6",
    price: 599.00,
    dbSlug: "pro",
  },
  {
    name: "Premium",
    productId: "prod_Th9OfNMhz3qLlG",
    price: 999.00,
    dbSlug: "enterprise",
  },
];

async function getPriceIds() {
  try {
    const stripe = getStripe();
    console.log("🔍 Obteniendo Price IDs desde Stripe...\n");

    const results = [];

    for (const product of products) {
      console.log(`📦 ${product.name} (${product.productId})`);
      
      // Obtener todos los precios del producto
      const prices = await stripe.prices.list({
        product: product.productId,
        active: true,
      });

      // Buscar el precio mensual que coincida con el monto
      const monthlyPrice = prices.data.find(
        (p) =>
          p.recurring?.interval === "month" &&
          p.currency === "mxn" &&
          p.unit_amount === Math.round(product.price * 100)
      );

      if (monthlyPrice) {
        console.log(`   ✅ Price ID: ${monthlyPrice.id}`);
        console.log(`   💰 Monto: MXN ${(monthlyPrice.unit_amount! / 100).toFixed(2)}`);
        console.log(`   📅 Intervalo: ${monthlyPrice.recurring?.interval}`);
        results.push({
          ...product,
          priceId: monthlyPrice.id,
        });
      } else {
        console.log(`   ⚠️  No se encontró precio mensual que coincida`);
        console.log(`   Precios disponibles:`);
        prices.data.forEach((p) => {
          if (p.recurring?.interval === "month" && p.currency === "mxn") {
            console.log(`     - ${p.id}: MXN ${(p.unit_amount! / 100).toFixed(2)}`);
          }
        });
        results.push({
          ...product,
          priceId: null,
        });
      }
      console.log("");
    }

    // Generar SQL
    console.log("📝 SQL para actualizar en Supabase:\n");
    console.log("-- Actualizar planes con Product IDs y Price IDs de Stripe");
    console.log("-- Fecha: " + new Date().toISOString());
    console.log("");

    results.forEach((result) => {
      if (result.priceId) {
        console.log(`-- ${result.name} (${result.dbSlug})`);
        console.log(`UPDATE platform_plans`);
        console.log(`SET`);
        console.log(`  stripe_product_id = '${result.productId}',`);
        console.log(`  stripe_price_id = '${result.priceId}',`);
        console.log(`  price_monthly = ${result.price.toFixed(2)},`);
        console.log(`  updated_at = NOW()`);
        console.log(`WHERE slug = '${result.dbSlug}';`);
        console.log("");
      } else {
        console.log(`-- ⚠️  ${result.name} (${result.dbSlug}) - Price ID no encontrado`);
        console.log(`-- Actualizar solo Product ID y precio manualmente`);
        console.log(`UPDATE platform_plans`);
        console.log(`SET`);
        console.log(`  stripe_product_id = '${result.productId}',`);
        console.log(`  price_monthly = ${result.price.toFixed(2)},`);
        console.log(`  updated_at = NOW()`);
        console.log(`WHERE slug = '${result.dbSlug}';`);
        console.log("");
      }
    });

    console.log("\n✅ Script completado");
  } catch (error) {
    console.error("❌ Error obteniendo Price IDs:", error);
    process.exit(1);
  }
}

getPriceIds();

