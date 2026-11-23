export interface CatalogField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'bool';
  required?: boolean;
  /** Texto: longitud máxima. Número: valor máximo. */
  max?: number;
  /** Solo números. */
  min?: number;
  step?: string;
  /** Se muestra como columna de la tabla (por defecto sí). */
  column?: boolean;
}

/** Descripción declarativa de un catálogo simple (tabla + formulario) sobre un endpoint REST. */
export interface CatalogConfig {
  title: string;
  eyebrow: string;
  subtitle: string;
  singular: string;
  /** Artículo y género para los textos: "Nuevo almacén" / "Nueva categoría". */
  nuevo: string;
  endpoint: string;
  idKey: string;
  fields: CatalogField[];
  /** Tiene la columna booleana "activo". */
  hasActivo: boolean;
}

export const ALMACENES: CatalogConfig = {
  title: 'Almacenes',
  eyebrow: 'INVENTARIO',
  subtitle: 'Ubicaciones donde se guarda el inventario.',
  singular: 'almacén',
  nuevo: 'Nuevo almacén',
  endpoint: 'almacenes',
  idKey: 'almacen_id',
  hasActivo: false,
  fields: [
    { key: 'nombre', label: 'Nombre', required: true, max: 100 },
    { key: 'ubicacion', label: 'Ubicación', max: 200 },
  ],
};

export const PROVEEDORES: CatalogConfig = {
  title: 'Proveedores',
  eyebrow: 'CATÁLOGOS',
  subtitle: 'Empresas a las que les compras mercancía.',
  singular: 'proveedor',
  nuevo: 'Nuevo proveedor',
  endpoint: 'proveedores',
  idKey: 'proveedor_id',
  hasActivo: true,
  fields: [
    { key: 'nombre', label: 'Nombre', required: true, max: 150 },
    { key: 'email', label: 'Correo electrónico', type: 'email', max: 150 },
    { key: 'telefono', label: 'Teléfono', type: 'tel', max: 30 },
  ],
};

export const CLIENTES: CatalogConfig = {
  title: 'Clientes',
  eyebrow: 'CATÁLOGOS',
  subtitle: 'Personas y empresas a las que les vendes.',
  singular: 'cliente',
  nuevo: 'Nuevo cliente',
  endpoint: 'clientes',
  idKey: 'cliente_id',
  hasActivo: true,
  fields: [
    { key: 'nombre', label: 'Nombre', required: true, max: 150 },
    { key: 'documento', label: 'Documento (cédula o RNC)', max: 30 },
    { key: 'email', label: 'Correo electrónico', type: 'email', max: 150 },
    { key: 'telefono', label: 'Teléfono', type: 'tel', max: 30 },
    { key: 'direccion', label: 'Dirección', max: 250, column: false },
  ],
};

export const MONEDAS: CatalogConfig = {
  title: 'Monedas y tasas',
  eyebrow: 'CONFIGURACIÓN',
  subtitle: 'La moneda base tiene tasa 1; las demás se expresan en moneda base. Cada cambio de tasa queda en el historial.',
  singular: 'moneda',
  nuevo: 'Nueva moneda',
  endpoint: 'monedas',
  idKey: 'moneda_id',
  hasActivo: true,
  fields: [
    { key: 'codigo', label: 'Código (3 letras)', required: true, max: 3 },
    { key: 'nombre', label: 'Nombre', required: true, max: 50 },
    { key: 'simbolo', label: 'Símbolo', required: true, max: 5 },
    { key: 'decimales', label: 'Decimales', type: 'number', min: 0, max: 6, step: '1' },
    { key: 'tasa_actual', label: 'Tasa actual (en moneda base)', type: 'number', min: 0.000001, step: 'any' },
    { key: 'es_base', label: 'Moneda base', type: 'bool' },
  ],
};

export const IMPUESTOS: CatalogConfig = {
  title: 'Impuestos',
  eyebrow: 'CONFIGURACIÓN',
  subtitle: 'Impuestos que se aplican a los productos en ventas y compras.',
  singular: 'impuesto',
  nuevo: 'Nuevo impuesto',
  endpoint: 'impuestos',
  idKey: 'impuesto_id',
  hasActivo: true,
  fields: [
    { key: 'codigo', label: 'Código', required: true, max: 20 },
    { key: 'nombre', label: 'Nombre', required: true, max: 100 },
    { key: 'porcentaje', label: 'Porcentaje (%)', type: 'number', min: 0, max: 100, step: 'any' },
  ],
};
