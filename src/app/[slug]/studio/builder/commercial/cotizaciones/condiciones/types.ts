// Ruta: src/app/studio/[slug]/configuracion/negocio/condiciones-comerciales/types.ts

export interface CondicionComercialData {
    id: string;
    projectId: string;
    nombre: string;
    descripcion?: string | null;
    porcentaje_descuento?: number | null;
    porcentaje_anticipo?: number | null;
    status: string;
    orden: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CondicionComercialUpdate {
    id: string;
    nombre: string;
    descripcion?: string | null;
    porcentaje_descuento?: number | null;
    porcentaje_anticipo?: number | null;
    status: string;
    orden: number | null;
}

export interface CondicionComercialFormData {
    nombre: string;
    descripcion?: string | null;
    porcentaje_descuento?: string | null;
    porcentaje_anticipo?: string | null;
    status: string;
    orden: number | null;
}
