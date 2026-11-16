import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api';

export type Rol = 'Administrador' | 'Operador' | 'Consulta';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

interface Session {
  token: string;
  expiresAt: string;
  usuario: Usuario;
}

const STORAGE_KEY = 'controlstock.session';
const ROLES: readonly Rol[] = ['Administrador', 'Operador', 'Consulta'];

/**
 * Sesión del usuario. El token JWT se guarda en localStorage para sobrevivir a recargas;
 * el backend sigue siendo quien decide los permisos (aquí solo se oculta lo que no aplica).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<Session | null>(this.restore());

  readonly user = computed(() => this.session()?.usuario ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.user()?.rol === 'Administrador');
  /** Administrador u Operador: pueden crear y modificar datos. */
  readonly canWrite = computed(() => {
    const rol = this.user()?.rol;
    return rol === 'Administrador' || rol === 'Operador';
  });
  readonly initials = computed(() => {
    const parts = (this.user()?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
  });

  get token(): string | null {
    const s = this.session();
    if (!s) return null;
    if (Date.parse(s.expiresAt) <= Date.now()) {
      this.clear();
      return null;
    }
    return s.token;
  }

  login(email: string, password: string): Observable<Session> {
    return this.http
      .post<Session>(`${API_URL}/api/auth/login`, { email, password })
      .pipe(tap((session) => this.store(session)));
  }

  logout(returnUrl?: string): void {
    this.clear();
    void this.router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : {});
  }

  hasRole(...roles: Rol[]): boolean {
    const rol = this.user()?.rol;
    return !!rol && roles.includes(rol);
  }

  /** Vuelve a leer el usuario desde la API (por si cambió su rol o fue desactivado). */
  refresh(): void {
    this.http.get<Usuario>(`${API_URL}/api/auth/me`).subscribe({
      next: (usuario) => {
        const s = this.session();
        if (s) this.store({ ...s, usuario });
      },
      // 401 lo gestiona el interceptor (cierra la sesión); otros errores se ignoran.
      error: () => undefined,
    });
  }

  private store(session: Session): void {
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Almacenamiento no disponible: la sesión vive solo en memoria.
    }
  }

  private clear(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nada que limpiar
    }
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      const valid =
        typeof s?.token === 'string' &&
        typeof s.expiresAt === 'string' &&
        Date.parse(s.expiresAt) > Date.now() &&
        ROLES.includes(s.usuario?.rol);
      if (!valid) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
