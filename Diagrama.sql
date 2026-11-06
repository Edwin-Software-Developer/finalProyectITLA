CREATE TABLE [ROLES] (
  [rol_id] int PRIMARY KEY IDENTITY(1, 1),
  [nombre] nvarchar(50) UNIQUE NOT NULL,
  [descripcion] nvarchar(200)
)
GO

CREATE TABLE [USUARIOS] (
  [usuario_id] int PRIMARY KEY IDENTITY(1, 1),
  [rol_id] int NOT NULL,
  [nombre] nvarchar(100) NOT NULL,
  [email] nvarchar(150) UNIQUE NOT NULL,
  [password_hash] nvarchar(255) NOT NULL,
  [activo] bit NOT NULL DEFAULT (1),
  [creado_en] datetime2 NOT NULL
)
GO

CREATE TABLE [CLIENTES] (
  [cliente_id] int PRIMARY KEY IDENTITY(1, 1),
  [nombre] nvarchar(150) NOT NULL,
  [documento] nvarchar(30),
  [email] nvarchar(150),
  [telefono] nvarchar(30),
  [direccion] nvarchar(250),
  [activo] bit NOT NULL DEFAULT (1)
)
GO

CREATE TABLE [MONEDAS] (
  [moneda_id] int PRIMARY KEY IDENTITY(1, 1),
  [codigo] nvarchar(3) UNIQUE NOT NULL,
  [nombre] nvarchar(50) NOT NULL,
  [simbolo] nvarchar(5) NOT NULL,
  [decimales] tinyint NOT NULL DEFAULT (2),
  [es_base] bit NOT NULL DEFAULT (0),
  [tasa_actual] decimal(18,6) NOT NULL DEFAULT (1),
  [activo] bit NOT NULL DEFAULT (1)
)
GO

CREATE TABLE [TASAS_CAMBIO] (
  [tasa_id] int PRIMARY KEY IDENTITY(1, 1),
  [moneda_id] int NOT NULL,
  [fecha] datetime2 NOT NULL,
  [tasa] decimal(18,6) NOT NULL,
  [fuente] nvarchar(50),
  [usuario_id] int
)
GO

CREATE TABLE [IMPUESTOS] (
  [impuesto_id] int PRIMARY KEY IDENTITY(1, 1),
  [codigo] nvarchar(20) UNIQUE NOT NULL,
  [nombre] nvarchar(100) NOT NULL,
  [porcentaje] decimal(5,2) NOT NULL,
  [activo] bit NOT NULL DEFAULT (1)
)
GO

CREATE TABLE [CATEGORIAS] (
  [categoria_id] int PRIMARY KEY IDENTITY(1, 1),
  [nombre] nvarchar(100) NOT NULL,
  [categoria_padre_id] int
)
GO

CREATE TABLE [PRODUCTOS] (
  [producto_id] int PRIMARY KEY IDENTITY(1, 1),
  [sku] nvarchar(50) UNIQUE NOT NULL,
  [nombre] nvarchar(150) NOT NULL,
  [categoria_id] int NOT NULL,
  [impuesto_id] int NOT NULL,
  [unidad_medida] nvarchar(20) NOT NULL,
  [costo_unitario] decimal(18,2) NOT NULL,
  [precio_venta] decimal(18,2) NOT NULL,
  [activo] bit NOT NULL DEFAULT (1)
)
GO

CREATE TABLE [PROVEEDORES] (
  [proveedor_id] int PRIMARY KEY IDENTITY(1, 1),
  [nombre] nvarchar(150) NOT NULL,
  [email] nvarchar(150),
  [telefono] nvarchar(30),
  [moneda_id] int,
  [activo] bit NOT NULL DEFAULT (1)
)
GO

CREATE TABLE [PRODUCTO_PROVEEDOR] (
  [producto_id] int NOT NULL,
  [proveedor_id] int NOT NULL,
  [moneda_id] int NOT NULL,
  [precio_compra] decimal(18,4) NOT NULL,
  [lead_time_dias] int NOT NULL,
  [cantidad_minima] int NOT NULL DEFAULT (1),
  [es_preferido] bit NOT NULL DEFAULT (0),
  PRIMARY KEY ([producto_id], [proveedor_id])
)
GO

