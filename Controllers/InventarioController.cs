using System.ComponentModel.DataAnnotations;
using ControlStock.Auth;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    /// <summary>Existencias por producto y almacén junto con sus reglas de reposición.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InventarioController : DbControllerBase
    {
        private const int ForeignKeyViolation = 547;

        public class FilaInventario
        {
            public int Producto_id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string Nombre { get; set; } = string.Empty;
            public string Categoria { get; set; } = string.Empty;
            public string Unidad_medida { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
            public string Almacen { get; set; } = string.Empty;
            public decimal Cantidad_actual { get; set; }
            public decimal Cantidad_reservada { get; set; }
            public decimal? Stock_minimo { get; set; }
            public decimal? Stock_maximo { get; set; }
            public decimal? Stock_seguridad { get; set; }
            public decimal? Punto_reorden { get; set; }
            public bool? Pedido_automatico { get; set; }

            /// <summary>sin_regla | critico | bajo | reponer | sobrestock | ok</summary>
            public string Estado { get; set; } = "sin_regla";

            /// <summary>Unidades para llegar al máximo cuando el stock está en o bajo el punto de reorden.</summary>
            public decimal Sugerido { get; set; }
        }

        public class ReglaDTO
        {
            [Range(1, int.MaxValue, ErrorMessage = "Producto inválido")]
            public int Producto_id { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "Almacén inválido")]
            public int Almacen_id { get; set; }

            [Range(0, 9999999999999999.99, ErrorMessage = "El stock mínimo no puede ser negativo")]
            public decimal Stock_minimo { get; set; }

            [Range(0, 9999999999999999.99, ErrorMessage = "El stock máximo no puede ser negativo")]
            public decimal Stock_maximo { get; set; }

            [Range(0, 9999999999999999.99, ErrorMessage = "El stock de seguridad no puede ser negativo")]
            public decimal Stock_seguridad { get; set; }

            [Range(0, 9999999999999999.99, ErrorMessage = "El punto de reorden no puede ser negativo")]
            public decimal Punto_reorden { get; set; }

            public bool Pedido_automatico { get; set; }
        }

        public InventarioController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        /// <summary>Todos los productos activos en cada almacén (con 0 si no tienen existencias registradas).</summary>
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? almacenId)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = (await cn.QueryAsync<FilaInventario>(@"
                    SELECT p.producto_id AS Producto_id, p.sku AS Sku, p.nombre AS Nombre,
                           c.nombre AS Categoria, p.unidad_medida AS Unidad_medida,
                           a.almacen_id AS Almacen_id, a.nombre AS Almacen,
                           ISNULL(i.cantidad_actual, 0) AS Cantidad_actual,
                           ISNULL(i.cantidad_reservada, 0) AS Cantidad_reservada,
                           r.stock_minimo AS Stock_minimo, r.stock_maximo AS Stock_maximo,
                           r.stock_seguridad AS Stock_seguridad, r.punto_reorden AS Punto_reorden,
                           r.pedido_automatico AS Pedido_automatico
                    FROM PRODUCTOS p
                    INNER JOIN CATEGORIAS c ON c.categoria_id = p.categoria_id
                    CROSS JOIN ALMACENES a
                    LEFT JOIN INVENTARIO i ON i.producto_id = p.producto_id AND i.almacen_id = a.almacen_id
                    LEFT JOIN REGLAS_REPOSICION r ON r.producto_id = p.producto_id AND r.almacen_id = a.almacen_id
                    WHERE p.activo = 1 AND (@almacenId IS NULL OR a.almacen_id = @almacenId)
                    ORDER BY p.nombre, a.nombre;", new { almacenId })).ToList();

                foreach (var f in filas) Clasificar(f);
                return Ok(filas);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        /// <summary>Crea o actualiza la regla de reposición de un producto en un almacén.</summary>
        [HttpPut("reglas")]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> GuardarRegla(ReglaDTO regla)
        {
            if (regla.Stock_minimo > regla.Stock_maximo)
                return BadRequest("El stock mínimo no puede ser mayor que el máximo.");
            if (regla.Punto_reorden < regla.Stock_minimo || regla.Punto_reorden > regla.Stock_maximo)
                return BadRequest("El punto de reorden debe estar entre el stock mínimo y el máximo.");
            if (regla.Stock_seguridad > regla.Stock_minimo)
                return BadRequest("El stock de seguridad no puede superar al stock mínimo.");

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                var filas = await cn.ExecuteAsync(@"
                    UPDATE REGLAS_REPOSICION
                    SET stock_minimo = @Stock_minimo, stock_maximo = @Stock_maximo,
                        stock_seguridad = @Stock_seguridad, punto_reorden = @Punto_reorden,
                        pedido_automatico = @Pedido_automatico
                    WHERE producto_id = @Producto_id AND almacen_id = @Almacen_id;", regla, tx);

                if (filas == 0)
                {
                    await cn.ExecuteAsync(@"
                        INSERT INTO REGLAS_REPOSICION
                            (producto_id, almacen_id, stock_minimo, stock_maximo, stock_seguridad, punto_reorden, pedido_automatico)
                        VALUES (@Producto_id, @Almacen_id, @Stock_minimo, @Stock_maximo, @Stock_seguridad, @Punto_reorden, @Pedido_automatico);",
                        regla, tx);
                }

                tx.Commit();
                return NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El producto o el almacén no existe.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        private static void Clasificar(FilaInventario f)
        {
            if (f.Stock_minimo is null || f.Stock_maximo is null || f.Punto_reorden is null)
            {
                f.Estado = "sin_regla";
                return;
            }

            var min = f.Stock_minimo.Value;
            var max = f.Stock_maximo.Value;
            var reorden = f.Punto_reorden.Value;
            var cant = f.Cantidad_actual;

            f.Estado =
                cant <= min / 2 && min > 0 ? "critico" :
                cant < min ? "bajo" :
                cant <= reorden ? "reponer" :
                max > 0 && cant > max ? "sobrestock" :
                "ok";

            if (cant <= reorden) f.Sugerido = Math.Max(max - cant, 0);
        }
    }
}
