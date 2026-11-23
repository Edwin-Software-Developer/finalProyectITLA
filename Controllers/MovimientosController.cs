using System.ComponentModel.DataAnnotations;
using System.Data;
using ControlStock.Auth;
using ControlStock.Inventario;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    /// <summary>
    /// Movimientos de inventario. Convención: MOVIMIENTOS_INVENTARIO.cantidad es el CAMBIO CON SIGNO
    /// aplicado a la existencia (ENTRADA &gt; 0, SALIDA &lt; 0, AJUSTE ±, TRASLADO: &lt; 0 en el origen y &gt; 0 en el destino).
    /// Cada movimiento y la actualización de INVENTARIO ocurren en una sola transacción.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = AppRoles.Escritura)]
    public class MovimientosController : DbControllerBase
    {
        private const int ForeignKeyViolation = 547;
        private const int MaxFilas = 300;

        public class FilaMovimiento
        {
            public long Movimiento_id { get; set; }
            public DateTime Fecha { get; set; }
            public string Tipo { get; set; } = string.Empty;
            public decimal Cantidad { get; set; }
            public int Producto_id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string Producto { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
            public string Almacen { get; set; } = string.Empty;
            public string Usuario { get; set; } = string.Empty;
            public string? Referencia_tipo { get; set; }
            public int? Referencia_id { get; set; }
        }

        public class MovimientoCreateDTO : IValidatableObject
        {
            [Range(1, int.MaxValue, ErrorMessage = "Selecciona un producto")]
            public int Producto_id { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "Selecciona un almacén")]
            public int Almacen_id { get; set; }

            /// <summary>ENTRADA | SALIDA | AJUSTE</summary>
            [Required(ErrorMessage = "El tipo es requerido")]
            public string Tipo { get; set; } = string.Empty;

            /// <summary>Positiva en ENTRADA y SALIDA; con signo (distinta de 0) en AJUSTE.</summary>
            public decimal Cantidad { get; set; }

            public IEnumerable<ValidationResult> Validate(ValidationContext _)
            {
                var tipo = Tipo?.ToUpperInvariant();
                if (tipo is not ("ENTRADA" or "SALIDA" or "AJUSTE"))
                    yield return new ValidationResult("El tipo debe ser ENTRADA, SALIDA o AJUSTE.", new[] { nameof(Tipo) });
                else if (tipo == "AJUSTE" ? Cantidad == 0 : Cantidad <= 0)
                    yield return new ValidationResult(
                        tipo == "AJUSTE" ? "El ajuste no puede ser 0." : "La cantidad debe ser mayor que 0.", new[] { nameof(Cantidad) });
                if (Math.Abs(Cantidad) > 9999999999999999m)
                    yield return new ValidationResult("La cantidad es demasiado grande.", new[] { nameof(Cantidad) });
            }
        }

        public class TrasladoDTO
        {
            [Range(1, int.MaxValue, ErrorMessage = "Selecciona un producto")]
            public int Producto_id { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "Selecciona el almacén de origen")]
            public int Almacen_origen_id { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "Selecciona el almacén de destino")]
            public int Almacen_destino_id { get; set; }

            [Range(0.01, 9999999999999999.99, ErrorMessage = "La cantidad debe ser mayor que 0")]
            public decimal Cantidad { get; set; }
        }

        public MovimientosController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? almacenId, [FromQuery] int? productoId, [FromQuery] string? tipo)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = await cn.QueryAsync<FilaMovimiento>($@"
                    SELECT TOP {MaxFilas}
                           m.movimiento_id AS Movimiento_id, m.fecha AS Fecha, m.tipo AS Tipo, m.cantidad AS Cantidad,
                           p.producto_id AS Producto_id, p.sku AS Sku, p.nombre AS Producto,
                           a.almacen_id AS Almacen_id, a.nombre AS Almacen, u.nombre AS Usuario,
                           m.referencia_tipo AS Referencia_tipo, m.referencia_id AS Referencia_id
                    FROM MOVIMIENTOS_INVENTARIO m
                    INNER JOIN PRODUCTOS p ON p.producto_id = m.producto_id
                    INNER JOIN ALMACENES a ON a.almacen_id = m.almacen_id
                    INNER JOIN USUARIOS u ON u.usuario_id = m.usuario_id
                    WHERE (@almacenId IS NULL OR m.almacen_id = @almacenId)
                      AND (@productoId IS NULL OR m.producto_id = @productoId)
                      AND (@tipo IS NULL OR m.tipo = @tipo)
                    ORDER BY m.fecha DESC, m.movimiento_id DESC;",
                    new { almacenId, productoId, tipo = string.IsNullOrWhiteSpace(tipo) ? null : tipo.ToUpperInvariant() });
                return Ok(filas);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        public async Task<IActionResult> Create(MovimientoCreateDTO dto)
        {
            var tipo = dto.Tipo.ToUpperInvariant();
            var delta = tipo switch
            {
                "ENTRADA" => dto.Cantidad,
                "SALIDA" => -dto.Cantidad,
                _ => dto.Cantidad, // AJUSTE ya viene con signo
            };

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                await StockOps.AplicarAsync(cn, tx, dto.Producto_id, dto.Almacen_id, delta);
                var id = await StockOps.RegistrarAsync(cn, tx, dto.Producto_id, dto.Almacen_id, User.GetUsuarioId(), tipo, delta,
                    tipo == "AJUSTE" ? "AJUSTE" : null, null);

                tx.Commit();
                return Created($"/api/movimientos/{id}", new { movimiento_id = id });
            }
            catch (ExistenciaInsuficiente ex) { return Conflict(ex.Message); }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El producto o el almacén no existe.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost("traslado")]
        public async Task<IActionResult> Trasladar(TrasladoDTO dto)
        {
            if (dto.Almacen_origen_id == dto.Almacen_destino_id)
                return BadRequest("El almacén de origen y el de destino deben ser distintos.");

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();
                var usuario = User.GetUsuarioId();

                await StockOps.AplicarAsync(cn, tx, dto.Producto_id, dto.Almacen_origen_id, -dto.Cantidad);
                await StockOps.AplicarAsync(cn, tx, dto.Producto_id, dto.Almacen_destino_id, dto.Cantidad);

                var salida = await StockOps.RegistrarAsync(cn, tx, dto.Producto_id, dto.Almacen_origen_id, usuario, "TRASLADO", -dto.Cantidad, null, null);
                // La entrada referencia a la salida para poder emparejar ambas filas.
                await StockOps.RegistrarAsync(cn, tx, dto.Producto_id, dto.Almacen_destino_id, usuario, "TRASLADO", dto.Cantidad, "TRASLADO", (int)salida);

                tx.Commit();
                return Created($"/api/movimientos/{salida}", new { movimiento_id = salida });
            }
            catch (ExistenciaInsuficiente ex) { return Conflict(ex.Message); }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El producto o algún almacén no existe.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

    }
}
