/* ============================================================================
   03_datos_demo.sql  -  Datos de prueba para ventas, predicciones e informes de IA.

   Qué crea (todo marcado como DEMO para poder borrarlo con 04_limpiar_datos_demo.sql):
     - 5 clientes        (documento 'DEMO-...')
     - 9 productos       (sku 'DEMO-...') con existencias y reglas de reposición en cada almacén
     - vínculos producto-proveedor (precio de compra y plazo de entrega) para los productos activos
     - ~6 meses de ventas diarias por almacén (numero_factura 'DEMO-AAAAMMDD-A<almacen>', notas 'DEMO: ...')
       con estacionalidad semanal (más ventas viernes y sábado), estacionalidad anual (picos en diciembre
       en bebidas y quesos), tendencia creciente y ruido aleatorio.

   Qué NO toca: las existencias de los productos reales, los movimientos de inventario ni los usuarios.
   Las ventas demo son historial: no descuentan inventario.

   Es idempotente: si ya existen ventas DEMO, no hace nada. Se ejecuta en una sola transacción.
   Requisitos: una moneda base activa y un usuario Administrador activo.
   ============================================================================ */
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF EXISTS (SELECT 1 FROM VENTAS WHERE numero_factura LIKE 'DEMO-%')
BEGIN
    PRINT N'Los datos demo ya existen. Ejecuta 04_limpiar_datos_demo.sql primero si quieres regenerarlos.';
    RETURN;
END

DECLARE @monedaId int = (SELECT TOP 1 moneda_id FROM MONEDAS WHERE es_base = 1 AND activo = 1);
DECLARE @usuarioId int = (SELECT TOP 1 u.usuario_id FROM USUARIOS u INNER JOIN ROLES r ON r.rol_id = u.rol_id
                          WHERE r.nombre = N'Administrador' AND u.activo = 1 ORDER BY u.usuario_id);
IF @monedaId IS NULL OR @usuarioId IS NULL
BEGIN
    RAISERROR(N'Falta la moneda base activa o un usuario Administrador activo.', 16, 1);
    RETURN;
END

DECLARE @catFallback int = (SELECT TOP 1 categoria_id FROM CATEGORIAS ORDER BY categoria_id);
DECLARE @impItbis int = ISNULL((SELECT TOP 1 impuesto_id FROM IMPUESTOS WHERE codigo = 'ITBIS18'), (SELECT TOP 1 impuesto_id FROM IMPUESTOS ORDER BY impuesto_id));
DECLARE @impExento int = ISNULL((SELECT TOP 1 impuesto_id FROM IMPUESTOS WHERE codigo = 'EXENTO'), @impItbis);

BEGIN TRAN;

-- ---------------------------------------------------------------- Clientes
INSERT INTO CLIENTES (nombre, documento, email, telefono, direccion, activo)
SELECT v.nombre, v.documento, v.email, v.telefono, v.direccion, 1
FROM (VALUES
    (N'Colmado La Esperanza', N'DEMO-131000001', N'laesperanza@demo.do', N'809-555-0101', N'Calle Duarte 12, Santo Domingo'),
    (N'Supermercado Los Hidalgos', N'DEMO-131000002', N'hidalgos@demo.do', N'809-555-0102', N'Av. Independencia 45, Santo Domingo'),
    (N'María Fernández', N'DEMO-00100000001', N'maria.f@demo.do', N'829-555-0103', N'Los Jardines, Santiago'),
    (N'Cafetería El Buen Sabor', N'DEMO-131000003', N'buensabor@demo.do', N'849-555-0104', N'Av. 27 de Febrero 88, Santiago'),
    (N'José Ramírez', N'DEMO-00100000002', N'jose.r@demo.do', N'809-555-0105', N'Villa Mella, Santo Domingo')
) AS v(nombre, documento, email, telefono, direccion)
WHERE NOT EXISTS (SELECT 1 FROM CLIENTES c WHERE c.documento = v.documento);

-- ---------------------------------------------------------------- Productos demo
CREATE TABLE #demo (
    sku nvarchar(50), nombre nvarchar(150), categoria nvarchar(100), exento bit, unidad nvarchar(20),
    costo decimal(18,2), precio decimal(18,2), base float, estacional bit);

INSERT INTO #demo VALUES
    (N'DEMO-ARR01', N'Arroz selecto 5 lb',        N'Despensa',            1, N'Paquete', 180.00, 235.00, 3.0, 0),
    (N'DEMO-HAB01', N'Habichuelas rojas 1 lb',    N'Despensa',            1, N'Libra',    55.00,  75.00, 2.5, 0),
    (N'DEMO-ACE01', N'Aceite vegetal 1 L',        N'Despensa',            0, N'Litro',   140.00, 190.00, 1.8, 0),
    (N'DEMO-AZU01', N'Azúcar crema 2 lb',         N'Despensa',            1, N'Paquete',  60.00,  85.00, 2.2, 0),
    (N'DEMO-REF01', N'Refresco cola 2 L',         N'Alimentos y bebidas', 0, N'Unidad',   55.00,  80.00, 3.5, 1),
    (N'DEMO-AGU01', N'Agua purificada 1 galón',   N'Alimentos y bebidas', 0, N'Unidad',   45.00,  70.00, 2.0, 1),
    (N'DEMO-MAN01', N'Mantequilla 8 oz',          N'Lácteos',             0, N'Unidad',   90.00, 135.00, 0.8, 0),
    (N'DEMO-YOG01', N'Yogurt natural 1 L',        N'Lácteos',             0, N'Unidad',   70.00, 105.00, 1.2, 0),
    (N'DEMO-QUE01', N'Queso blanco 1 lb',         N'Lácteos',             1, N'Libra',   120.00, 175.00, 1.0, 1);

INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
SELECT d.sku, d.nombre, ISNULL(c.categoria_id, @catFallback), CASE WHEN d.exento = 1 THEN @impExento ELSE @impItbis END,
       d.unidad, d.costo, d.precio, 1
FROM #demo d
LEFT JOIN CATEGORIAS c ON c.nombre = d.categoria
WHERE NOT EXISTS (SELECT 1 FROM PRODUCTOS p WHERE p.sku = d.sku);

-- Demanda base por producto (los productos reales usan 1.5 unidades/día por almacén).
SELECT p.producto_id, ISNULL(d.base, 1.5) AS base, ISNULL(d.estacional, 0) AS estacional
INTO #dem
FROM PRODUCTOS p
LEFT JOIN #demo d ON d.sku = p.sku
WHERE p.activo = 1;

-- Peso de cada almacén en la demanda: el primero vende más.
SELECT almacen_id,
       CASE ROW_NUMBER() OVER (ORDER BY almacen_id) WHEN 1 THEN 1.0 WHEN 2 THEN 0.7 ELSE 0.5 END AS f
INTO #alm
FROM ALMACENES;

-- ---------------------------------------------------------------- Producto-proveedor
;WITH prov AS (
    SELECT proveedor_id, ROW_NUMBER() OVER (ORDER BY proveedor_id) - 1 AS k FROM PROVEEDORES WHERE activo = 1
), cnt AS (SELECT COUNT(*) AS c FROM prov)
INSERT INTO PRODUCTO_PROVEEDOR (producto_id, proveedor_id, moneda_id, precio_compra, lead_time_dias, cantidad_minima, es_preferido)
SELECT p.producto_id, pr.proveedor_id, @monedaId, p.costo_unitario,
       3 + (p.producto_id % 6), 6 + (p.producto_id % 3) * 6, 1
FROM PRODUCTOS p
CROSS JOIN cnt
INNER JOIN prov pr ON pr.k = p.producto_id % cnt.c
WHERE p.activo = 1
  AND NOT EXISTS (SELECT 1 FROM PRODUCTO_PROVEEDOR x WHERE x.producto_id = p.producto_id AND x.proveedor_id = pr.proveedor_id);

-- ---------------------------------------------------------------- Existencias y reglas de los productos demo
SELECT p.producto_id, a.almacen_id,
       d.base * a.f AS demanda_dia,
       ABS(CHECKSUM(NEWID())) % 26 AS dias_cobertura   -- 0 a 25 días: algunos quedan bajo mínimo y otros en sobrestock
INTO #inv
FROM PRODUCTOS p
INNER JOIN #demo d ON d.sku = p.sku
CROSS JOIN #alm a;

INSERT INTO INVENTARIO (almacen_id, producto_id, cantidad_actual, cantidad_reservada, actualizado_en)
SELECT i.almacen_id, i.producto_id, ROUND(i.demanda_dia * (1 + i.dias_cobertura), 0), 0, SYSUTCDATETIME()
FROM #inv i
WHERE NOT EXISTS (SELECT 1 FROM INVENTARIO x WHERE x.almacen_id = i.almacen_id AND x.producto_id = i.producto_id);

-- mínimo = 5 días de demanda; seguridad <= mínimo <= reorden <= máximo (misma regla que valida la API)
INSERT INTO REGLAS_REPOSICION (producto_id, almacen_id, stock_minimo, stock_maximo, stock_seguridad, punto_reorden, pedido_automatico)
SELECT i.producto_id, i.almacen_id,
       m.minimo, m.minimo * 4, FLOOR(m.minimo / 2), CEILING(m.minimo * 1.4), 1
FROM #inv i
CROSS APPLY (SELECT CASE WHEN CEILING(i.demanda_dia * 5) < 1 THEN 1 ELSE CEILING(i.demanda_dia * 5) END AS minimo) m
WHERE NOT EXISTS (SELECT 1 FROM REGLAS_REPOSICION r WHERE r.producto_id = i.producto_id AND r.almacen_id = i.almacen_id);

-- ---------------------------------------------------------------- Ventas históricas (182 días, hasta ayer)
DECLARE @inicio date = DATEADD(DAY, -182, CAST(SYSUTCDATETIME() AS date));

SELECT TOP (182)
       DATEADD(DAY, ROW_NUMBER() OVER (ORDER BY (SELECT 1)) - 1, @inicio) AS dia,
       ROW_NUMBER() OVER (ORDER BY (SELECT 1)) - 1 AS i