CREATE TABLE [ALMACENES] (
  [almacen_id] int PRIMARY KEY IDENTITY(1, 1),
  [nombre] nvarchar(100) NOT NULL,
  [ubicacion] nvarchar(200)
)
GO

CREATE TABLE [INVENTARIO] (
  [almacen_id] int NOT NULL,
  [producto_id] int NOT NULL,
  [cantidad_actual] decimal(18,2) NOT NULL DEFAULT (0),
  [cantidad_reservada] decimal(18,2) NOT NULL DEFAULT (0),
  [actualizado_en] datetime2 NOT NULL,
  PRIMARY KEY ([almacen_id], [producto_id])
)
GO

CREATE TABLE [MOVIMIENTOS_INVENTARIO] (
  [movimiento_id] bigint PRIMARY KEY IDENTITY(1, 1),
  [producto_id] int NOT NULL,
  [almacen_id] int NOT NULL,
  [usuario_id] int NOT NULL,
  [tipo] nvarchar(20) NOT NULL,
  [cantidad] decimal(18,2) NOT NULL,
  [referencia_tipo] nvarchar(30),
  [referencia_id] int,
  [fecha] datetime2 NOT NULL
)
GO

CREATE TABLE [VENTAS] (
  [venta_id] int PRIMARY KEY IDENTITY(1, 1),
  [numero_factura] nvarchar(30) UNIQUE NOT NULL,
  [almacen_id] int NOT NULL,
  [usuario_id] int NOT NULL,
  [cliente_id] int,
  [moneda_id] int NOT NULL,
  [tasa_cambio] decimal(18,6) NOT NULL,
  [fecha] datetime2 NOT NULL,
  [estado] nvarchar(20) NOT NULL,
  [subtotal] decimal(18,2) NOT NULL,
  [descuento_total] decimal(18,2) NOT NULL DEFAULT (0),
  [impuesto_total] decimal(18,2) NOT NULL DEFAULT (0),
  [total] decimal(18,2) NOT NULL,
  [total_base] decimal(18,2) NOT NULL,
  [notas] nvarchar(500)
)
GO

CREATE TABLE [DETALLE_VENTAS] (
  [detalle_id] bigint PRIMARY KEY IDENTITY(1, 1),
  [venta_id] int NOT NULL,
  [producto_id] int NOT NULL,
  [descripcion] nvarchar(200),
  [cantidad] decimal(18,2) NOT NULL,
  [precio_unitario] decimal(18,4) NOT NULL,
  [descuento_porcentaje] decimal(5,2) NOT NULL DEFAULT (0),
  [descuento_monto] decimal(18,2) NOT NULL DEFAULT (0),
  [subtotal] decimal(18,2) NOT NULL,
  [impuesto_id] int,
  [porcentaje_impuesto] decimal(5,2) NOT NULL DEFAULT (0),
  [monto_impuesto] decimal(18,2) NOT NULL DEFAULT (0),
  [total_linea] decimal(18,2) NOT NULL
)
GO

CREATE TABLE [REGLAS_REPOSICION] (
  [regla_id] int PRIMARY KEY IDENTITY(1, 1),
  [producto_id] int NOT NULL,
  [almacen_id] int NOT NULL,
  [stock_minimo] decimal(18,2) NOT NULL,
  [stock_maximo] decimal(18,2) NOT NULL,
  [stock_seguridad] decimal(18,2) NOT NULL,
  [punto_reorden] decimal(18,2) NOT NULL,
  [pedido_automatico] bit NOT NULL DEFAULT (1)
)
GO

CREATE TABLE [ORDENES_COMPRA] (
  [orden_id] int PRIMARY KEY IDENTITY(1, 1),
  [numero_orden] nvarchar(30) UNIQUE NOT NULL,
  [proveedor_id] int NOT NULL,
  [almacen_id] int NOT NULL,
  [usuario_id] int NOT NULL,
  [cliente_id] int,
  [moneda_id] int NOT NULL,
  [tasa_cambio] decimal(18,6) NOT NULL,
  [fecha] datetime2 NOT NULL,
  [fecha_entrega_esperada] date,
  [estado] nvarchar(20) NOT NULL,
  [origen] nvarchar(10) NOT NULL,
  [subtotal] decimal(18,2) NOT NULL,
  [descuento_total] decimal(18,2) NOT NULL DEFAULT (0),
  [impuesto_total] decimal(18,2) NOT NULL DEFAULT (0),
  [total] decimal(18,2) NOT NULL,
  [total_base] decimal(18,2) NOT NULL,
  [notas] nvarchar(500)
)
GO

