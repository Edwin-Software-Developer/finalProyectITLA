import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO';

/** `cantidad` es el cambio con signo aplicado a la existencia (salidas negativas). */
export interface Movimiento {
  movimiento_id: number;
  fecha: string;
  tipo: TipoMovimiento;
  cantidad: number;
  producto_id: number;
  sku: string;
  producto: string;
  almacen_id: number;
  almacen: string;
  usuario: string;
  referencia_tipo: string | null;
  referencia_id: number | null;
}

export interface MovimientoForm {
  producto_id: number;
  almacen_id: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
}

export interface TrasladoForm {
  producto_id: number;
  almacen_origen_id: number;
  almacen_destino_id: number;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class MovimientosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/movimientos`;

  list(): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(this.base);
  }

  create(m: MovimientoForm): Observable<unknown> {
    return this.http.post(this.base, m);
  }

  trasladar(t: TrasladoForm): Observable<unknown> {
    return this.http.post(`${this.base}/traslado`, t);
  }
}
