"use client";

import React from "react";
import { CotizacionRenderData } from "./types";
import { renderCotizacionBlock } from "./utils/contract-renderer";

interface CotizacionBlockProps {
  cotizacion: CotizacionRenderData;
}

export function CotizacionBlock({ cotizacion }: CotizacionBlockProps) {
  const html = renderCotizacionBlock(cotizacion);
  return (
    <div
      className="cotizacion-block-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

