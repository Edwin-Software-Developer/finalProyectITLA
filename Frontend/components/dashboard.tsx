"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  BrainCircuit,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Command,
  FileChartColumnIncreasing,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: "General",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/" }],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Punto de venta", icon: ShoppingCart, href: "/ventas/nueva" },
      { label: "Órdenes de compra", icon: ShoppingBag, href: "/compras" },
    ],
  },
  {
    label: "Catálogos",
    items: [
      { label: "Productos", icon: Package, href: "/productos" },
      { label: "Clientes", icon: Users, href: "/clientes" },
      { label: "Proveedores", icon: Building2, href: "/proveedores" },
    ],
  },
  {
    label: "Inventario",
    items: [
      { label: "Almacenes", icon: Warehouse, href: "/inventario/almacenes" },
      { label: "Movimientos", icon: Activity, href: "/inventario/movimientos" },
      { label: "Reposición", icon: Boxes, href: "/inventario/reposicion" },
    ],
  },
  {
    label: "Inteligencia artificial",
    items: [
      { label: "Predicciones", icon: BrainCircuit, href: "/ia/predicciones" },
      {
        label: "Análisis de demanda",
        icon: FileChartColumnIncreasing,
        href: "/ia/demanda",
      },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Configuración", icon: Settings2, href: "/configuracion" },
    ],
  },
];

const salesData = [
  { day: "Lun", value: 37 },
  { day: "Mar", value: 55 },
  { day: "Mié", value: 45 },
  { day: "Jue", value: 73 },
  { day: "Vie", value: 62 },
  { day: "Sáb", value: 88 },
  { day: "Dom", value: 69 },
  { day: "Lun", value: 77 },
  { day: "Mar", value: 59 },
  { day: "Mié", value: 91 },
  { day: "Jue", value: 72 },
  { day: "Vie", value: 100 },
];

const demandItems = [
  {
    name: "Café molido premium",
    category: "Alimentos y bebidas",
    stock: "18 uds.",
    demand: "+32%",
    tone: "rose",
    initials: "CM",
    color: "lavender",
  },
  {
    name: "Leche entera 1L",
    category: "Lácteos",
    stock: "24 uds.",
    demand: "+24%",
    tone: "amber",
    initials: "LE",
    color: "cream",
  },
  {
    name: "Aceite de oliva 500ml",
    category: "Despensa",
    stock: "31 uds.",
    demand: "+18%",
    tone: "blue",
    initials: "AO",
    color: "mint",
  },
];

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <button
        aria-label="Cerrar menú"
        className={`sidebar-overlay ${open ? "sidebar-overlay-visible" : ""}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={20} strokeWidth={2.4} />
          </div>
          <div className="brand-copy">
            <span className="brand-name">nexo<span>.</span></span>
            <span className="brand-caption">GESTIÓN INTELIGENTE</span>
          </div>
          <button
            aria-label="Cerrar menú"
            className="sidebar-close"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon">N</div>
          <div className="workspace-copy">
            <strong>Nova Market</strong>
            <span>Plan profesional</span>
          </div>
          <ChevronDown size={15} className="workspace-chevron" />
        </div>

        <nav aria-label="Navegación principal" className="sidebar-nav">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-heading">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Dashboard";
                return (
                  <a
                    aria-current={active ? "page" : undefined}
                    className={`nav-link ${active ? "nav-link-active" : ""}`}
                    href={item.href}
                    key={item.label}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {item.label === "Predicciones" && (
                      <span className="nav-count">3</span>
                    )}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <div>
              <strong>¿Necesitas ayuda?</strong>
              <p>Visita nuestro centro de ayuda</p>
            </div>
            <ArrowRight size={15} />
          </div>
          <div className="profile">
            <div className="avatar avatar-user">EP</div>
            <div className="profile-copy">
              <strong>Edwin Pérez</strong>
              <span>Administrador</span>
            </div>
            <button aria-label="Opciones de perfil" className="icon-button profile-menu">
              <PanelLeftClose size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  detail,
  tone,
  trend = "up",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change: string;
  detail: string;
  tone: "blue" | "green" | "orange" | "purple";
  trend?: "up" | "down";
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <div className={`metric-icon metric-icon-${tone}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <button aria-label={`Más información: ${label}`} className="metric-info">
          <CircleHelp size={15} />
        </button>
      </div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row">
        <h2>{value}</h2>
        <span className={`metric-change ${trend === "down" ? "change-down" : ""}`}>
          {trend === "down" ? (
            <ArrowDownRight size={14} />
          ) : (
            <ArrowUpRight size={14} />
          )}
          {change}
        </span>
      </div>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}

