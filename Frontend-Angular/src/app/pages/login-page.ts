import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideActivity, LucideLogIn } from '@lucide/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from '../services/api';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, LucideActivity, LucideLogIn],
  styles: `
    :host {
      align-items: center;
      background: #f7f8fb;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    .card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 16px;
      box-shadow: 0 18px 50px rgba(17, 24, 39, 0.08);
      padding: 32px 28px;
      width: min(400px, 100%);
    }
    .brand-row {
      align-items: center;
      display: flex;
      gap: 10px;
      margin-bottom: 22px;
    }
    .mark {
      background: var(--blue);
      border-radius: 10px;
      color: #fff;
      display: grid;
      height: 38px;
      place-items: center;
      width: 38px;
    }
    .name {
      font-size: 20px;
      font-weight: 800;
    }
    .name span {
      color: var(--blue);
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
    }
    .sub {
      color: var(--muted);
      margin: 4px 0 20px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 14px;
    }
    .field > span {
      font-size: 12px;
      font-weight: 600;
    }
    .field input {
      background: #fff;
      border: 1px solid #dfe3ec;
      border-radius: 9px;
      color: var(--ink);
      height: 40px;
      padding: 0 12px;
    }
    .field input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(57, 121, 246, 0.15);
      outline: 0;
    }
    .field input.invalid {
      border-color: #e5484d;
    }
    .field em {
      color: #b42318;
      font-size: 11px;
      font-style: normal;
    }
    .error {
      background: #fdecec;
      border: 1px solid #f6cccc;
      border-radius: 9px;
      color: #b42318;
      margin-bottom: 14px;
      padding: 10px 12px;
    }
    button[type='submit'] {
      justify-content: center;
      width: 100%;
    }
    button[type='submit']:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `,
  template: `
    <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="brand-row">
        <div class="mark"><svg lucideActivity [size]="20" [strokeWidth]="2.4"></svg></div>
        <span class="name">nexo<span>.</span></span>
      </div>

      <h1>Iniciar sesión</h1>
      <p class="sub">Ingresa con tu cuenta de ControlStock.</p>

      <label class="field">
        <span>Correo electrónico</span>
        <input
          type="email"
          formControlName="email"
          autocomplete="username"
          placeholder="tu@correo.com"
          [class.invalid]="invalid('email')"
        />
        @if (invalid('email')) { <em>Ingresa un correo válido.</em> }
      </label>

      <label class="field">
        <span>Contraseña</span>
        <input
          type="password"
          formControlName="password"
          autocomplete="current-password"
          [class.invalid]="invalid('password')"
        />
        @if (invalid('password')) { <em>La contraseña es requerida.</em> }
      </label>

      @if (error()) {
        <div class="error" role="alert">{{ error() }}</div>
      }

      <button type="submit" class="primary-button" [disabled]="loading()">
        <svg lucideLogIn [size]="17"></svg>
        {{ loading() ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected invalid(control: 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();

    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.form.controls.password.reset('');
        this.error.set(
          err instanceof HttpErrorResponse && err.status === 429
            ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
            : apiErrorMessage(err, 'No se pudo iniciar sesión.'),
        );
      },
    });
  }

  /** Solo rutas internas: evita redirecciones abiertas con ?returnUrl=https://sitio-malo. */
  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : '/';
  }
}
