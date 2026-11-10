using Microsoft.AspNetCore.Mvc;

namespace ControlStock.Controllers
{
    /// <summary>
    /// Endpoint de prueba para el dashboard. Devuelve datos de ejemplo en memoria
    /// (no usa base de datos) para validar la conexión frontend ↔ backend.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        public record AlertaInventario(string Nombre, string Detalle, decimal Cantidad, decimal Minimo, string Nivel);

        public record ResumenDashboard(DateTime GeneradoEn, int TotalAlertas, IEnumerable<AlertaInventario> Alertas);

        [HttpGet("resumen")]
        public ActionResult<ResumenDashboard> GetResumen()
        {
            var alertas = new List<AlertaInventario>
            {
                new("Café molido premium", "SKU: CAF-0048 · Almacén principal", 4, 20, "red"),
                new("Leche entera 1L", "SKU: LAC-0012 · Almacén principal", 8, 24, "orange"),
                new("Azúcar blanca 2lb", "SKU: DES-0031 · Sucursal Norte", 11, 25, "orange"),
            };

            return Ok(new ResumenDashboard(DateTime.UtcNow, alertas.Count, alertas));
        }
    }
}
