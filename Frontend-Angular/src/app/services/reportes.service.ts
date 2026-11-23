import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export interface KpisInventario {
  productosActivos: number;
  unidadesEnStock: number;
  valorInventarioCosto: number;
  productosBajoMinimo: number;
  productosSobrestock: number;
  productosSinVentas90d: number;
  unidadesVendidas90d: number;
}

export interface ItemStock {
  producto: string;
  sku: string;
  almacen: string;
  cantidad: number;
  referencia: number;
}

export interface ItemVenta {
  producto: string;
  sku: string;
  unidadesVendidas: number;
  stockActual: number;
  diasDeCobertura: number | null;
}

export interface ItemCategoria {
  categoria: string;
  unidades: number;
  valorCosto: number;
}

export interface DatosInventario {
  generadoEn: string;
  kpis: KpisInventario;
  bajoMinimo: ItemStock[];
  sobrestock: ItemStock[];
  masVendidos: ItemVenta[];
  sinMovimiento: ItemVenta[];
  porCategoria: ItemCategoria[];
}

export type TipoHallazgo = 'quiebre' | 'sobrestock' | 'rotacion' | 'general';
export type Prioridad = 'alta' | 'media' | 'baja';

/** Los campos del informe de la IA llegan en snake_case (contrato JSON fijo del prompt). */
export interface InformeIA {
  titulo: string;
  resumen_ejecutivo: string;
  hallazgos: { tipo: TipoHallazgo; producto: string | null; detalle: string }[];
  recomendaciones: { prioridad: Prioridad; accion: string }[];
}

export interface InformeInventario {
  generadoEn: string;
  modelo: string;
  simulado: boolean;
  datos: DatosInventario;
  informe: InformeIA;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/reportes`;

  /** Calcula las cifras y pide a la IA el análisis (puede tardar varios segundos). */
  generarInventario(): Observable<InformeInventario> {
    return this.http.post<InformeInventario>(`${this.base}/inventario`, {});
  }

  /** Convierte el informe ya generado en PDF, sin volver a llamar a la IA. */
  descargarPdf(informe: InformeInventario): Observable<Blob> {
    return this.http.post(`${this.base}/inventario/pdf`, informe, { responseType: 'blob' });
  }
}
