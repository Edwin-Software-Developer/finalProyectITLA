import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export type EstadoStock = 'sin_regla' | 'critico' | 'bajo' | 'reponer' | 'sobrestock' | 'ok';

/** Producto en un almacén: existencias + regla de reposición (campos de regla nulos si no existe). */
export interface FilaInventario {
  producto_id: number;
  sku: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  almacen_id: number;
  almacen: string;
  cantidad_actual: number;
  cantidad_reservada: number;
  stock_minimo: number | null;
  stock_maximo: number | null;
  stock_seguridad: number | null;
  punto_reorden: number | null;
  pedido_automatico: boolean | null;
  estado: EstadoStock;
  sugerido: number;
}

export interface ReglaForm {
  producto_id: number;
  almacen_id: number;
  stock_minimo: number;
  stock_maximo: number;
  stock_seguridad: number;
  punto_reorden: number;
  pedido_automatico: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/inventario`;

  list(): Observable<FilaInventario[]> {
    return this.http.get<FilaInventario[]>(this.base);
  }

  guardarRegla(regla: ReglaForm): Observable<void> {
    return this.http.put<void>(`${this.base}/reglas`, regla);
  }
}
