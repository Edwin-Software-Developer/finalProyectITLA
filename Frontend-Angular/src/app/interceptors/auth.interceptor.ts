import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../services/api';
import { AuthService } from '../services/auth.service';

/** Adjunta el JWT a las llamadas a la API y cierra la sesión si el backend responde 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      // Un 401 en el propio login significa "credenciales incorrectas": lo maneja la pantalla de login.
      const isLogin = req.url.endsWith('/api/auth/login');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isLogin) {
        auth.logout(router.url.startsWith('/login') ? undefined : router.url);
      }
      return throwError(() => err);
    }),
  );
};
