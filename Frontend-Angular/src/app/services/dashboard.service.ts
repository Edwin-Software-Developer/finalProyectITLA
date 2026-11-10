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

  getResumen(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(`${API_URL}/api/dashboard/resumen`);
  }
}
