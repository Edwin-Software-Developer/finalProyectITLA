import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export interface ProductoPos {
  producto_id: number;
  sku: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  precio_venta: number;
  porcentaje_impuesto: number;
  disponible: number;
}

export interface VentaResumen {
  venta_id: number;
  numero_factura: string;
  fecha: string;
  estado: 'COMPLETADA' | 'ANULADA';
  almacen_id: number;
  almacen: string;
  cliente: string | null;
  usuario: string;
  moneda_codigo: string;
  moneda_simbolo: string;
  subtotal: number;
  descuento_total: number;
  impuesto_total: number;
  total: number;
  notas: string | null;
}

export interface LineaVenta {
  producto_id: number;
  sku: string;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  subtotal: number;
  porcentaje_impuesto: number;
  monto_impuesto: number;
  total_linea: number;
}

export interface VentaDetalle {
  venta: VentaResumen;
  lineas: LineaVenta[];
}

export interface VentaCreate {
  almacen_id: number;
  cliente_id: number | null;
  notas: string | null;
  lineas: { producto_id: number; cantidad: number; descuento_porcentaje: number }[];
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/ventas`;

  list(): Observable<VentaResumen[]> {
    return this.http.get<VentaResumen[]>(this.base);
  }

  get(id: number): Observable<VentaDetalle> {
    return this.http.get<VentaDetalle>(`${this.base}/${id}`);
  }

  catalogo(almacenId: number): Observable<ProductoPos[]> {
    return this.http.get<ProductoPos[]>(`${this.base}/catalogo`, { params: new HttpParams().set('almacenId', almacenId) });
  }

  create(venta: VentaCreate): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(this.base, venta);
  }

  anular(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/anular`, {});
  }
}
