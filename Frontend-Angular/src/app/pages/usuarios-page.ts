import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePencil, LucidePlus, LucideRefreshCw, LucideX } from '@lucide/angular';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../services/api';
import { AuthService } from '../services/auth.service';
import { RolOpcion, UsuarioAdmin, UsuariosService } from '../services/usuarios.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-usuarios-page',
  imports: [ReactiveFormsModule, LucidePencil, LucidePlus, LucideRefreshCw, LucideX],
  templateUrl: './usuarios-page.html',
  // Misma apariencia de tabla/modal que Productos.
  styleUrl: './productos-page.css',
})
export class UsuariosPage implements OnInit {
  private readonly api = inject(UsuariosService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);

  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly roles = signal<RolOpcion[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly currentUserId = () => this.auth.user()?.id;

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<UsuarioAdmin | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly submitted = signal(false);
  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.minLength(8), Validators.maxLength(72)]],
    rol_id: [0, [Validators.min(1)]],
    activo: [true],
  });

  ngOnInit(): void {
    this.load();
    this.api.roles().subscribe({ next: (r) => this.roles.set(r) });
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudieron cargar los usuarios.'));
        this.state.set('error');
      },
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ nombre: '', email: '', password: '', rol_id: 0, activo: true });
    this.form.controls.email.enable();
    // Al crear, la contraseña es obligatoria.
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    this.openModal();
  }

  protected openEdit(u: UsuarioAdmin): void {
    this.editing.set(u);
    this.form.reset({ nombre: u.nombre, email: u.email, password: '', rol_id: u.rol_id, activo: u.activo });
    this.form.controls.email.disable(); // el correo no se modifica
    this.form.controls.password.setValidators([Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    this.openModal();
  }

  private openModal(): void {
    this.formError.set('');
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  @HostListener('window:keydown.escape')
  protected closeModal(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  protected invalid(control: 'nombre' | 'email' | 'password' | 'rol_id'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || this.submitted());
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const current = this.editing();

    this.saving.set(true);
    this.formError.set('');
    const request: Observable<unknown> = current
      ? this.api.update(current.usuario_id, {
          nombre: v.nombre.trim(),
          rol_id: v.rol_id,
          activo: v.activo,
          password: v.password || null,
        })
      : this.api.create({
          nombre: v.nombre.trim(),
          email: v.email.trim(),
          password: v.password,
          rol_id: v.rol_id,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.showNotice('ok', current ? 'Usuario actualizado.' : 'Usuario creado.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar el usuario.'));
      },
    });
  }

  private showNotice(kind: 'ok' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
