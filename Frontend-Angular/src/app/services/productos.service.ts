import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

/** Producto tal como lo devuelve GET /api/productos (nombres de propiedad = JSON del backend). */
export interface Producto {
  producto_id: number;
  sku: string;
  nombre: string;
  categoria_id: number;
  categoria: string;
  impuesto_id: number;
  impuesto: string;
  unidad_medida: string;
  costo_unitario: number;
  precio_venta: number;
  activo: boolean;
}

/** Cuerpo para crear (POST) o editar (PUT, con producto_id) un producto. */
export interface ProductoForm {
  sku: string;
  nombre: string;
  categoria_id: number;
  impuesto_id: number;
  unidad_medida: string;
  costo_unitario: number;
  precio_venta: number;
  activo: boolean;
}

export interface OpcionCatalogo {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/productos`;

  list(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.base);
  }

  create(producto: ProductoForm): Observable<Producto> {
    return this.http.post<Producto>(this.base, producto);
  }

  update(id: number, producto: ProductoForm): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, { ...producto, producto_id: id });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  categorias(): Observable<OpcionCatalogo[]> {
    return this.http.get<OpcionCatalogo[]>(`${API_URL}/api/catalogos/categorias`);
  }

  impuestos(): Observable<OpcionCatalogo[]> {
    return this.http.get<OpcionCatalogo[]>(`${API_URL}/api/catalogos/impuestos`);
  }
}
