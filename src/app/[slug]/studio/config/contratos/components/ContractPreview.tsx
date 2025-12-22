"use client";

import React from "react";
import { EventContractData } from "@/types/contracts";
import { ZenCard, ZenCardContent } from "@/components/ui/zen";
import { useContractRenderer } from "./hooks/useContractRenderer";
import { cn } from "@/lib/utils";
import {
  CotizacionRenderData,
  CondicionesComercialesData,
} from "./types";

interface ContractPreviewProps {
  content: string;
  eventData?: EventContractData;
  cotizacionData?: CotizacionRenderData;
  condicionesData?: CondicionesComercialesData;
  showVariables?: boolean;
  className?: string;
}

export function ContractPreview({
  content,
  eventData,
  cotizacionData,
  condicionesData,
  showVariables = false,
  className = "",
}: ContractPreviewProps) {
  const { renderedContent } = useContractRenderer({
    content,
    eventData,
    cotizacionData,
    condicionesData,
    showVariables,
  });

  return (
    <ZenCard variant="default" className={cn("h-full flex flex-col relative z-0", className)}>
      <ZenCardContent className="p-4 flex-1 overflow-y-auto relative z-0">
        <style dangerouslySetInnerHTML={{
          __html: `
          .contract-preview br {
            display: block;
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.2 !important;
            height: 0 !important;
            content: "";
          }
          .contract-preview h1 + *,
          .contract-preview h2 + *,
          .contract-preview h3 + *,
          .contract-preview h1 + p,
          .contract-preview h2 + p,
          .contract-preview h3 + p,
          .contract-preview h1 + ul,
          .contract-preview h2 + ul,
          .contract-preview h3 + ul,
          .contract-preview h1 + ol,
          .contract-preview h2 + ol,
          .contract-preview h3 + ol,
          .contract-preview h1 + div,
          .contract-preview h2 + div,
          .contract-preview h3 + div {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .contract-preview ul {
            list-style-position: outside !important;
            padding-left: 1.5rem !important;
          }
          .contract-preview ol {
            list-style-position: outside !important;
            padding-left: 1.5rem !important;
          }
          .contract-preview ul li {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-left: 0.5rem !important;
            line-height: 1.2 !important;
            list-style-type: disc !important;
            list-style-position: outside !important;
            display: list-item !important;
          }
          .contract-preview ol li {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-left: 0.5rem !important;
            line-height: 1.2 !important;
            list-style-type: decimal !important;
            list-style-position: outside !important;
            display: list-item !important;
          }
          .contract-preview ul,
          .contract-preview ol {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .contract-preview p {
            line-height: 1.6 !important;
          }
          .contract-preview [class*="copy"],
          .contract-preview [class*="Copy"],
          .contract-preview [class*="clipboard"],
          .contract-preview button[aria-label*="copiar"],
          .contract-preview button[aria-label*="Copiar"],
          .contract-preview button[title*="copiar"],
          .contract-preview button[title*="Copiar"],
          .contract-preview svg[class*="copy"],
          .contract-preview svg[class*="Copy"] {
            display: none !important;
          }
        `}} />
        <div
          className="contract-preview prose prose-invert prose-zinc max-w-none
            prose-headings:text-zinc-100
            prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-0 prose-h1:mt-0 prose-h1:uppercase
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mb-0 prose-h2:mt-0 prose-h2:flex prose-h2:items-center
            prose-h3:text-lg prose-h3:font-medium prose-h3:text-zinc-300 prose-h3:mb-0 prose-h3:mt-0
            prose-p:text-zinc-400 prose-p:mb-1 prose-p:mt-0 prose-p:leading-loose
            prose-ul:list-disc prose-ul:list-outside prose-ul:space-y-0 prose-ul:text-zinc-400 prose-ul:mb-0 prose-ul:mt-0 prose-ul:pl-6
            prose-ol:list-decimal prose-ol:list-outside prose-ol:space-y-0 prose-ol:text-zinc-400 prose-ol:mb-0 prose-ol:mt-0 prose-ol:pl-6
            prose-li:mb-0 prose-li:mt-0
            prose-strong:text-zinc-200 prose-strong:font-semibold
            prose-em:text-zinc-500 prose-em:italic
            [&>div]:mb-0 [&>div]:mt-0
            [&_h1+*]:mt-0 [&_h2+*]:mt-0 [&_h3+*]:mt-0
            scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          style={{
            lineHeight: '1.2',
          }}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {showVariables && (
          <div className="mt-6 p-4 bg-blue-950/20 border border-blue-800/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <span className="font-semibold">Nota:</span> Las variables como{" "}
              <code className="bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-300">
                @nombre_cliente
              </code>{" "}
              serán reemplazadas automáticamente con los datos del evento.
            </p>
          </div>
        )}

        {eventData && !showVariables && (
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-600 text-center">
              Documento generado para {eventData.nombre_cliente} •{" "}
              {eventData.fecha_evento}
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

