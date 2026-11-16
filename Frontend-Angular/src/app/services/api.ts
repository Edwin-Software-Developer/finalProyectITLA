import { HttpErrorResponse } from '@angular/common/http';

// Backend ASP.NET Core (perfil "http" de launchSettings.json).
export const API_URL = 'http://localhost:5068';

/** Mensaje legible a partir de un error HTTP del backend. */
export function apiErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) {
    return `No se pudo conectar con la API (${API_URL}). Verifica que el backend esté corriendo.`;
  }
  const body = err.error;
  if (typeof body === 'string' && body.trim()) return body;
  // Errores de validación de ASP.NET (ProblemDetails con "errors")
  if (body && typeof body === 'object' && body.errors) {
    const first = Object.values(body.errors as Record<string, string[]>)[0];
    if (first?.length) return first[0];
  }
  return fallback;
}
