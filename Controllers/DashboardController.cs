using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ControlStock.Controllers
{
    /// <summary>Datos agregados que consume el dashboard, calculados desde SQL Server.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : DbControllerBase
    {
        private const int MaxAlertasVisibles = 5;

        public record AlertaInventario(string Nombre, string Detalle, decimal Cantidad, decimal Minimo, string Nivel);

        public record ResumenDashboard(DateTime GeneradoEn, int TotalAlertas, IEnumerable<AlertaInventario> Alertas);

        public DashboardController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        /// <summary>
        /// Alertas de inventario: productos activos cuyo stock actual está por debajo
        /// del stock mínimo definido en REGLAS_REPOSICION (por almacén).
        /// </summary>
        [HttpGet("resumen")]
        public async Task<IActionResult> GetResumen()
        {
            try
            {
                using var connection = CreateConnection();
                const string query = @"
                    SELECT p.nombre AS Nombre,
                           CONCAT('SKU: ', p.sku, N' · ', a.nombre) AS Detalle,
                           i.cantidad_actual AS Cantidad,
                           r.stock_minimo AS Minimo
                    FROM INVENTARIO i
                    INNER JOIN REGLAS_REPOSICION r ON r.producto_id = i.producto_id AND r.almacen_id = i.almacen_id
                    INNER JOIN PRODUCTOS p ON p.producto_id = i.producto_id
                    INNER JOIN ALMACENES a ON a.almacen_id = i.almacen_id
                    WHERE p.activo = 1
                      AND i.cantidad_actual < r.stock_minimo
                    ORDER BY i.cantidad_actual / NULLIF(r.stock_minimo, 0), p.nombre;";

                var filas = (await connection.QueryAsync<AlertaFila>(query)).ToList();

                var alertas = filas
                    .Take(MaxAlertasVisibles)
                    .Select(f => new AlertaInventario(
                        f.Nombre, f.Detalle, f.Cantidad, f.Minimo,
                        // Crítico: menos de la mitad del mínimo
                        f.Cantidad <= f.Minimo / 2 ? "red" : "orange"))
                    .ToList();

                return Ok(new ResumenDashboard(DateTime.UtcNow, filas.Count, alertas));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        public record PuntoVenta(DateTime Fecha, decimal Total);

        public record ProductoTop(string Nombre, string Categoria, decimal Unidades, decimal Stock);

        public record VentasDashboard(
            int Dias,
            decimal TotalPeriodo,
            decimal TotalPeriodoAnterior,
            int TransaccionesPeriodo,
            decimal VentasMes,
            decimal VentasMesAnterior,
            IEnumerable<PuntoVenta> Serie,
            IEnumerable<ProductoTop> TopProductos);

        /// <summary>
        /// Ventas reales (excluye anuladas/canceladas): serie diaria del período, comparación con el
        /// período anterior, acumulado del mes y productos más vendidos.
        /// </summary>
        [HttpGet("ventas")]
        public async Task<IActionResult> GetVentas([FromQuery] int dias = 7)
        {
            if (dias is not (7 or 30 or 90))
                return BadRequest("El parámetro 'dias' debe ser 7, 30 o 90.");

            try
            {
                var hoy = DateTime.UtcNow.Date;
                var inicio = hoy.AddDays(-(dias - 1));
                var inicioAnterior = inicio.AddDays(-dias);
                var finExclusivo = hoy.AddDays(1);

                var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
                var inicioMesAnterior = inicioMes.AddMonths(-1);
                // Mismo tramo del mes anterior (del día 1 al día de hoy) para comparar peras con peras.
                var finMesAnterior = inicioMesAnterior.AddDays(hoy.Day);
                if (finMesAnterior > inicioMes) finMesAnterior = inicioMes;

                using var connection = CreateConnection();
                const string filtro = "estado NOT IN (N'Anulada', N'Cancelada')";

                var diarias = (await connection.QueryAsync<(DateTime Dia, decimal Total, int Cantidad)>($@"
                    SELECT CAST(fecha AS date) AS Dia, SUM(total_base) AS Total, COUNT(*) AS Cantidad
                    FROM VENTAS
                    WHERE fecha >= @inicioAnterior AND fecha < @finExclusivo AND {filtro}
                    GROUP BY CAST(fecha AS date);",
                    new { inicioAnterior, finExclusivo })).ToList();

                var serie = Enumerable.Range(0, dias)
                    .Select(i => inicio.AddDays(i))
                    .Select(d => new PuntoVenta(d, diarias.Where(x => x.Dia.Date == d).Sum(x => x.Total)))
                    .ToList();

                var delPeriodo = diarias.Where(x => x.Dia.Date >= inicio).ToList();
                var totalAnterior = diarias.Where(x => x.Dia.Date < inicio).Sum(x => x.Total);

                var meses = await connection.QuerySingleAsync<(decimal Mes, decimal MesAnterior)>($@"
                    SELECT ISNULL(SUM(CASE WHEN fecha >= @inicioMes AND fecha < @finExclusivo THEN total_base END), 0) AS Mes,
                           ISNULL(SUM(CASE WHEN fecha >= @inicioMesAnterior AND fecha < @finMesAnterior THEN total_base END), 0) AS MesAnterior
                    FROM VENTAS
                    WHERE fecha >= @inicioMesAnterior AND fecha < @finExclusivo AND {filtro};",
                    new { inicioMes, inicioMesAnterior, finMesAnterior, finExclusivo });

                var top = (await connection.QueryAsync<ProductoTop>($@"
                    SELECT TOP 3 p.nombre AS Nombre, c.nombre AS Categoria,
                           SUM(d.cantidad) AS Unidades,
                           ISNULL((SELECT SUM(i.cantidad_actual) FROM INVENTARIO i WHERE i.producto_id = p.producto_id), 0) AS Stock
                    FROM DETALLE_VENTAS d
                    INNER JOIN VENTAS ve ON ve.venta_id = d.venta_id
                    INNER JOIN PRODUCTOS p ON p.producto_id = d.producto_id
                    INNER JOIN CATEGORIAS c ON c.categoria_id = p.categoria_id
                    WHERE ve.fecha >= @inicio AND ve.fecha < @finExclusivo
                      AND ve.{filtro}
                    GROUP BY p.producto_id, p.nombre, c.nombre
                    ORDER BY SUM(d.cantidad) DESC;",
                    new { inicio, finExclusivo })).ToList();

                return Ok(new VentasDashboard(
                    dias, delPeriodo.Sum(x => x.Total), totalAnterior, delPeriodo.Sum(x => x.Cantidad),
                    meses.Mes, meses.MesAnterior, serie, top));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        private sealed class AlertaFila
        {
            public string Nombre { get; set; } = string.Empty;
            public string Detalle { get; set; } = string.Empty;
            public decimal Cantidad { get; set; }
            public decimal Minimo { get; set; }
        }
    }
}
