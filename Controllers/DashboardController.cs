using Dapper;
using Microsoft.AspNetCore.Mvc;

namespace ControlStock.Controllers
{
    /// <summary>Datos agregados que consume el dashboard, calculados desde SQL Server.</summary>
    [Route("api/[controller]")]
    [ApiController]
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

        private sealed class AlertaFila
        {
            public string Nombre { get; set; } = string.Empty;
            public string Detalle { get; set; } = string.Empty;
            public decimal Cantidad { get; set; }
            public decimal Minimo { get; set; }
        }
    }
}
