"use client";

import { useMemo } from "react";
import { EventContractData } from "@/types/contracts";
import {
  CotizacionRenderData,
  CondicionesComercialesData,
} from "../types";
import { renderCotizacionBlock, renderCondicionesComercialesBlock } from "../utils/contract-renderer";

interface UseContractRendererProps {
  content: string;
  eventData?: EventContractData;
  cotizacionData?: CotizacionRenderData;
  condicionesData?: CondicionesComercialesData;
  showVariables?: boolean;
}

export function useContractRenderer({
  content,
  eventData,
  cotizacionData,
  condicionesData,
  showVariables = false,
}: UseContractRendererProps) {
  const renderedContent = useMemo(() => {
    if (showVariables) {
      // Convertir saltos de línea a <br> incluso cuando showVariables es true
      return content.replace(/\n/g, '<br>');
    }

    // Si el contenido es HTML, preservar saltos de línea entre elementos
    let rendered = content;

    // Si es HTML, convertir saltos de línea entre tags en <br>
    if (/<[^>]+>/.test(rendered)) {
      // EXCEPTO entre </li> y <li> (items de lista no deben tener salto de línea entre ellos)
      // Primero, preservar los saltos de línea entre </li> y <li> sin convertirlos
      rendered = rendered.replace(/(<\/li>)\s*\n\s*(<li[^>]*>)/gi, '$1$2');
      // Ahora convertir el resto de saltos de línea entre tags en <br>
      rendered = rendered.replace(/>\s*\n\s*</g, '><br><');
    } else {
      // Si es texto plano, convertir saltos de línea a <br>
      rendered = rendered.replace(/\n/g, '<br>');
    }

    if (!eventData) {
      // Si no hay datos, mostrar placeholders
      const placeholders: Record<string, string> = {
        "@nombre_cliente": "{nombre_cliente}",
        "@fecha_evento": "{fecha_evento}",
        "@tipo_evento": "{tipo_evento}",
        "@nombre_evento": "{nombre_evento}",
        "@total_contrato": "{total_contrato}",
        "@condiciones_pago": "{condiciones_pago}",
        "@nombre_studio": "{nombre_studio}",
      };

      Object.entries(placeholders).forEach(([key, placeholder]) => {
        rendered = rendered.replaceAll(key, placeholder);
        rendered = rendered.replaceAll(
          key.replace("@", "{").replace("@", "}"),
          placeholder
        );
      });

      // Placeholders para bloques
      if (rendered.includes("@cotizacion_autorizada")) {
        rendered = rendered.replace(
          "@cotizacion_autorizada",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Cotización autorizada aparecerá aquí</p></div>'
        );
      }
      if (rendered.includes("{cotizacion_autorizada}")) {
        rendered = rendered.replace(
          "{cotizacion_autorizada}",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Cotización autorizada aparecerá aquí</p></div>'
        );
      }
      if (rendered.includes("@condiciones_comerciales")) {
        rendered = rendered.replace(
          "@condiciones_comerciales",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Condiciones comerciales aparecerán aquí</p></div>'
        );
      }
      if (rendered.includes("{condiciones_comerciales}")) {
        rendered = rendered.replace(
          "{condiciones_comerciales}",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Condiciones comerciales aparecerán aquí</p></div>'
        );
      }

      return rendered;
    }

    // Reemplazar variables simples
    const variables: Record<string, string> = {
      "@nombre_cliente": eventData.nombre_cliente,
      "@fecha_evento": eventData.fecha_evento,
      "@tipo_evento": eventData.tipo_evento,
      "@nombre_evento": eventData.nombre_evento,
      "@total_contrato": eventData.total_contrato,
      "@condiciones_pago": eventData.condiciones_pago,
      "@nombre_studio": eventData.nombre_studio,
    };

    // También soportar sintaxis {variable}
    const braceVariables: Record<string, string> = {
      "{nombre_cliente}": eventData.nombre_cliente,
      "{fecha_evento}": eventData.fecha_evento,
      "{tipo_evento}": eventData.tipo_evento,
      "{nombre_evento}": eventData.nombre_evento,
      "{total_contrato}": eventData.total_contrato,
      "{condiciones_pago}": eventData.condiciones_pago,
      "{nombre_studio}": eventData.nombre_studio,
    };

    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    Object.entries(braceVariables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    // Renderizar bloque de cotización
    if (cotizacionData) {
      const cotizacionHtml = renderCotizacionBlock(cotizacionData);
      rendered = rendered.replace("@cotizacion_autorizada", cotizacionHtml);
      rendered = rendered.replace("{cotizacion_autorizada}", cotizacionHtml);
    } else {
      // Placeholder si no hay datos
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay cotización autorizada disponible</p></div>';
      rendered = rendered.replace("@cotizacion_autorizada", placeholder);
      rendered = rendered.replace("{cotizacion_autorizada}", placeholder);
    }

    // Renderizar bloque de condiciones comerciales
    if (condicionesData) {
      const condicionesHtml = renderCondicionesComercialesBlock(condicionesData);
      rendered = rendered.replace("@condiciones_comerciales", condicionesHtml);
      rendered = rendered.replace("{condiciones_comerciales}", condicionesHtml);
    } else {
      // Placeholder si no hay datos
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay condiciones comerciales disponibles</p></div>';
      rendered = rendered.replace("@condiciones_comerciales", placeholder);
      rendered = rendered.replace("{condiciones_comerciales}", placeholder);
    }

    // Renderizar bloque legacy [SERVICIOS_INCLUIDOS] si existe
    if (rendered.includes("[SERVICIOS_INCLUIDOS]")) {
      const serviciosHtml = renderServiciosBlock(eventData.servicios_incluidos);
      rendered = rendered.replace("[SERVICIOS_INCLUIDOS]", serviciosHtml);
    }

    // Limitar múltiples <br> seguidos a máximo 1 (saltos de línea simples)
    rendered = rendered.replace(/(<br>\s*){2,}/g, '<br>');

    // Agregar espaciado mínimo entre bloques HTML solo si no hay ya un <br>
    rendered = rendered
      .replace(/<\/p>(?!<br>)\s*<p/g, '</p><br><p')
      .replace(/<\/h1>(?!<br>)\s*<h2/g, '</h1><br><h2')
      .replace(/<\/h2>(?!<br>)\s*<h3/g, '</h2><br><h3')
      .replace(/<\/h3>(?!<br>)\s*<p/g, '</h3><br><p')
      .replace(/<\/ul>(?!<br>)\s*<h/g, '</ul><br><h')
      .replace(/<\/ol>(?!<br>)\s*<h/g, '</ol><br><h')
      // Solo un <br> para bloques especiales
      .replace(/(<\/div>)\s*(<div class="(?:cotizacion|condiciones))/g, '$1<br>$2');

    return rendered;
  }, [content, eventData, cotizacionData, condicionesData, showVariables]);

  return { renderedContent };
}

// Helper para renderizar servicios (legacy)
function renderServiciosBlock(servicios: any[]): string {
  if (servicios.length === 0) {
    return "<p><em>No hay servicios incluidos</em></p>";
  }

  let html = '<div class="servicios-incluidos">';

  servicios.forEach((categoria: any) => {
    html += `
      <div class="servicio-categoria mb-5">
        <h3 class="font-semibold text-zinc-300 mb-2">${categoria.categoria}</h3>
        <ul class="list-disc list-inside space-y-1 text-zinc-400">
    `;

    categoria.servicios.forEach((servicio: any) => {
      const precio =
        servicio.precio > 0
          ? ` - ${new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(servicio.precio)}`
          : "";

      html += `<li>${servicio.nombre}${precio}</li>`;

      if (servicio.descripcion) {
        html += `<p class="text-sm text-zinc-500 ml-6">${servicio.descripcion}</p>`;
      }
    });

    html += `
        </ul>
      </div>
    `;
  });

  html += "</div>";

  return html;
}

