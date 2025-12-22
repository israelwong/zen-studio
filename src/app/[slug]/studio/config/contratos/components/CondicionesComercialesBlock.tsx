"use client";

import React from "react";
import { CondicionesComercialesData } from "./types";
import { renderCondicionesComercialesBlock } from "./utils/contract-renderer";

interface CondicionesComercialesBlockProps {
  condiciones: CondicionesComercialesData;
}

export function CondicionesComercialesBlock({
  condiciones,
}: CondicionesComercialesBlockProps) {
  const html = renderCondicionesComercialesBlock(condiciones);
  return (
    <div
      className="condiciones-comerciales-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

