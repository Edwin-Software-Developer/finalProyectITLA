using Dapper;
using Microsoft.Data.SqlClient;

namespace ControlStock.Reportes
{
    /// <summary>Calcula con SQL todas las cifras del informe. La IA solo las interpreta.</summary>
    public class InformeBuilder
    {
        private const int Top = 10;
        private const int DiasVentana = 90;
        private readonly string _connectionString;

        public InformeBuilder(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("ConexionSQL")
                ?? throw new InvalidOperationException("Falta la cadena de conexión 'ConexionSQL'.");
        }

        public async Task<DatosInventario> ConstruirAsync(CancellationToken ct = default)
        {
            await using var cn = new SqlConnection(_connectionString);
            await cn.OpenAsync(ct);

            // KPIs generales
            var kpiBase = await cn.QuerySingleAsync<KpiBase>(new CommandDefinition(@"
                SELECT (SELECT COUNT(*) FROM PRODUCTOS WHERE activo = 1) AS ProductosActivos,
                       ISNULL(SUM(i.cantidad_actual), 0) AS Unidades,
                       ISNULL(SUM(i.cantidad_actual * p.costo_unitario), 0) AS ValorCosto
                FROM INVENTARIO i
                INNER JOIN PRODUCTOS p ON p.producto_id = i.producto_id
                WHERE p.activo = 1;", cancellationToken: ct));

            // Productos por debajo del mínimo (peor cobertura primero)
            var bajoMinimo = (await cn.QueryAsync<ItemStock>(new CommandDefinition($@"
                SELECT TOP {Top} p.nombre AS Producto, p.sku AS Sku, a.nombre AS Almacen,
                       i.cantidad_actual AS Cantidad, r.stock_minimo AS Referencia
                FROM INVENTARIO i
                INNER JOIN REGLAS_REPOSICION r ON r.producto_id = i.producto_id AND r.almacen_id = i.almacen_id
                INNER JOIN PRODUCTOS p ON p.producto_id = i.producto_id
                INNER JOIN ALMACENES a ON a.almacen_id = i.almacen_id
                WHERE p.activo = 1 AND i.cantidad_actual < r.stock_minimo
                ORDER BY i.cantidad_actual / NULLIF(r.stock_minimo, 0), p.nombre;", cancellationToken: ct))).ToList();

            var totalBajoMinimo = await cn.ExecuteScalarAsync<int>(new CommandDefinition(@"
                SELECT COUNT(*) FROM INVENTARIO i
                INNER JOIN REGLAS_REPOSICION r ON r.producto_id = i.producto_id AND r.almacen_id = i.almacen_id
                INNER JOIN PRODUCTOS p ON p.producto_id = i.producto_id
                WHERE p.activo = 1 AND i.cantidad_actual < r.stock_minimo;", cancellationToken: ct));

            // Sobrestock: por encima del máximo definido
            var sobrestock = (await cn.QueryAsync<ItemStock>(new CommandDefinition($@"
                SELECT TOP {Top} p.nombre AS Producto, p.sku AS Sku, a.nombre AS Almacen,
                       i.cantidad_actual AS Cantidad, r.stock_maximo AS Referencia
                FROM INVENTARIO i
                INNER JOIN REGLAS_REPOSICION r ON r.producto_id = i.producto_id AND r.almacen_id = i.almacen_id
                INNER JOIN PRODUCTOS p ON p.producto_id = i.producto_id
                INNER JOIN ALMACENES a ON a.almacen_id = i.almacen_id
                WHERE p.activo = 1 AND r.stock_maximo > 0 AND i.cantidad_actual > r.stock_maximo
                ORDER BY i.cantidad_actual / r.stock_maximo DESC, p.nombre;", cancellationToken: ct))).ToList();

            var totalSobrestock = await cn.ExecuteScalarAsync<int>(new CommandDefinition(@"
                SELECT COUNT(*) FROM INVENTARIO i
                INNER JOIN REGLAS_REPOSICION r ON r.producto_id = i.producto_id AND r.almacen_id = i.almacen_id
                INNER JOIN PRODUCTOS p ON p.producto_id = i.producto_id
                WHERE p.activo = 1 AND r.stock_maximo > 0 AND i.cantidad_actual > r.stock_maximo;", cancellationToken: ct));

            // Ventas de los últimos 90 días por producto, con stock actual y cobertura en días
            var ventas = (await cn.QueryAsync<VentaFila>(new CommandDefinition(@"
                SELECT p.nombre AS Producto, p.sku AS Sku,
                       ISNULL(v.Unidades, 0) AS Unidades,
                       ISNULL(s.Stock, 0) AS Stock
                FROM PRODUCTOS p
                LEFT JOIN (
                    SELECT d.producto_id, SUM(d.cantidad) AS Unidades
                    FROM DETALLE_VENTAS d
                    INNER JOIN VENTAS ve ON ve.venta_id = d.venta_id
                    WHERE ve.fecha >= DATEADD(DAY, -@dias, SYSUTCDATETIME())
                      AND ve.estado NOT IN (N'Anulada', N'Cancelada')
                    GROUP BY d.producto_id) v ON v.producto_id = p.producto_id
                LEFT JOIN (
                    SELECT producto_id, SUM(cantidad_actual) AS Stock
                    FROM INVENTARIO GROUP BY producto_id) s ON s.producto_id = p.producto_id
                WHERE p.activo = 1;", new { dias = DiasVentana }, cancellationToken: ct))).ToList();

            ItemVenta ToItem(VentaFila f) => new(
                f.Producto, f.Sku, f.Unidades, f.Stock,
                f.Unidades > 0 ? Math.Round(f.Stock / (f.Unidades / DiasVentana), 0) : null);

            var masVendidos = ventas.Where(v => v.Unidades > 0).OrderByDescending(v => v.Unidades).Take(Top).Select(ToItem).ToList();
            var sinMovimiento = ventas.Where(v => v.Unidades == 0 && v.Stock > 0).OrderByDescending(v => v.Stock).ToList();

            var porCategoria = (await cn.QueryAsync<ItemCategoria>(new CommandDefinition(@"
                SELECT c.nombre AS Categoria,
                       ISNULL(SUM(i.cantidad_actual), 0) AS Unidades,
                       ISNULL(SUM(i.cantidad_actual * p.costo_unitario), 0) AS ValorCosto
                FROM CATEGORIAS c
                INNER JOIN PRODUCTOS p ON p.categoria_id = c.categoria_id AND p.activo = 1
                LEFT JOIN INVENTARIO i ON i.producto_id = p.producto_id
                GROUP BY c.nombre
                ORDER BY ValorCosto DESC;", cancellationToken: ct))).ToList();

            var kpis = new KpisInventario(
                kpiBase.ProductosActivos, kpiBase.Unidades, kpiBase.ValorCosto,
                totalBajoMinimo, totalSobrestock, sinMovimiento.Count,
                ventas.Sum(v => v.Unidades));

            return new DatosInventario(
                DateTime.UtcNow, kpis, bajoMinimo, sobrestock, masVendidos,
                sinMovimiento.Take(Top).Select(ToItem).ToList(), porCategoria);
        }

        private sealed class KpiBase
        {
            public int ProductosActivos { get; set; }
            public decimal Unidades { get; set; }
            public decimal ValorCosto { get; set; }
        }

        private sealed class VentaFila
        {
            public string Producto { get; set; } = string.Empty;
            public string Sku { get; set; } = string.Empty;
            public decimal Unidades { get; set; }
            public decimal Stock { get; set; }
        }
    }
}
