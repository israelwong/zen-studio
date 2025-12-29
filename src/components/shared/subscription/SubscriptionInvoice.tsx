"use client";

import React, { useState, useEffect, useRef } from "react";
import { ZenDialog, ZenCard, ZenCardContent } from "@/components/ui/zen";
import { Skeleton } from "@/components/ui/shadcn/Skeleton";
import { FileText, Calendar, CreditCard, Building2, Download, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getStripeInvoice } from "@/lib/actions/studio/account/suscripcion/invoice.actions";

interface SubscriptionInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  invoiceId: string;
}

export function SubscriptionInvoice({
  isOpen,
  onClose,
  studioSlug,
  invoiceId,
}: SubscriptionInvoiceProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoice();
    } else {
      setData(null);
      setLoading(false);
    }
  }, [isOpen, invoiceId, studioSlug]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const result = await getStripeInvoice(studioSlug, invoiceId);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast.error(result.error || "Error al cargar factura");
        onClose();
      }
    } catch (error) {
      console.error("Error loading invoice:", error);
      toast.error("Error al cargar factura");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!data) return;

    // Si Stripe ya tiene un PDF generado, usarlo directamente
    if (data.invoice_pdf) {
      window.open(data.invoice_pdf, '_blank');
      toast.success("Descargando factura de Stripe");
      return;
    }

    // Si no hay PDF de Stripe, generar uno local
    if (!printableRef.current) return;

    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      // Clone element and preserve structure but add inline styles for PDF
      const clone = printableRef.current.cloneNode(true) as HTMLElement;
      
      // Add inline styles to preserve visual appearance in PDF
      const applyPDFStyles = (element: HTMLElement) => {
        const classes = element.className || '';
        
        // Apply styles based on classes
        if (classes.includes('text-white') || classes.includes('text-zinc-100')) {
          element.style.color = '#1a1a1a';
        }
        if (classes.includes('text-zinc-200')) {
          element.style.color = '#27272a';
        }
        if (classes.includes('text-zinc-300')) {
          element.style.color = '#3f3f46';
        }
        if (classes.includes('text-zinc-400')) {
          element.style.color = '#71717a';
        }
        if (classes.includes('text-emerald-400')) {
          element.style.color = '#34d399';
        }
        if (classes.includes('text-blue-400')) {
          element.style.color = '#60a5fa';
        }
        if (classes.includes('text-purple-400')) {
          element.style.color = '#a78bfa';
        }
        if (classes.includes('text-green-400')) {
          element.style.color = '#4ade80';
        }
        if (classes.includes('text-yellow-400')) {
          element.style.color = '#facc15';
        }
        if (classes.includes('bg-zinc-800')) {
          element.style.backgroundColor = '#27272a';
        }
        if (classes.includes('bg-emerald-600')) {
          element.style.backgroundColor = '#059669';
        }
        if (classes.includes('bg-zinc-800/30')) {
          element.style.backgroundColor = 'rgba(39, 39, 42, 0.3)';
        }
        if (classes.includes('bg-emerald-600/20')) {
          element.style.backgroundColor = 'rgba(5, 150, 105, 0.2)';
        }
        if (classes.includes('border-zinc-700')) {
          element.style.borderColor = '#3f3f46';
        }
        if (classes.includes('border-zinc-700/50')) {
          element.style.borderColor = 'rgba(63, 63, 70, 0.5)';
        }
        if (classes.includes('border-zinc-700/30')) {
          element.style.borderColor = 'rgba(63, 63, 70, 0.3)';
        }
        if (classes.includes('rounded-lg')) {
          element.style.borderRadius = '8px';
        }
        if (classes.includes('rounded-full')) {
          element.style.borderRadius = '9999px';
        }
        if (classes.includes('font-bold')) {
          element.style.fontWeight = '700';
        }
        if (classes.includes('font-semibold')) {
          element.style.fontWeight = '600';
        }
        if (classes.includes('font-medium')) {
          element.style.fontWeight = '500';
        }
        if (classes.includes('text-lg')) {
          element.style.fontSize = '18pt';
        }
        if (classes.includes('text-sm')) {
          element.style.fontSize = '11pt';
        }
        if (classes.includes('text-xs')) {
          element.style.fontSize = '9pt';
        }
        if (classes.includes('p-2')) {
          element.style.padding = '8px';
        }
        if (classes.includes('p-3')) {
          element.style.padding = '12px';
        }
        if (classes.includes('px-2')) {
          element.style.paddingLeft = '8px';
          element.style.paddingRight = '8px';
        }
        if (classes.includes('py-1')) {
          element.style.paddingTop = '4px';
          element.style.paddingBottom = '4px';
        }
        if (classes.includes('py-1.5')) {
          element.style.paddingTop = '6px';
          element.style.paddingBottom = '6px';
        }
        if (classes.includes('pb-3')) {
          element.style.paddingBottom = '12px';
        }
        if (classes.includes('pt-1')) {
          element.style.paddingTop = '4px';
        }
        if (classes.includes('pt-2')) {
          element.style.paddingTop = '8px';
        }
        if (classes.includes('mb-0.5')) {
          element.style.marginBottom = '2px';
        }
        if (classes.includes('mb-2')) {
          element.style.marginBottom = '8px';
        }
        if (classes.includes('mt-0.5')) {
          element.style.marginTop = '2px';
        }
        if (classes.includes('mt-2')) {
          element.style.marginTop = '8px';
        }
        if (classes.includes('gap-1.5')) {
          element.style.gap = '6px';
        }
        if (classes.includes('gap-2')) {
          element.style.gap = '8px';
        }
        if (classes.includes('gap-3')) {
          element.style.gap = '12px';
        }
        if (classes.includes('border')) {
          element.style.borderWidth = '1px';
          element.style.borderStyle = 'solid';
        }
        if (classes.includes('border-b')) {
          element.style.borderBottomWidth = '1px';
          element.style.borderBottomStyle = 'solid';
        }
        if (classes.includes('border-t')) {
          element.style.borderTopWidth = '1px';
          element.style.borderTopStyle = 'solid';
        }
        if (classes.includes('flex')) {
          element.style.display = 'flex';
        }
        if (classes.includes('grid')) {
          element.style.display = 'grid';
        }
        if (classes.includes('grid-cols-2')) {
          element.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        }
        if (classes.includes('items-center')) {
          element.style.alignItems = 'center';
        }
        if (classes.includes('justify-between')) {
          element.style.justifyContent = 'space-between';
        }
        if (classes.includes('flex-1')) {
          element.style.flex = '1';
        }
        if (classes.includes('text-right')) {
          element.style.textAlign = 'right';
        }
        if (classes.includes('h-3.5')) {
          element.style.height = '14px';
        }
        if (classes.includes('w-3.5')) {
          element.style.width = '14px';
        }
        if (classes.includes('h-5')) {
          element.style.height = '20px';
        }
        if (classes.includes('w-5')) {
          element.style.width = '20px';
        }
      };

      // Apply styles to all elements
      const allElements = clone.querySelectorAll("*");
      allElements.forEach((el) => {
        applyPDFStyles(el as HTMLElement);
      });
      applyPDFStyles(clone);

      // Create iframe to isolate from page styles
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.width = "210mm";
      iframe.style.height = "297mm";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Cannot access iframe document");

      // Write HTML with professional PDF styles
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 30px 40px;
              width: 210mm;
              min-height: 297mm;
              background: white;
              color: #1a1a1a;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              font-size: 11pt;
              line-height: 1.5;
            }
            h2 {
              font-size: 22pt;
              font-weight: 700;
              color: #000;
              margin-bottom: 4pt;
            }
            .space-y-3 > * + * {
              margin-top: 12px;
            }
            .space-y-2 > * + * {
              margin-top: 8px;
            }
            .space-y-1.5 > * + * {
              margin-top: 6px;
            }
            .space-y-1 > * + * {
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          ${clone.innerHTML}
        </body>
        </html>
      `);
      iframeDoc.close();

      // Wait for iframe to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, imgHeight);
      pdf.save(`factura-${data.number || invoiceId.slice(0, 8)}.pdf`);

      toast.success("PDF generado correctamente");
      document.body.removeChild(iframe);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatAmount = (amount: number, currency: string = "MXN") => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Factura de Suscripción"
        description="Detalles de la factura"
        maxWidth="2xl"
        onCancel={onClose}
        cancelLabel="Cerrar"
        onSave={handleDownloadPDF}
        saveLabel={data?.invoice_pdf ? "Descargar PDF de Stripe" : "Generar PDF"}
        saveVariant="primary"
        isLoading={generatingPdf}
      >
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto pr-2 -mr-2">
          {loading && (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full bg-zinc-800 animate-pulse" />
              <Skeleton className="h-48 w-full bg-zinc-800 animate-pulse" />
              <Skeleton className="h-24 w-full bg-zinc-800 animate-pulse" />
            </div>
          )}

          {!loading && data && (
            <div ref={printableRef} className="space-y-3">
              {/* Header de Factura */}
              <div className="border-b border-zinc-700 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 bg-emerald-600/20 rounded-lg">
                      <Receipt className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white">Factura de Suscripción</h2>
                        <span className="text-lg font-bold text-emerald-400">
                          {formatAmount(data.amount_paid || data.amount, data.currency)}
                        </span>
                      </div>
                      {data.number && (
                        <p className="text-xs text-zinc-400">#{data.number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Fecha de emisión</p>
                    <p className="text-sm font-medium text-white">
                      {formatDate(data.created)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid de 2 columnas: Estudio y Período */}
              <div className="grid grid-cols-2 gap-3">
                {/* Información del Estudio */}
                {data.studio && (
                  <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-blue-400" />
                      <h3 className="text-xs font-semibold text-zinc-300">
                        Estudio
                      </h3>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">
                      {data.studio.studio_name}
                    </p>
                    {data.studio.email && (
                      <p className="text-xs text-zinc-400 mt-0.5">{data.studio.email}</p>
                    )}
                  </div>
                )}

                {/* Período de Facturación */}
                {(data.period_start || data.period_end) && (
                  <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-purple-400" />
                      <h3 className="text-xs font-semibold text-zinc-300">
                        Período
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {data.period_start && (
                        <div>
                          <p className="text-xs text-zinc-400">Desde</p>
                          <p className="text-xs font-medium text-zinc-100">
                            {formatDate(data.period_start)}
                          </p>
                        </div>
                      )}
                      {data.period_end && (
                        <div>
                          <p className="text-xs text-zinc-400">Hasta</p>
                          <p className="text-xs font-medium text-zinc-100">
                            {formatDate(data.period_end)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Detalles del Plan y Servicio */}
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-zinc-300">
                    Detalles del Servicio
                  </h3>
                </div>
                <div className="space-y-2">
                  {data.plan && (
                    <div className="pb-2 border-b border-zinc-700/30">
                      <p className="text-xs text-zinc-400 mb-0.5">Plan</p>
                      <p className="text-sm font-semibold text-zinc-100">
                        {data.plan.name}
                      </p>
                    </div>
                  )}

                  {data.description && (
                    <div className="pb-2 border-b border-zinc-700/30">
                      <p className="text-xs text-zinc-400 mb-0.5">Descripción</p>
                      <p className="text-xs text-zinc-200">{data.description}</p>
                    </div>
                  )}

                  {/* Desglose de Montos */}
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Subtotal</span>
                      <span className="text-sm font-medium text-zinc-200">
                        {formatAmount(data.subtotal || data.amount, data.currency)}
                      </span>
                    </div>
                    {data.tax && data.tax > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Impuestos</span>
                        <span className="text-sm font-medium text-zinc-200">
                          {formatAmount(data.tax, data.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
                      <span className="text-sm font-semibold text-zinc-100">
                        Total
                      </span>
                      <span className="text-sm font-semibold text-zinc-200">
                        {formatAmount(data.amount_paid || data.amount, data.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado de Pago */}
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {data.status === "paid" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-yellow-400" />
                    )}
                    <span className="text-xs font-semibold text-zinc-300">
                      Estado
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      data.status === "paid"
                        ? "bg-green-900/30 text-green-300 border border-green-800/50"
                        : data.status === "open"
                        ? "bg-yellow-900/30 text-yellow-300 border border-yellow-800/50"
                        : "bg-red-900/30 text-red-300 border border-red-800/50"
                    }`}
                  >
                    {data.status === "paid"
                      ? "✓ Pagado"
                      : data.status === "open"
                      ? "Pendiente"
                      : "Fallido"}
                  </span>
                </div>
                {data.status === "paid" && data.paid_at && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/30">
                    <span className="text-xs text-zinc-400">Fecha de pago</span>
                    <span className="text-xs font-medium text-zinc-200">
                      {formatDate(data.paid_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ZenDialog>
    </>
  );
}

