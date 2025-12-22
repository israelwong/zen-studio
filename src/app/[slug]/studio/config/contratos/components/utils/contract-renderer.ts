// Renderizado de bloques especiales del contrato

import { CotizacionRenderData, CondicionesComercialesData } from "../types";

/**
 * Renderiza bloque de cotización autorizada
 */
export function renderCotizacionBlock(
  cotizacion: CotizacionRenderData
): string {
  if (!cotizacion.secciones || cotizacion.secciones.length === 0) {
    return '<p class="text-zinc-500 italic">No hay cotización disponible</p>';
  }

  let html = '<div class="cotizacion-block space-y-6">';

  // Ordenar secciones por orden
  const seccionesOrdenadas = [...cotizacion.secciones].sort(
    (a, b) => a.orden - b.orden
  );

  seccionesOrdenadas.forEach((seccion) => {
    html += `<div class="seccion mb-6">`;
    html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3">${seccion.nombre}</h3>`;

    // Ordenar categorías por orden
    const categoriasOrdenadas = [...seccion.categorias].sort(
      (a, b) => a.orden - b.orden
    );

    categoriasOrdenadas.forEach((categoria) => {
      html += `<div class="categoria mb-4 ml-4">`;
      html += `<h4 class="text-base font-medium text-zinc-300 mb-2">${categoria.nombre}</h4>`;
      html += `<ul class="list-disc list-inside space-y-1 text-zinc-400 ml-4">`;

      categoria.items.forEach((item) => {
        const subtotalFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(item.subtotal);

        html += `<li class="mb-1">`;
        html += `<span class="font-medium">${item.nombre}</span>`;
        if (item.cantidad > 1) {
          html += ` <span class="text-zinc-500">(x${item.cantidad})</span>`;
        }
        html += ` <span class="text-emerald-400">${subtotalFormateado}</span>`;
        html += `</li>`;

        if (item.descripcion) {
          html += `<p class="text-sm text-zinc-500 ml-6 mb-2">${item.descripcion}</p>`;
        }
      });

      html += `</ul>`;
      html += `</div>`;
    });

    html += `</div>`;
  });

  // Total
  const totalFormateado = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cotizacion.total);

  html += `<div class="total mt-6 pt-4 border-t border-zinc-800">`;
  html += `<p class="text-lg font-semibold text-zinc-200">`;
  html += `Total: <span class="text-emerald-400">${totalFormateado}</span>`;
  html += `</p>`;
  html += `</div>`;

  html += "</div>";

  return html;
}

/**
 * Renderiza bloque de condiciones comerciales
 */
export function renderCondicionesComercialesBlock(
  condiciones: CondicionesComercialesData
): string {
  let html = '<div class="condiciones-comerciales space-y-4">';

  html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3">${condiciones.nombre}</h3>`;

  if (condiciones.descripcion) {
    html += `<p class="text-zinc-400 mb-4">${condiciones.descripcion}</p>`;
  }

  html += '<div class="detalles space-y-3">';

  // Anticipo
  if (condiciones.porcentaje_anticipo !== undefined) {
    if (condiciones.tipo_anticipo === "percentage") {
      html += `<p class="text-zinc-300">`;
      html += `<span class="font-medium">Anticipo:</span> `;
      html += `${condiciones.porcentaje_anticipo}%`;
      html += `</p>`;
    } else if (condiciones.monto_anticipo !== undefined) {
      const montoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.monto_anticipo);
      html += `<p class="text-zinc-300">`;
      html += `<span class="font-medium">Anticipo:</span> ${montoFormateado}`;
      html += `</p>`;
    }
  }

  // Descuento
  if (condiciones.porcentaje_descuento !== undefined) {
    html += `<p class="text-zinc-300">`;
    html += `<span class="font-medium">Descuento:</span> `;
    html += `${condiciones.porcentaje_descuento}%`;
    html += `</p>`;
  }

  // Métodos de pago
  if (
    condiciones.condiciones_metodo_pago &&
    condiciones.condiciones_metodo_pago.length > 0
  ) {
    html += `<div class="metodos-pago mt-4">`;
    html += `<p class="font-medium text-zinc-300 mb-2">Métodos de Pago:</p>`;
    html += `<ul class="list-disc list-inside space-y-1 text-zinc-400 ml-4">`;
    condiciones.condiciones_metodo_pago.forEach((metodo) => {
      html += `<li>${metodo.metodo_pago}`;
      if (metodo.descripcion) {
        html += ` - ${metodo.descripcion}`;
      }
      html += `</li>`;
    });
    html += `</ul>`;
    html += `</div>`;
  }

  html += "</div>";
  html += "</div>";

  return html;
}

