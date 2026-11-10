using Dapper;
using Microsoft.AspNetCore.Mvc;

namespace ControlStock.Controllers
{
    /// <summary>Listas auxiliares para los formularios del frontend (categorías, impuestos).</summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CatalogosController : DbControllerBase
    {
        public record OpcionCatalogo(int Id, string Nombre);

        public CatalogosController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet("categorias")]
        public async Task<IActionResult> GetCategorias()
        {
            try
            {
                using var connection = CreateConnection();
                var filas = await connection.QueryAsync<OpcionFila>(
                    "SELECT categoria_id AS Id, nombre AS Nombre FROM CATEGORIAS ORDER BY nombre;");
                return Ok(filas.Select(f => new OpcionCatalogo(f.Id, f.Nombre)));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpGet("impuestos")]
        public async Task<IActionResult> GetImpuestos()
        {
            try
            {
                using var connection = CreateConnection();
                var filas = await connection.QueryAsync<OpcionFila>(
                    "SELECT impuesto_id AS Id, nombre AS Nombre FROM IMPUESTOS WHERE activo = 1 ORDER BY nombre;");
                return Ok(filas.Select(f => new OpcionCatalogo(f.Id, f.Nombre)));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        private sealed class OpcionFila
        {
            public int Id { get; set; }
            public string Nombre { get; set; } = string.Empty;
        }
    }
}