INTO #dias
FROM sys.all_objects a CROSS JOIN sys.all_objects b;

SELECT dd.dia, dd.i, a.almacen_id, m.producto_id, m.base, m.estacional, a.f
INTO #l0
FROM #dias dd CROSS JOIN #alm a CROSS JOIN #dem m;

-- 1900-01-01 fue lunes: (días % 7) = 0 lun ... 4 vie, 5 sáb, 6 dom
SELECT l.dia, l.almacen_id, l.producto_id,
       CAST(ROUND(
            l.base * l.f
          * CASE (DATEDIFF(DAY, '19000101', l.dia) % 7) WHEN 4 THEN 1.35 WHEN 5 THEN 1.35 WHEN 6 THEN 1.1 ELSE 0.9 END
          * (1 + CASE WHEN l.estacional = 1 THEN 0.35 ELSE 0.08 END * COS(2 * PI() * (MONTH(l.dia) - 12) / 12.0))
          * (1 + 0.0012 * l.i)
          * (0.5 + (ABS(CHECKSUM(NEWID())) % 1000) / 1000.0)
       , 0) AS decimal(18,2)) AS cantidad
INTO #l1
FROM #l0 l;

DELETE FROM #l1 WHERE cantidad <= 0;

-- Una venta por día y almacén con las líneas de ese día.
INSERT INTO VENTAS (numero_factura, almacen_id, usuario_id, cliente_id, moneda_id, tasa_cambio, fecha, estado,
                    subtotal, descuento_total, impuesto_total, total, total_base, notas)
SELECT CONCAT('DEMO-', CONVERT(char(8), x.dia, 112), '-A', x.almacen_id),
       x.almacen_id, @usuarioId, NULL, @monedaId, 1,
       DATEADD(HOUR, 9 + ABS(CHECKSUM(NEWID())) % 10, CAST(x.dia AS datetime2)),
       N'COMPLETADA', x.sub, 0, x.imp, x.sub + x.imp, x.sub + x.imp, N'DEMO: datos de prueba'
FROM (
    SELECT l.dia, l.almacen_id,
           SUM(ROUND(l.cantidad * p.precio_venta, 2)) AS sub,
           SUM(ROUND(ROUND(l.cantidad * p.precio_venta, 2) * i.porcentaje / 100, 2)) AS imp
    FROM #l1 l
    INNER JOIN PRODUCTOS p ON p.producto_id = l.producto_id
    INNER JOIN IMPUESTOS i ON i.impuesto_id = p.impuesto_id
    GROUP BY l.dia, l.almacen_id
) x;

INSERT INTO DETALLE_VENTAS (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento_porcentaje, descuento_monto,
                            subtotal, impuesto_id, porcentaje_impuesto, monto_impuesto, total_linea)
SELECT v.venta_id, l.producto_id, p.nombre, l.cantidad, p.precio_venta, 0, 0,
       s.sub, p.impuesto_id, i.porcentaje, s.imp, s.sub + s.imp
FROM #l1 l
INNER JOIN VENTAS v ON v.numero_factura = CONCAT('DEMO-', CONVERT(char(8), l.dia, 112), '-A', l.almacen_id)
INNER JOIN PRODUCTOS p ON p.producto_id = l.producto_id
INNER JOIN IMPUESTOS i ON i.impuesto_id = p.impuesto_id
CROSS APPLY (SELECT ROUND(l.cantidad * p.precio_venta, 2) AS sub) a
CROSS APPLY (SELECT a.sub AS sub, ROUND(a.sub * i.porcentaje / 100, 2) AS imp) s;

-- La mitad de las ventas se asigna a un cliente demo al azar.
UPDATE v
SET cliente_id = (SELECT TOP 1 c.cliente_id FROM CLIENTES c
                  WHERE c.documento LIKE 'DEMO-%' ORDER BY CHECKSUM(NEWID(), v.venta_id))
FROM VENTAS v
WHERE v.numero_factura LIKE 'DEMO-%' AND v.venta_id % 2 = 0;

COMMIT;

DROP TABLE #demo, #dem, #alm, #inv, #dias, #l0, #l1;

SELECT (SELECT COUNT(*) FROM VENTAS WHERE numero_factura LIKE 'DEMO-%')          AS ventas_demo,
       (SELECT COUNT(*) FROM DETALLE_VENTAS d INNER JOIN VENTAS v ON v.venta_id = d.venta_id
         WHERE v.numero_factura LIKE 'DEMO-%')                                    AS lineas_demo,
       (SELECT COUNT(*) FROM PRODUCTOS WHERE sku LIKE 'DEMO-%')                   AS productos_demo,
       (SELECT COUNT(*) FROM CLIENTES WHERE documento LIKE 'DEMO-%')              AS clientes_demo,
       (SELECT COUNT(*) FROM PRODUCTO_PROVEEDOR)                                  AS producto_proveedor,
       (SELECT COUNT(*) FROM REGLAS_REPOSICION)                                   AS reglas;
