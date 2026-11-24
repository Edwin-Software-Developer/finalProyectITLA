import { HttpErrorResponse } from '@angular/common/http';

// Backend ASP.NET Core: local (perfil "http" de launchSettings.json) o Azure en producción.
const isLocal = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
export const API_URL = isLocal
  ? 'http://localhost:5068'
  : 'https://nexogestioninteligente-f7fgdyh3gpbrdbb8.westus3-01.azurewebsites.net';

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