CREATE TABLE [DETALLE_ORDEN_COMPRA] (
  [detalle_id] int PRIMARY KEY IDENTITY(1, 1),
  [orden_id] int NOT NULL,
  [producto_id] int NOT NULL,
  [descripcion] nvarchar(200),
  [cantidad_pedida] decimal(18,2) NOT NULL,
  [cantidad_recibida] decimal(18,2) NOT NULL DEFAULT (0),
  [costo_unitario] decimal(18,4) NOT NULL,
  [descuento_porcentaje] decimal(5,2) NOT NULL DEFAULT (0),
  [descuento_monto] decimal(18,2) NOT NULL DEFAULT (0),
  [subtotal] decimal(18,2) NOT NULL,
  [impuesto_id] int,
  [porcentaje_impuesto] decimal(5,2) NOT NULL DEFAULT (0),
  [monto_impuesto] decimal(18,2) NOT NULL DEFAULT (0),
  [total_linea] decimal(18,2) NOT NULL
)
GO

CREATE TABLE [MODELOS_PREDICCION] (
  [modelo_id] int PRIMARY KEY IDENTITY(1, 1),
  [nombre] nvarchar(100) NOT NULL,
  [algoritmo] nvarchar(50) NOT NULL,
  [version] nvarchar(20) NOT NULL,
  [error_mae] decimal(18,4),
  [entrenado_en] datetime2 NOT NULL
)
GO

CREATE TABLE [PREDICCIONES_DEMANDA] (
  [prediccion_id] bigint PRIMARY KEY IDENTITY(1, 1),
  [producto_id] int NOT NULL,
  [almacen_id] int NOT NULL,
  [modelo_id] int NOT NULL,
  [fecha_objetivo] date NOT NULL,
  [demanda_prevista] decimal(18,2) NOT NULL,
  [limite_inferior] decimal(18,2),
  [limite_superior] decimal(18,2),
  [generado_en] datetime2 NOT NULL
)
GO

CREATE INDEX [TASAS_CAMBIO_index_0] ON [TASAS_CAMBIO] ("moneda_id", "fecha")
GO

CREATE INDEX [MOVIMIENTOS_INVENTARIO_index_1] ON [MOVIMIENTOS_INVENTARIO] ("producto_id", "almacen_id", "fecha")
GO

CREATE INDEX [VENTAS_index_2] ON [VENTAS] ("cliente_id", "fecha")
GO

CREATE INDEX [VENTAS_index_3] ON [VENTAS] ("fecha")
GO

CREATE UNIQUE INDEX [REGLAS_REPOSICION_index_4] ON [REGLAS_REPOSICION] ("producto_id", "almacen_id")
GO

CREATE INDEX [ORDENES_COMPRA_index_5] ON [ORDENES_COMPRA] ("proveedor_id", "fecha")
GO

CREATE INDEX [ORDENES_COMPRA_index_6] ON [ORDENES_COMPRA] ("estado")
GO

