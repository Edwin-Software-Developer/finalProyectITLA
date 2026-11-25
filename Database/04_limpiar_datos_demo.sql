/* ============================================================================
   04_limpiar_datos_demo.sql  -  Borra lo que creó 03_datos_demo.sql.

   Elimina: ventas y líneas DEMO, clientes DEMO, productos DEMO con sus existencias, reglas y vínculos con
   proveedores. No toca productos, ventas, movimientos ni usuarios reales.

   Nota: los vínculos producto-proveedor que el script demo creó para los productos REALES se conservan
   (son inofensivos); bórralos a mano si no los quieres.
   Si algún producto DEMO ya se usó en una venta u orden real, el borrado se detiene con un error de
   llave foránea y no se pierde nada (una sola transacción).
   ============================================================================ */
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

DELETE d FROM DETALLE_VENTAS d INNER JOIN VENTAS v ON v.venta_id = d.venta_id WHERE v.numero_factura LIKE 'DEMO-%';
DELETE FROM VENTAS WHERE numero_factura LIKE 'DEMO-%';

DELETE FROM REGLAS_REPOSICION    WHERE producto_id IN (SELECT producto_id FROM PRODUCTOS WHERE sku LIKE 'DEMO-%');
DELETE FROM INVENTARIO           WHERE producto_id IN (SELECT producto_id FROM PRODUCTOS WHERE sku LIKE 'DEMO-%');
DELETE FROM PRODUCTO_PROVEEDOR   WHERE producto_id IN (SELECT producto_id FROM PRODUCTOS WHERE sku LIKE 'DEMO-%');
DELETE FROM PRODUCTOS            WHERE sku LIKE 'DEMO-%';
DELETE FROM CLIENTES             WHERE documento LIKE 'DEMO-%';

COMMIT;
PRINT N'Datos demo eliminados.';
