import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export type EstadoOrden = 'PENDIENTE' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export interface OrdenResumen {
  orden_id: number;
  numero_orden: string;
  fecha: string;
  fecha_entrega_esperada: string | null;
  estado: EstadoOrden;
  origen: string;
  proveedor_id: number;
  proveedor: string;
  almacen_id: number;
  almacen: string;
  moneda_codigo: string;
  moneda_simbolo: string;
  subtotal: number;
  impuesto_total: number;
  total: number;
  notas: string | null;
  lineas: number;
}

export interface LineaOrden {
  detalle_id: number;
  producto_id: number;
  sku: string;
  producto: string;
  cantidad_pedida: number;
  cantidad_recibida: number;
  costo_unitario: number;
  descuento_porcentaje: number;
  subtotal: number;
  porcentaje_impuesto: number;
  monto_impuesto: number;
  total_linea: number;
}

export interface OrdenDetalle {
  orden: OrdenResumen;
  lineas: LineaOrden[];
}

export interface Sugerencia {
  producto_id: number;
  sku: string;
  nombre: string;
  almacen_id: number;
  almacen: string;
  cantidad_actual: number;
  cantidad_sugerida: number;
  costo_unitario: number;
  proveedor_id: number | null;
  proveedor: string | null;
}

export interface OrdenCreate {
  proveedor_id: number;
  almacen_id: number;
  moneda_id: number;
  fecha_entrega_esperada: string | null;
  notas: string | null;
  origen: 'MANUAL' | 'AUTO';
  lineas: { producto_id: number; cantidad: number; costo_unitario: number; descuento_porcentaje: number }[];
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/compras`;

  list(): Observable<OrdenResumen[]> {
    return this.http.get<OrdenResumen[]>(this.base);
  }

  get(id: number): Observable<OrdenDetalle> {
    return this.http.get<OrdenDetalle>(`${this.base}/${id}`);
  }

  sugerencias(): Observable<Sugerencia[]> {
    return this.http.get<Sugerencia[]>(`${this.base}/sugerencias`);
  }

  create(orden: OrdenCreate): Observable<OrdenDetalle> {
    return this.http.post<OrdenDetalle>(this.base, orden);
  }

  recibir(id: number, lineas: { detalle_id: number; cantidad: number }[]): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/recibir`, { lineas });
  }

  cancelar(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancelar`, {});
  }
}
