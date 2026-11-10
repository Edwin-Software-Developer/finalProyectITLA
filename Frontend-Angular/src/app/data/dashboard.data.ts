import {
  LucideActivity,
  LucideBoxes,
  LucideBrainCircuit,
  LucideBuilding2,
  LucideFileChartColumnIncreasing,
  LucideLayoutDashboard,
  LucidePackage,
  LucideSettings2,
  LucideShoppingBag,
  LucideShoppingCart,
  LucideUsers,
  LucideWarehouse,
  LucideIcon,
} from '@lucide/angular';

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  href: string;
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
      { label: 'Punto de venta', icon: LucideShoppingCart, href: '/ventas/nueva' },
      { label: 'Órdenes de compra', icon: LucideShoppingBag, href: '/compras' },
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
      { label: 'Movimientos', icon: LucideActivity, href: '/inventario/movimientos' },
      { label: 'Reposición', icon: LucideBoxes, href: '/inventario/reposicion' },
    ],
  },
  {
    label: 'Inteligencia artificial',
    items: [
      { label: 'Predicciones', icon: LucideBrainCircuit, href: '/ia/predicciones' },
      { label: 'Análisis de demanda', icon: LucideFileChartColumnIncreasing, href: '/ia/demanda' },
    ],
  },
  {
    label: 'Administración',
    items: [{ label: 'Configuración', icon: LucideSettings2, href: '/configuracion' }],
  },
];

export const salesData = [
  { day: 'Lun', value: 37 },
  { day: 'Mar', value: 55 },
  { day: 'Mié', value: 45 },
  { day: 'Jue', value: 73 },
  { day: 'Vie', value: 62 },
  { day: 'Sáb', value: 88 },
  { day: 'Dom', value: 69 },
  { day: 'Lun', value: 77 },
  { day: 'Mar', value: 59 },
  { day: 'Mié', value: 91 },
  { day: 'Jue', value: 72 },
  { day: 'Vie', value: 100 },
];

export const demandItems = [
  { name: 'Café molido premium', category: 'Alimentos y bebidas', stock: '18 uds.', demand: '+32%', tone: 'rose', initials: 'CM', color: 'lavender' },
  { name: 'Leche entera 1L', category: 'Lácteos', stock: '24 uds.', demand: '+24%', tone: 'amber', initials: 'LE', color: 'cream' },
  { name: 'Aceite de oliva 500ml', category: 'Despensa', stock: '31 uds.', demand: '+18%', tone: 'blue', initials: 'AO', color: 'mint' },
];
