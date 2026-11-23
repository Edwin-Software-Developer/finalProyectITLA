import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

/** Fila genérica de un catálogo: las claves son las del JSON del backend (snake_case). */
export type CatalogRow = Record<string, string | number | boolean | null>;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  list(endpoint: string): Observable<CatalogRow[]> {
    return this.http.get<CatalogRow[]>(`${API_URL}/api/${endpoint}`);
  }

  create(endpoint: string, body: CatalogRow): Observable<CatalogRow> {
    return this.http.post<CatalogRow>(`${API_URL}/api/${endpoint}`, body);
  }

  update(endpoint: string, id: number, body: CatalogRow): Observable<void> {
    return this.http.put<void>(`${API_URL}/api/${endpoint}/${id}`, body);
  }

  delete(endpoint: string, id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/api/${endpoint}/${id}`);
  }
}