CREATE INDEX [PREDICCIONES_DEMANDA_index_7] ON [PREDICCIONES_DEMANDA] ("producto_id", "almacen_id", "fecha_objetivo")
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'ISO 4217: DOP, USD, EUR',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'MONEDAS',
@level2type = N'Column', @level2name = 'codigo';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Solo una moneda base',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'MONEDAS',
@level2type = N'Column', @level2name = 'es_base';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Tasa vigente; las transacciones copian su propia tasa',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'MONEDAS',
@level2type = N'Column', @level2name = 'tasa_actual';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Manual, Banco Central, API',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'TASAS_CAMBIO',
@level2type = N'Column', @level2name = 'fuente';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'ITBIS18, ITBIS16, EXENTO',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'IMPUESTOS',
@level2type = N'Column', @level2name = 'codigo';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Impuesto por defecto',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'PRODUCTOS',
@level2type = N'Column', @level2name = 'impuesto_id';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En moneda base',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'PRODUCTOS',
@level2type = N'Column', @level2name = 'costo_unitario';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En moneda base',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'PRODUCTOS',
@level2type = N'Column', @level2name = 'precio_venta';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Moneda habitual del proveedor',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'PROVEEDORES',
@level2type = N'Column', @level2name = 'moneda_id';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En la moneda indicada',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'PRODUCTO_PROVEEDOR',
@level2type = N'Column', @level2name = 'precio_compra';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'ENTRADA, SALIDA, AJUSTE, TRASLADO',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'MOVIMIENTOS_INVENTARIO',
@level2type = N'Column', @level2name = 'tipo';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'VENTA, ORDEN_COMPRA, AJUSTE',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'MOVIMIENTOS_INVENTARIO',
@level2type = N'Column', @level2name = 'referencia_tipo';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Tasa propia de esta venta (copia al momento de la transaccion)',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'VENTAS',
@level2type = N'Column', @level2name = 'tasa_cambio';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'BORRADOR, EMITIDA, PAGADA, ANULADA',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'VENTAS',
@level2type = N'Column', @level2name = 'estado';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Suma de subtotales de linea, sin impuestos',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'VENTAS',
@level2type = N'Column', @level2name = 'subtotal';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En la moneda de la venta',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'VENTAS',
@level2type = N'Column', @level2name = 'total';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'total * tasa_cambio',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'VENTAS',
@level2type = N'Column', @level2name = 'total_base';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Copia del nombre del producto',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_VENTAS',
@level2type = N'Column', @level2name = 'descripcion';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En la moneda de la venta',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_VENTAS',
@level2type = N'Column', @level2name = 'precio_unitario';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = '(cantidad * precio_unitario) - descuento_monto',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_VENTAS',
@level2type = N'Column', @level2name = 'subtotal';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Copia del % aplicado en ese momento',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_VENTAS',
@level2type = N'Column', @level2name = 'porcentaje_impuesto';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'subtotal * porcentaje_impuesto / 100',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_VENTAS',
@level2type = N'Column', @level2name = 'monto_impuesto';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'subtotal + monto_impuesto',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_VENTAS',
@level2type = N'Column', @level2name = 'total_linea';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Opcional: pedido a peticion de un cliente',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'ORDENES_COMPRA',
@level2type = N'Column', @level2name = 'cliente_id';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'Tasa propia de esta orden (copia al momento de la transaccion)',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'ORDENES_COMPRA',
@level2type = N'Column', @level2name = 'tasa_cambio';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'BORRADOR, ENVIADA, RECIBIDA_PARCIAL, RECIBIDA, CANCELADA',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'ORDENES_COMPRA',
@level2type = N'Column', @level2name = 'estado';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'MANUAL o AUTO',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'ORDENES_COMPRA',
@level2type = N'Column', @level2name = 'origen';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En la moneda de la orden',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'ORDENES_COMPRA',
@level2type = N'Column', @level2name = 'total';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'total * tasa_cambio',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'ORDENES_COMPRA',
@level2type = N'Column', @level2name = 'total_base';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'En la moneda de la orden',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_ORDEN_COMPRA',
@level2type = N'Column', @level2name = 'costo_unitario';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = '(cantidad_pedida * costo_unitario) - descuento_monto',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'DETALLE_ORDEN_COMPRA',
@level2type = N'Column', @level2name = 'subtotal';
GO

ALTER TABLE [USUARIOS] ADD FOREIGN KEY ([rol_id]) REFERENCES [ROLES] ([rol_id])
GO

ALTER TABLE [TASAS_CAMBIO] ADD FOREIGN KEY ([moneda_id]) REFERENCES [MONEDAS] ([moneda_id])
GO

ALTER TABLE [TASAS_CAMBIO] ADD FOREIGN KEY ([usuario_id]) REFERENCES [USUARIOS] ([usuario_id])
GO

ALTER TABLE [CATEGORIAS] ADD FOREIGN KEY ([categoria_padre_id]) REFERENCES [CATEGORIAS] ([categoria_id])
GO

ALTER TABLE [PRODUCTOS] ADD FOREIGN KEY ([categoria_id]) REFERENCES [CATEGORIAS] ([categoria_id])
GO

ALTER TABLE [PRODUCTOS] ADD FOREIGN KEY ([impuesto_id]) REFERENCES [IMPUESTOS] ([impuesto_id])
GO