function SalesChart() {
  const width = 720;
  const height = 218;
  const top = 14;
  const bottom = 184;
  const points = salesData
    .map((point, index) => {
      const x = (index / (salesData.length - 1)) * width;
      const y = bottom - (point.value / 110) * (bottom - top);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPath = `M 0,${bottom} L ${points
    .replaceAll(" ", " L ")} L ${width},${bottom} Z`;

  return (
    <div className="chart-wrap" role="img" aria-label="Gráfico de ventas de los últimos 12 días con tendencia ascendente">
      <div className="chart-y-labels" aria-hidden="true">
        <span>RD$ 80k</span>
        <span>RD$ 60k</span>
        <span>RD$ 40k</span>
        <span>RD$ 20k</span>
        <span>RD$ 0</span>
      </div>
      <div className="chart-main">
        <svg
          aria-hidden="true"
          className="sales-chart"
          preserveAspectRatio="none"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3979f6" stopOpacity=".18" />
              <stop offset="100%" stopColor="#3979f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[14, 56, 99, 141, 184].map((y) => (
            <line
              key={y}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke="#edf0f5"
              strokeDasharray={y === 184 ? "0" : "3 5"}
            />
          ))}
          <path d={areaPath} fill="url(#sales-fill)" />
          <polyline
            fill="none"
            points={points}
            stroke="#3979f6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          {salesData.map((point, index) => {
            const x = (index / (salesData.length - 1)) * width;
            const y = bottom - (point.value / 110) * (bottom - top);
            return (
              <circle
                key={`${point.day}-${index}`}
                cx={x}
                cy={y}
                fill="#fff"
                r="4"
                stroke="#3979f6"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div className="chart-x-labels" aria-hidden="true">
          <span>03 Oct</span>
          <span>05 Oct</span>
          <span>07 Oct</span>
          <span>09 Oct</span>
          <span>11 Oct</span>
          <span>13 Oct</span>
          <span>14 Oct</span>
        </div>
      </div>
    </div>
  );
}

