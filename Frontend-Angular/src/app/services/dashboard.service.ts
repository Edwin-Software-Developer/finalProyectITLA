import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';


export interface AlertaInventario {
  nombre: string;
  detalle: string;
  cantidad: number;
  minimo: number;
  nivel: 'red' | 'orange';
}

export interface ResumenDashboard {
  generadoEn: string;
  totalAlertas: number;
  alertas: AlertaInventario[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getVentas(dias: number): Observable<VentasDashboard> {
    return this.http.get<VentasDashboard>(`${API_URL}/api/dashboard/ventas`, { params: { dias } });
  }

  getResumen(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(`${API_URL}/api/dashboard/resumen`);
  }
}

export interface PuntoVenta {
  fecha: string;
  total: number;
}

export interface ProductoTop {
  nombre: string;
  categoria: string;
  unidades: number;
  stock: number;
}

export interface VentasDashboard {
  dias: number;
  totalPeriodo: number;
  totalPeriodoAnterior: number;
  transaccionesPeriodo: number;
  ventasMes: number;
  ventasMesAnterior: number;
  serie: PuntoVenta[];
  topProductos: ProductoTop[];
}
