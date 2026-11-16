-- Datos de prueba para el dashboard y la pantalla de Productos.
-- Ejecutar DESPUÉS de crear las tablas con Diagrama.sql. Es seguro re-ejecutarlo (no duplica).
USE ControlStock;
GO

-- Impuestos
IF NOT EXISTS (SELECT 1 FROM IMPUESTOS WHERE codigo = 'ITBIS18')
    INSERT INTO IMPUESTOS (codigo, nombre, porcentaje, activo) VALUES ('ITBIS18', 'ITBIS 18%', 18.00, 1);
IF NOT EXISTS (SELECT 1 FROM IMPUESTOS WHERE codigo = 'EXENTO')
    INSERT INTO IMPUESTOS (codigo, nombre, porcentaje, activo) VALUES ('EXENTO', 'Exento', 0.00, 1);

-- Categorías
IF NOT EXISTS (SELECT 1 FROM CATEGORIAS WHERE nombre = N'Alimentos y bebidas')
    INSERT INTO CATEGORIAS (nombre) VALUES (N'Alimentos y bebidas');
IF NOT EXISTS (SELECT 1 FROM CATEGORIAS WHERE nombre = N'Lácteos')
    INSERT INTO CATEGORIAS (nombre) VALUES (N'Lácteos');
IF NOT EXISTS (SELECT 1 FROM CATEGORIAS WHERE nombre = N'Despensa')
    INSERT INTO CATEGORIAS (nombre) VALUES (N'Despensa');

-- Almacenes
IF NOT EXISTS (SELECT 1 FROM ALMACENES WHERE nombre = N'Almacén principal')
    INSERT INTO ALMACENES (nombre, ubicacion) VALUES (N'Almacén principal', N'Santo Domingo');
IF NOT EXISTS (SELECT 1 FROM ALMACENES WHERE nombre = N'Sucursal Norte')
    INSERT INTO ALMACENES (nombre, ubicacion) VALUES (N'Sucursal Norte', N'Santiago');

-- Productos
DECLARE @itbis int = (SELECT impuesto_id FROM IMPUESTOS WHERE codigo = 'ITBIS18');
DECLARE @exento int = (SELECT impuesto_id FROM IMPUESTOS WHERE codigo = 'EXENTO');
DECLARE @cAli int = (SELECT categoria_id FROM CATEGORIAS WHERE nombre = N'Alimentos y bebidas');
DECLARE @cLac int = (SELECT categoria_id FROM CATEGORIAS WHERE nombre = N'Lácteos');
DECLARE @cDes int = (SELECT categoria_id FROM CATEGORIAS WHERE nombre = N'Despensa');

IF NOT EXISTS (SELECT 1 FROM PRODUCTOS WHERE sku = 'CAF-0048')
    INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
    VALUES ('CAF-0048', N'Café molido premium', @cAli, @itbis, N'Libra', 280.00, 395.00, 1);
IF NOT EXISTS (SELECT 1 FROM PRODUCTOS WHERE sku = 'LAC-0012')
    INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
    VALUES ('LAC-0012', N'Leche entera 1L', @cLac, @exento, N'Litro', 62.00, 85.00, 1);
IF NOT EXISTS (SELECT 1 FROM PRODUCTOS WHERE sku = 'DES-0031')
    INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
    VALUES ('DES-0031', N'Azúcar blanca 2lb', @cDes, @exento, N'Paquete', 54.00, 75.00, 1);
IF NOT EXISTS (SELECT 1 FROM PRODUCTOS WHERE sku = 'DES-0044')
    INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
    VALUES ('DES-0044', N'Aceite de oliva 500ml', @cDes, @itbis, N'Unidad', 410.00, 560.00, 1);

-- Inventario (stock actual por almacén)
DECLARE @aPri int = (SELECT almacen_id FROM ALMACENES WHERE nombre = N'Almacén principal');
DECLARE @aNor int = (SELECT almacen_id FROM ALMACENES WHERE nombre = N'Sucursal Norte');

IF NOT EXISTS (SELECT 1 FROM INVENTARIO WHERE almacen_id = @aPri AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'CAF-0048'))
    INSERT INTO INVENTARIO (almacen_id, producto_id, cantidad_actual, cantidad_reservada, actualizado_en)
    SELECT @aPri, producto_id, 4, 0, SYSUTCDATETIME() FROM PRODUCTOS WHERE sku = 'CAF-0048';
IF NOT EXISTS (SELECT 1 FROM INVENTARIO WHERE almacen_id = @aPri AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'LAC-0012'))
    INSERT INTO INVENTARIO (almacen_id, producto_id, cantidad_actual, cantidad_reservada, actualizado_en)
    SELECT @aPri, producto_id, 8, 0, SYSUTCDATETIME() FROM PRODUCTOS WHERE sku = 'LAC-0012';
IF NOT EXISTS (SELECT 1 FROM INVENTARIO WHERE almacen_id = @aNor AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'DES-0031'))
    INSERT INTO INVENTARIO (almacen_id, producto_id, cantidad_actual, cantidad_reservada, actualizado_en)
    SELECT @aNor, producto_id, 11, 0, SYSUTCDATETIME() FROM PRODUCTOS WHERE sku = 'DES-0031';
IF NOT EXISTS (SELECT 1 FROM INVENTARIO WHERE almacen_id = @aPri AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'DES-0044'))
    INSERT INTO INVENTARIO (almacen_id, producto_id, cantidad_actual, cantidad_reservada, actualizado_en)
    SELECT @aPri, producto_id, 31, 0, SYSUTCDATETIME() FROM PRODUCTOS WHERE sku = 'DES-0044';

-- Reglas de reposición (el dashboard alerta cuando stock actual < stock mínimo)
IF NOT EXISTS (SELECT 1 FROM REGLAS_REPOSICION WHERE almacen_id = @aPri AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'CAF-0048'))
    INSERT INTO REGLAS_REPOSICION (producto_id, almacen_id, stock_minimo, stock_maximo, stock_seguridad, punto_reorden, pedido_automatico)
    SELECT producto_id, @aPri, 20, 100, 10, 25, 1 FROM PRODUCTOS WHERE sku = 'CAF-0048';
IF NOT EXISTS (SELECT 1 FROM REGLAS_REPOSICION WHERE almacen_id = @aPri AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'LAC-0012'))
    INSERT INTO REGLAS_REPOSICION (producto_id, almacen_id, stock_minimo, stock_maximo, stock_seguridad, punto_reorden, pedido_automatico)
    SELECT producto_id, @aPri, 24, 120, 12, 30, 1 FROM PRODUCTOS WHERE sku = 'LAC-0012';
IF NOT EXISTS (SELECT 1 FROM REGLAS_REPOSICION WHERE almacen_id = @aNor AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'DES-0031'))
    INSERT INTO REGLAS_REPOSICION (producto_id, almacen_id, stock_minimo, stock_maximo, stock_seguridad, punto_reorden, pedido_automatico)
    SELECT producto_id, @aNor, 25, 150, 12, 30, 1 FROM PRODUCTOS WHERE sku = 'DES-0031';
IF NOT EXISTS (SELECT 1 FROM REGLAS_REPOSICION WHERE almacen_id = @aPri AND producto_id = (SELECT producto_id FROM PRODUCTOS WHERE sku = 'DES-0044'))
    INSERT INTO REGLAS_REPOSICION (producto_id, almacen_id, stock_minimo, stock_maximo, stock_seguridad, punto_reorden, pedido_automatico)
    SELECT producto_id, @aPri, 15, 80, 8, 20, 1 FROM PRODUCTOS WHERE sku = 'DES-0044';
GO