ALTER TABLE [PROVEEDORES] ADD FOREIGN KEY ([moneda_id]) REFERENCES [MONEDAS] ([moneda_id])
GO

ALTER TABLE [PRODUCTO_PROVEEDOR] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [PRODUCTO_PROVEEDOR] ADD FOREIGN KEY ([proveedor_id]) REFERENCES [PROVEEDORES] ([proveedor_id])
GO

ALTER TABLE [PRODUCTO_PROVEEDOR] ADD FOREIGN KEY ([moneda_id]) REFERENCES [MONEDAS] ([moneda_id])
GO

ALTER TABLE [INVENTARIO] ADD FOREIGN KEY ([almacen_id]) REFERENCES [ALMACENES] ([almacen_id])
GO

ALTER TABLE [INVENTARIO] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [MOVIMIENTOS_INVENTARIO] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [MOVIMIENTOS_INVENTARIO] ADD FOREIGN KEY ([almacen_id]) REFERENCES [ALMACENES] ([almacen_id])
GO

ALTER TABLE [MOVIMIENTOS_INVENTARIO] ADD FOREIGN KEY ([usuario_id]) REFERENCES [USUARIOS] ([usuario_id])
GO

ALTER TABLE [VENTAS] ADD FOREIGN KEY ([almacen_id]) REFERENCES [ALMACENES] ([almacen_id])
GO

ALTER TABLE [VENTAS] ADD FOREIGN KEY ([usuario_id]) REFERENCES [USUARIOS] ([usuario_id])
GO

ALTER TABLE [VENTAS] ADD FOREIGN KEY ([cliente_id]) REFERENCES [CLIENTES] ([cliente_id])
GO

ALTER TABLE [VENTAS] ADD FOREIGN KEY ([moneda_id]) REFERENCES [MONEDAS] ([moneda_id])
GO

ALTER TABLE [DETALLE_VENTAS] ADD FOREIGN KEY ([venta_id]) REFERENCES [VENTAS] ([venta_id])
GO

ALTER TABLE [DETALLE_VENTAS] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [DETALLE_VENTAS] ADD FOREIGN KEY ([impuesto_id]) REFERENCES [IMPUESTOS] ([impuesto_id])
GO

ALTER TABLE [REGLAS_REPOSICION] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [REGLAS_REPOSICION] ADD FOREIGN KEY ([almacen_id]) REFERENCES [ALMACENES] ([almacen_id])
GO

ALTER TABLE [ORDENES_COMPRA] ADD FOREIGN KEY ([proveedor_id]) REFERENCES [PROVEEDORES] ([proveedor_id])
GO

ALTER TABLE [ORDENES_COMPRA] ADD FOREIGN KEY ([almacen_id]) REFERENCES [ALMACENES] ([almacen_id])
GO

ALTER TABLE [ORDENES_COMPRA] ADD FOREIGN KEY ([usuario_id]) REFERENCES [USUARIOS] ([usuario_id])
GO

ALTER TABLE [ORDENES_COMPRA] ADD FOREIGN KEY ([cliente_id]) REFERENCES [CLIENTES] ([cliente_id])
GO

ALTER TABLE [ORDENES_COMPRA] ADD FOREIGN KEY ([moneda_id]) REFERENCES [MONEDAS] ([moneda_id])
GO

ALTER TABLE [DETALLE_ORDEN_COMPRA] ADD FOREIGN KEY ([orden_id]) REFERENCES [ORDENES_COMPRA] ([orden_id])
GO

ALTER TABLE [DETALLE_ORDEN_COMPRA] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [DETALLE_ORDEN_COMPRA] ADD FOREIGN KEY ([impuesto_id]) REFERENCES [IMPUESTOS] ([impuesto_id])
GO

ALTER TABLE [PREDICCIONES_DEMANDA] ADD FOREIGN KEY ([producto_id]) REFERENCES [PRODUCTOS] ([producto_id])
GO

ALTER TABLE [PREDICCIONES_DEMANDA] ADD FOREIGN KEY ([almacen_id]) REFERENCES [ALMACENES] ([almacen_id])
GO

ALTER TABLE [PREDICCIONES_DEMANDA] ADD FOREIGN KEY ([modelo_id]) REFERENCES [MODELOS_PREDICCION] ([modelo_id])
GO
