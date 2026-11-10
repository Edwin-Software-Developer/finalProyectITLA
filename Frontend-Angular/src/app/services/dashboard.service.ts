import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

// Backend ASP.NET Core (perfil "http" de launchSettings.json).
export const API_URL = 'http://localhost:5068';

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
