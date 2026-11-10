import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard-page';
import { PlaceholderPage } from './pages/placeholder-page';
import { ProductosPage } from './pages/productos-page';

export const routes: Routes = [
  { path: '', component: DashboardPage, pathMatch: 'full' },
  { path: 'productos', component: ProductosPage },
  // Módulos del menú que aún no tienen pantalla
  { path: '**', component: PlaceholderPage },
];