function DemandForecast() {
  const [loading, setLoading] = useState(false);

  function refreshForecast() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 750);
  }

  return (
    <section className="panel forecast-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title-row">
            <div className="ai-title-icon">
              <Sparkles size={16} />
            </div>
            <h2>Predicción de demanda</h2>
            <span className="live-badge"><span /> IA ACTIVA</span>
          </div>
          <p className="panel-subtitle">Productos con mayor demanda para los próximos 7 días</p>
        </div>
        <button
          aria-label="Actualizar predicción"
          className={`icon-button refresh-button ${loading ? "is-spinning" : ""}`}
          onClick={refreshForecast}
          title="Actualizar predicción"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="forecast-summary">
        <div className="forecast-summary-icon">
          <BrainCircuit size={17} />
        </div>
        <p>
          El modelo detectó un <strong>incremento de demanda</strong> en 3 productos
          que requieren atención.
        </p>
        <span className="forecast-confidence">94% confianza</span>
      </div>

      <div className="demand-list">
        {loading
          ? demandItems.map((item) => (
              <div className="demand-skeleton" key={item.name}>
                <span className="skeleton skeleton-product" />
                <span className="skeleton skeleton-stock" />
                <span className="skeleton skeleton-demand" />
              </div>
            ))
          : demandItems.map((item) => (
              <div className="demand-row" key={item.name}>
                <div className={`product-thumb thumb-${item.color}`}>{item.initials}</div>
                <div className="demand-product">
                  <strong>{item.name}</strong>
                  <span>{item.category}</span>
                </div>
                <div className="demand-stock">
                  <span>Stock actual</span>
                  <strong>{item.stock}</strong>
                </div>
                <span className={`demand-change demand-${item.tone}`}>
                  <ArrowUpRight size={14} />
                  {item.demand}
                </span>
                <button
                  aria-label={`Ver predicción para ${item.name}`}
                  className="row-arrow"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
      </div>

      <a className="panel-footer-link" href="/ia/predicciones">
        Ver todas las predicciones <ArrowRight size={15} />
      </a>
    </section>
  );
}

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState("Últimos 7 días");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        document.getElementById("global-search")?.focus();
      }
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className="app-shell min-h-screen bg-slate-50">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-label="Abrir menú"
              className="icon-button mobile-menu-button"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumbs">
              <span>General</span>
              <span className="breadcrumb-divider">/</span>
              <strong>Dashboard</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <label className={`search-box ${searchOpen ? "search-box-open" : ""}`}>
              <Search size={17} />
              <input
                id="global-search"
                onBlur={() => setSearchOpen(false)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar..."
                type="search"
              />
              <kbd><Command size={11} /> K</kbd>
            </label>
            <span className="topbar-divider" />
            <button aria-label="Notificaciones" className="icon-button notification-button">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-user">
              <div className="avatar avatar-user">EP</div>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        <div className="dashboard-content mx-auto w-full">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> MARTES, 14 DE OCTUBRE DE 2026</div>
              <h1>Buenos días, Edwin <span className="greeting-wave">✦</span></h1>
              <p>Aquí tienes el resumen de lo que sucede en tu negocio hoy.</p>
            </div>
            <button className="primary-button">
              <Plus size={17} strokeWidth={2.3} />
              Nueva venta
            </button>
          </div>

          <section aria-label="Resumen del negocio" className="metrics-grid grid">
            <MetricCard
              change="12.8%"
              detail="vs. mes anterior"
              icon={ShoppingCart}
              label="Ventas del mes"
              tone="blue"
              value="RD$ 284,590"
            />
            <MetricCard
              change="8.2%"
              detail="en 486 transacciones"
              icon={FileChartColumnIncreasing}
              label="Ventas esta semana"
              tone="green"
              value="RD$ 68,240"
            />
            <MetricCard
              change="6 productos"
              detail="requieren reposición"
              icon={Boxes}
              label="Inventario bajo"
              tone="orange"
              trend="down"
              value="12 alertas"
            />
            <MetricCard
              change="3 productos"
              detail="demanda en aumento"
              icon={BrainCircuit}
              label="Predicciones críticas"
              tone="purple"
              value="94% precisión"
            />
          </section>

          <section className="dashboard-grid grid">
            <section className="panel sales-panel">
              <div className="panel-heading sales-heading">
                <div>
                  <h2>Resumen de ventas</h2>
                  <p className="panel-subtitle">Rendimiento de tu negocio en el tiempo</p>
                </div>
                <div className="chart-controls">
                  <div className="chart-legend"><span /> Ventas</div>
                  <label className="select-wrap">
                    <CalendarDays size={15} />
                    <select
                      aria-label="Período del resumen de ventas"
                      onChange={(event) => setPeriod(event.target.value)}
                      value={period}
                    >
                      <option>Últimos 7 días</option>
                      <option>Últimos 30 días</option>
                      <option>Este año</option>
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </div>
              </div>
              <div className="chart-total">
                <strong>RD$ 68,240</strong>
                <span className="chart-growth"><ArrowUpRight size={14} /> 12.8%</span>
                <span className="chart-period">vs. período anterior</span>
              </div>
              <SalesChart />
            </section>

            <section className="panel quick-panel">
              <div className="panel-heading">
                <div>
                  <h2>Accesos rápidos</h2>
                  <p className="panel-subtitle">Lo que más necesitas, a un clic</p>
                </div>
              </div>
              <div className="quick-links">
                <a href="/ventas/nueva" className="quick-link">
                  <span className="quick-link-icon quick-blue"><ShoppingCart size={18} /></span>
                  <span><strong>Registrar venta</strong><small>Inicia una nueva venta</small></span>
                  <ArrowRight size={16} />
                </a>
                <a href="/productos" className="quick-link">
                  <span className="quick-link-icon quick-violet"><Package size={18} /></span>
                  <span><strong>Agregar producto</strong><small>Actualiza tu catálogo</small></span>
                  <ArrowRight size={16} />
                </a>
                <a href="/compras" className="quick-link">
                  <span className="quick-link-icon quick-amber"><ShoppingBag size={18} /></span>
                  <span><strong>Nueva compra</strong><small>Repón tu inventario</small></span>
                  <ArrowRight size={16} />
                </a>
                <a href="/clientes" className="quick-link">
                  <span className="quick-link-icon quick-green"><Users size={18} /></span>
                  <span><strong>Ver clientes</strong><small>Administra tus contactos</small></span>
                  <ArrowRight size={16} />
                </a>
              </div>
              <div className="shortcut-hint"><kbd>F2</kbd> Atajo para buscar productos en Punto de venta</div>
            </section>
          </section>

          <section className="bottom-grid grid">
            <DemandForecast />
            <section className="panel inventory-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-title-row">
                    <h2>Alertas de inventario</h2>
                    <span className="alert-count">6</span>
                  </div>
                  <p className="panel-subtitle">Productos que necesitan atención</p>
                </div>
                <button aria-label="Más opciones de inventario" className="icon-button more-button">···</button>
              </div>
              <div className="inventory-alert">
                <div className="alert-indicator alert-red" />
                <div className="inventory-product"><strong>Café molido premium</strong><span>SKU: CAF-0048 · Almacén principal</span></div>
                <div className="inventory-quantity"><strong>4</strong><span>mín. 20</span></div>
              </div>
              <div className="inventory-alert">
                <div className="alert-indicator alert-orange" />
                <div className="inventory-product"><strong>Leche entera 1L</strong><span>SKU: LAC-0012 · Almacén principal</span></div>
                <div className="inventory-quantity"><strong>8</strong><span>mín. 24</span></div>
              </div>
              <div className="inventory-alert">
                <div className="alert-indicator alert-orange" />
                <div className="inventory-product"><strong>Azúcar blanca 2lb</strong><span>SKU: DES-0031 · Sucursal Norte</span></div>
                <div className="inventory-quantity"><strong>11</strong><span>mín. 25</span></div>
              </div>
              <a className="panel-footer-link" href="/inventario/reposicion">
                Ver inventario completo <ArrowRight size={15} />
              </a>
            </section>
          </section>
          <footer className="dashboard-footer">
            <span>© 2026 Nexo ERP</span>
            <span>Datos actualizados hace 2 minutos</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
