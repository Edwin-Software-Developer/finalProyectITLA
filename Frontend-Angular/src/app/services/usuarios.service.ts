import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

/** Tal como lo devuelve GET /api/usuarios (snake_case = nombres de propiedad del backend). */
export interface UsuarioAdmin {
  usuario_id: number;
  rol_id: number;
  rol: string;
  nombre: string;
  email: string;
  activo: boolean;
  creado_en: string;
}

export interface RolOpcion {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface UsuarioCreate {
  nombre: string;
  email: string;
  password: string;
  rol_id: number;
}

export interface UsuarioUpdate {
  nombre: string;
  rol_id: number;
  activo: boolean;
  /** Vacío/ausente = no cambia la contraseña. */
  password?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/api/usuarios`;

  list(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(this.base);
  }

  roles(): Observable<RolOpcion[]> {
    return this.http.get<RolOpcion[]>(`${this.base}/roles`);
  }

  create(usuario: UsuarioCreate): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(this.base, usuario);
  }

  update(id: number, cambios: UsuarioUpdate): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, cambios);
  }
}
