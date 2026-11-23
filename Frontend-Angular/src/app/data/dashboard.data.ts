import {
  LucideActivity,
  LucideBoxes,
  LucideBrainCircuit,
  LucideBuilding2,
  LucideFileChartColumnIncreasing,
  LucideLayoutDashboard,
  LucidePackage,
  LucideSettings2,
  LucideReceipt,
  LucideShoppingBag,
  LucideShoppingCart,
  LucideSparkles,
  LucideUserCog,
  LucideUsers,
  LucideWarehouse,
  LucideIcon,
} from '@lucide/angular';
import type { Rol } from '../services/auth.service';

const ESCRITURA: Rol[] = ['Administrador', 'Operador'];

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Roles que ven el ítem. Sin definir = todos los usuarios autenticados. */
  roles?: Rol[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'General',
    items: [{ label: 'Dashboard', icon: LucideLayoutDashboard, href: '/' }],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Historial de ventas', icon: LucideReceipt, href: '/ventas', roles: ESCRITURA },
      { label: 'Punto de venta', icon: LucideShoppingCart, href: '/ventas/nueva', roles: ESCRITURA },
      { label: 'Órdenes de compra', icon: LucideShoppingBag, href: '/compras', roles: ESCRITURA },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { label: 'Productos', icon: LucidePackage, href: '/productos' },
      { label: 'Clientes', icon: LucideUsers, href: '/clientes' },
      { label: 'Proveedores', icon: LucideBuilding2, href: '/proveedores' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Almacenes', icon: LucideWarehouse, href: '/inventario/almacenes' },
      { label: 'Movimientos', icon: LucideActivity, href: '/inventario/movimientos', roles: ESCRITURA },
      { label: 'Reposición', icon: LucideBoxes, href: '/inventario/reposicion' },
    ],
  },
  {
    label: 'Inteligencia artificial',
    items: [
      { label: 'Informe de inventario', icon: LucideSparkles, href: '/ia/informe-inventario' },
      { label: 'Predicciones', icon: LucideBrainCircuit, href: '/ia/predicciones' },
      { label: 'Análisis de demanda', icon: LucideFileChartColumnIncreasing, href: '/ia/demanda' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', icon: LucideUserCog, href: '/usuarios', roles: ['Administrador'] },
      { label: 'Configuración', icon: LucideSettings2, href: '/configuracion', roles: ['Administrador'] },
    ],
  },
];

