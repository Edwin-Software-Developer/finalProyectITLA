import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './guards/auth.guard';
import { DashboardPage } from './pages/dashboard-page';
import { AparienciaPage } from './pages/apariencia-page';
import { ConfiguracionPage } from './pages/configuracion-page';
import { ALMACENES, CLIENTES, IMPUESTOS, MONEDAS, PROVEEDORES } from './data/catalog.configs';
import { CatalogPage } from './pages/catalog-page';
import { InformeInventarioPage } from './pages/informe-inventario-page';
import { LoginPage } from './pages/login-page';
import { PlaceholderPage } from './pages/placeholder-page';
import { ReposicionPage } from './pages/reposicion-page';
import { MovimientosPage } from './pages/movimientos-page';
import { ComprasPage } from './pages/compras-page';
import { VentasPage } from './pages/ventas-page';
import { PuntoVentaPage } from './pages/punto-venta-page';
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
      { path: 'inventario/almacenes', component: CatalogPage, data: { catalog: ALMACENES } },
      { path: 'inventario/movimientos', component: MovimientosPage, canActivate: [roleGuard('Administrador', 'Operador')] },
      { path: 'inventario/reposicion', component: ReposicionPage },
      { path: 'configuracion/apariencia', component: AparienciaPage },
      { path: 'configuracion', component: ConfiguracionPage, canActivate: [roleGuard('Administrador')] },
      { path: 'configuracion/monedas', component: CatalogPage, data: { catalog: MONEDAS }, canActivate: [roleGuard('Administrador')] },
      { path: 'configuracion/impuestos', component: CatalogPage, data: { catalog: IMPUESTOS }, canActivate: [roleGuard('Administrador')] },
      { path: 'compras', component: ComprasPage, canActivate: [roleGuard('Administrador', 'Operador')] },
      { path: 'ventas', component: VentasPage, canActivate: [roleGuard('Administrador', 'Operador')] },
      { path: 'ventas/nueva', component: PuntoVentaPage, canActivate: [roleGuard('Administrador', 'Operador')] },
      { path: 'proveedores', component: CatalogPage, data: { catalog: PROVEEDORES } },
      { path: 'clientes', component: CatalogPage, data: { catalog: CLIENTES } },
      { path: 'ia/informe-inventario', component: InformeInventarioPage },
      { path: 'usuarios', component: UsuariosPage, canActivate: [roleGuard('Administrador')] },
      // Módulos del menú que aún no tienen pantalla
      { path: '**', component: PlaceholderPage },
    ],
  },
];
