import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './guards/auth.guard';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { PlaceholderPage } from './pages/placeholder-page';
import { ProductosPage } from './pages/productos-page';
import { UsuariosPage } from './pages/usuarios-page';

export const routes: Routes = [
  { path: 'login', component: LoginPage, canActivate: [guestGuard] },

  // Todo lo demás exige sesión.
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardPage, pathMatch: 'full' },
      { path: 'productos', component: ProductosPage },
      { path: 'usuarios', component: UsuariosPage, canActivate: [roleGuard('Administrador')] },
      // Módulos del menú que aún no tienen pantalla
      { path: '**', component: PlaceholderPage },
    ],
  },
];
