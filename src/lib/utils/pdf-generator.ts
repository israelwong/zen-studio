"use client";

import html2pdf from "html2pdf.js";

export interface PDFOptions {
  filename?: string;
  margin?: number;
  image?: { type: string; quality: number };
  html2canvas?: { scale: number };
  jsPDF?: { unit: string; format: string; orientation: string };
}

const DEFAULT_OPTIONS: PDFOptions = {
  margin: 1,
  filename: "contrato.pdf",
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
};

/**
 * Genera un PDF desde contenido HTML
 * @param htmlContent - Contenido HTML a convertir
 * @param options - Opciones de configuración del PDF
 */
export async function generatePDF(
  htmlContent: string,
  options: PDFOptions = {}
): Promise<void> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Crear un contenedor temporal
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  
  // Aplicar estilos para el PDF
  container.style.width = "8.5in";
  container.style.padding = "0.5in";
  container.style.backgroundColor = "white";
  container.style.color = "black";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.fontSize = "12pt";
  container.style.lineHeight = "1.6";
  
  // Agregar al DOM temporalmente (necesario para html2canvas)
  container.style.position = "absolute";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  try {
    // Generar PDF
    await html2pdf().set(finalOptions).from(container).save();
  } finally {
    // Limpiar contenedor temporal
    document.body.removeChild(container);
  }
}

/**
 * Genera un PDF desde un elemento del DOM
 * @param element - Elemento HTML del DOM
 * @param options - Opciones de configuración del PDF
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Clonar el elemento para no afectar el original
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Aplicar estilos para el PDF
  clone.style.backgroundColor = "white";
  clone.style.color = "black";
  clone.style.width = "8.5in";
  clone.style.padding = "0.5in";
  
  // Agregar al DOM temporalmente
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  document.body.appendChild(clone);

  try {
    await html2pdf().set(finalOptions).from(clone).save();
  } finally {
    document.body.removeChild(clone);
  }
}

/**
 * Genera nombre de archivo para contrato
 * @param eventName - Nombre del evento
 * @param clientName - Nombre del cliente
 */
export function generateContractFilename(
  eventName: string,
  clientName: string
): string {
  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const date = new Date().toISOString().split("T")[0];
  return `contrato-${sanitize(eventName)}-${sanitize(clientName)}-${date}.pdf`;
}
