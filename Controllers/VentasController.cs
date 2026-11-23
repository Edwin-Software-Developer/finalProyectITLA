using System.ComponentModel.DataAnnotations;
using ControlStock.Auth;
using ControlStock.Inventario;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    /// <summary>
    /// Punto de venta. Estados: COMPLETADA → ANULADA. Cada venta descuenta el inventario (movimientos SALIDA, cantidad
    /// negativa, referencia VENTA) en la misma transacción; anular la venta devuelve las existencias.
    /// Precios, impuestos y totales se calculan en el servidor a partir de PRODUCTOS: el cliente solo envía cantidades.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = AppRoles.Escritura)]
    public class VentasController : DbControllerBase
    {
        private const string Completada = "COMPLETADA";
        private const string Anulada = "ANULADA";
        private const int UniqueViolation = 2627;
        private const int UniqueIndexViolation = 2601;
        private const int ForeignKeyViolation = 547;

        public class VentaResumen
        {
            public int Venta_id { get; set; }
            public string Numero_factura { get; set; } = string.Empty;
            public DateTime Fecha { get; set; }
            public string Estado { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
            public string Almacen { get; set; } = string.Empty;
            public string? Cliente { get; set; }
            public string Usuario { get; set; } = string.Empty;
            public string Moneda_codigo { get; set; } = string.Empty;
            public string Moneda_simbolo { get; set; } = string.Empty;
            public decimal Subtotal { get; set; }
            public decimal Descuento_total { get; set; }
            public decimal Impuesto_total { get; set; }
            public decimal Total { get; set; }
            public string? Notas { get; set; }
        }

        public class LineaVenta
        {
            public int Producto_id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string Producto { get; set; } = string.Empty;
            public decimal Cantidad { get; set; }
            public decimal Precio_unitario { get; set; }
            public decimal Descuento_porcentaje { get; set; }
            public decimal Subtotal { get; set; }
            public decimal Porcentaje_impuesto { get; set; }
            public decimal Monto_impuesto { get; set; }
            public decimal Total_linea { get; set; }
        }

        public class VentaDetalle
        {
            public VentaResumen Venta { get; set; } = default!;
            public List<LineaVenta> Lineas { get; set; } = new();
        }

        public class ProductoPos
        {
            public int Producto_id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string Nombre { get; set; } = string.Empty;
            public string Categoria { get; set; } = string.Empty;
            public string Unidad_medida { get; set; } = string.Empty;
            public decimal Precio_venta { get; set; }
            public decimal Porcentaje_impuesto { get; set; }
            public decimal Disponible { get; set; }
        }

        public class LineaCreateDTO
        {
            [Range(1, int.MaxValue, ErrorMessage = "Producto inválido")]
            public int Producto_id { get; set; }

            [Range(0.01, 9999999999999999.99, ErrorMessage = "La cantidad debe ser mayor que 0")]
            public decimal Cantidad { get; set; }

            [Range(0, 100, ErrorMessage = "El descuento debe estar entre 0 y 100")]
            public decimal Descuento_porcentaje { get; set; }
        }

        public class VentaCreateDTO
        {
            [Range(1, int.MaxValue, ErrorMessage = "Selecciona el almacén")]
            public int Almacen_id { get; set; }

            public int? Cliente_id { get; set; }

            /// <summary>Moneda de la venta; si se omite se usa la moneda base.</summary>
            public int? Moneda_id { get; set; }

            [MaxLength(500, ErrorMessage = "Las notas admiten un máximo de 500 caracteres")]
            public string? Notas { get; set; }

            [MinLength(1, ErrorMessage = "Agrega al menos un producto")]
            public List<LineaCreateDTO> Lineas { get; set; } = new();
        }

        private sealed class ProductoVenta
        {
            public int Producto_id { get; set; }
            public string Nombre { get; set; } = string.Empty;
            public decimal Precio_venta { get; set; }
            public int Impuesto_id { get; set; }
            public decimal Porcentaje { get; set; }
        }

        private sealed class MonedaInfo
        {
            public int Moneda_id { get; set; }
            public decimal Tasa_actual { get; set; }
            public byte Decimales { get; set; }
            public bool Es_base { get; set; }
        }

        private sealed class VentaEstado
        {
            public string Estado { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
        }

        private const string SelectResumen = @"
            SELECT v.venta_id AS Venta_id, v.numero_factura AS Numero_factura, v.fecha AS Fecha, v.estado AS Estado,
                   v.almacen_id AS Almacen_id, a.nombre AS Almacen, c.nombre AS Cliente, u.nombre AS Usuario,
                   m.codigo AS Moneda_codigo, m.simbolo AS Moneda_simbolo,
                   v.subtotal AS Subtotal, v.descuento_total AS Descuento_total, v.impuesto_total AS Impuesto_total,
                   v.total AS Total, v.notas AS Notas
            FROM VENTAS v
            INNER JOIN ALMACENES a ON a.almacen_id = v.almacen_id
            INNER JOIN USUARIOS u ON u.usuario_id = v.usuario_id
            INNER JOIN MONEDAS m ON m.moneda_id = v.moneda_id
            LEFT JOIN CLIENTES c ON c.cliente_id = v.cliente_id";

        public VentasController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<VentaResumen>(
                    SelectResumen.Replace("SELECT v.venta_id", "SELECT TOP 200 v.venta_id") + " ORDER BY v.fecha DESC, v.venta_id DESC;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpGet("{venta_id:int}", Name = "GetVenta")]
        public async Task<IActionResult> GetById(int venta_id)
        {
            try
            {
                using var cn = CreateConnection();
                var d = await CargarAsync(cn, null, venta_id);
                return d is null ? NotFound($"La venta {venta_id} no existe.") : Ok(d);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        /// <summary>Productos activos con precio, impuesto y existencia disponible en un almacén.</summary>
        [HttpGet("catalogo")]
        public async Task<IActionResult> GetCatalogo([FromQuery] int almacenId)
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<ProductoPos>(@"
                    SELECT p.producto_id AS Producto_id, p.sku AS Sku, p.nombre AS Nombre, c.nombre AS Categoria,
                           p.unidad_medida AS Unidad_medida, p.precio_venta AS Precio_venta,
                           im.porcentaje AS Porcentaje_impuesto,
                           ISNULL(i.cantidad_actual - i.cantidad_reservada, 0) AS Disponible
                    FROM PRODUCTOS p
                    INNER JOIN CATEGORIAS c ON c.categoria_id = p.categoria_id
                    INNER JOIN IMPUESTOS im ON im.impuesto_id = p.impuesto_id
                    LEFT JOIN INVENTARIO i ON i.producto_id = p.producto_id AND i.almacen_id = @almacenId
                    WHERE p.activo = 1
                    ORDER BY p.nombre;", new { almacenId }));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        public async Task<IActionResult> Create(VentaCreateDTO dto)
        {
            if (dto.Lineas.GroupBy(l => l.Producto_id).Any(g => g.Count() > 1))
                return BadRequest("Hay productos repetidos. Suma sus cantidades en una sola línea.");

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                var moneda = await cn.QuerySingleOrDefaultAsync<MonedaInfo>(@"
                    SELECT TOP 1 moneda_id AS Moneda_id, tasa_actual AS Tasa_actual, decimales AS Decimales, es_base AS Es_base
                    FROM MONEDAS WHERE activo = 1 AND (@id IS NULL AND es_base = 1 OR moneda_id = @id);",
                    new { id = dto.Moneda_id }, tx);
                if (moneda is null)
                    return BadRequest(dto.Moneda_id is null
                        ? "No hay una moneda base configurada. Créala en Configuración → Monedas."
                        : "La moneda no existe o está inactiva.");

                var ids = dto.Lineas.Select(l => l.Producto_id).ToArray();
                var productos = (await cn.QueryAsync<ProductoVenta>(@"
                    SELECT p.producto_id AS Producto_id, p.nombre AS Nombre, p.precio_venta AS Precio_venta,
                           p.impuesto_id AS Impuesto_id, i.porcentaje AS Porcentaje
                    FROM PRODUCTOS p INNER JOIN IMPUESTOS i ON i.impuesto_id = p.impuesto_id
                    WHERE p.activo = 1 AND p.producto_id IN @ids;", new { ids }, tx)).ToDictionary(p => p.Producto_id);
                if (productos.Count != ids.Length)
                    return BadRequest("Algún producto no existe o está inactivo.");

                // Los precios están en moneda base; en otra moneda se dividen entre su tasa.
                decimal PrecioEn(ProductoVenta p) =>
                    moneda.Es_base ? p.Precio_venta : Math.Round(p.Precio_venta / moneda.Tasa_actual, moneda.Decimales);

                var lineas = dto.Lineas.Select(l =>
                {
                    var p = productos[l.Producto_id];
                    var precio = PrecioEn(p);
                    var bruto = l.Cantidad * precio;
                    var descuento = Math.Round(bruto * l.Descuento_porcentaje / 100m, 2);
                    var subtotal = Math.Round(bruto - descuento, 2);
                    var iva = Math.Round(subtotal * p.Porcentaje / 100m, 2);
                    return new { l, p, precio, descuento, subtotal, iva, total = subtotal + iva };
                }).ToList();

                var subtotalVenta = lineas.Sum(x => x.subtotal);
                var descuentoVenta = lineas.Sum(x => x.descuento);
                var impuestoVenta = lineas.Sum(x => x.iva);
                var totalVenta = subtotalVenta + impuestoVenta;

                var prefijo = $"F-{DateTime.UtcNow:yyyyMMdd}-";
                var n = await cn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM VENTAS WITH (UPDLOCK, HOLDLOCK) WHERE numero_factura LIKE @p;",
                    new { p = prefijo + "%" }, tx) + 1;
                var numero = prefijo + n.ToString("0000");

                var usuario = User.GetUsuarioId();
                var ventaId = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO VENTAS
                        (numero_factura, almacen_id, usuario_id, cliente_id, moneda_id, tasa_cambio, fecha, estado,
                         subtotal, descuento_total, impuesto_total, total, total_base, notas)
                    VALUES (@numero, @Almacen_id, @usuario, @Cliente_id, @monedaId, @tasa, SYSUTCDATETIME(), @estado,
                            @subtotal, @descuento, @impuesto, @total, @totalBase, @Notas);
                    SELECT CAST(SCOPE_IDENTITY() AS int);",
                    new
                    {
                        numero, dto.Almacen_id, usuario, dto.Cliente_id, monedaId = moneda.Moneda_id,
                        tasa = moneda.Es_base ? 1m : moneda.Tasa_actual, estado = Completada,
                        subtotal = subtotalVenta, descuento = descuentoVenta, impuesto = impuestoVenta, total = totalVenta,
                        totalBase = Math.Round(totalVenta * (moneda.Es_base ? 1m : moneda.Tasa_actual), 2), dto.Notas,
                    }, tx);

                foreach (var x in lineas)
                {
                    await cn.ExecuteAsync(@"
                        INSERT INTO DETALLE_VENTAS
                            (venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento_porcentaje, descuento_monto,
                             subtotal, impuesto_id, porcentaje_impuesto, monto_impuesto, total_linea)
                        VALUES (@ventaId, @Producto_id, @Nombre, @Cantidad, @precio, @Descuento_porcentaje, @descuento,
                                @subtotal, @Impuesto_id, @Porcentaje, @iva, @total);",
                        new
                        {
                            ventaId, x.l.Producto_id, x.p.Nombre, x.l.Cantidad, x.precio, x.l.Descuento_porcentaje,
                            x.descuento, x.subtotal, x.p.Impuesto_id, x.p.Porcentaje, x.iva, x.total,
                        }, tx);

                    try
                    {
                        await StockOps.AplicarAsync(cn, tx, x.l.Producto_id, dto.Almacen_id, -x.l.Cantidad);
                    }
                    catch (ExistenciaInsuficiente ex)
                    {
                        // Revierte toda la venta (la transacción no se confirma) y dice qué producto falló.
                        return Conflict($"{x.p.Nombre}: {ex.Message}");
                    }
                    await StockOps.RegistrarAsync(cn, tx, x.l.Producto_id, dto.Almacen_id, usuario,
                        "SALIDA", -x.l.Cantidad, "VENTA", ventaId);
                }

                var creada = await CargarAsync(cn, tx, ventaId);
                tx.Commit();
                return CreatedAtRoute("GetVenta", new { venta_id = ventaId }, creada);
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict("Se generó un número de factura repetido. Intenta de nuevo.");
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El almacén o el cliente no existe.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        /// <summary>Anula la venta y devuelve las existencias al almacén.</summary>
        [HttpPost("{venta_id:int}/anular")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Anular(int venta_id)
        {
            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                var venta = await cn.QuerySingleOrDefaultAsync<VentaEstado>(
                    "SELECT estado AS Estado, almacen_id AS Almacen_id FROM VENTAS WITH (UPDLOCK, HOLDLOCK) WHERE venta_id = @venta_id;",
                    new { venta_id }, tx);
                if (venta is null) return NotFound($"La venta {venta_id} no existe.");
                if (venta.Estado != Completada) return Conflict("La venta ya está anulada.");

                var detalle = await cn.QueryAsync<(int Producto_id, decimal Cantidad)>(
                    "SELECT producto_id, cantidad FROM DETALLE_VENTAS WHERE venta_id = @venta_id;", new { venta_id }, tx);

                var usuario = User.GetUsuarioId();
                foreach (var (productoId, cantidad) in detalle)
                {
                    await StockOps.AplicarAsync(cn, tx, productoId, venta.Almacen_id, cantidad);
                    await StockOps.RegistrarAsync(cn, tx, productoId, venta.Almacen_id, usuario,
                        "ENTRADA", cantidad, "VENTA", venta_id);
                }

                await cn.ExecuteAsync("UPDATE VENTAS SET estado = @anulada WHERE venta_id = @venta_id;",
                    new { anulada = Anulada, venta_id }, tx);
                tx.Commit();
                return NoContent();
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        private static async Task<VentaDetalle?> CargarAsync(System.Data.IDbConnection cn, System.Data.IDbTransaction? tx, int ventaId)
        {
            var venta = await cn.QuerySingleOrDefaultAsync<VentaResumen>(
                SelectResumen + " WHERE v.venta_id = @ventaId;", new { ventaId }, tx);
            if (venta is null) return null;

            var lineas = await cn.QueryAsync<LineaVenta>(@"
                SELECT d.producto_id AS Producto_id, p.sku AS Sku, p.nombre AS Producto, d.cantidad AS Cantidad,
                       d.precio_unitario AS Precio_unitario, d.descuento_porcentaje AS Descuento_porcentaje,
                       d.subtotal AS Subtotal, d.porcentaje_impuesto AS Porcentaje_impuesto,
                       d.monto_impuesto AS Monto_impuesto, d.total_linea AS Total_linea
                FROM DETALLE_VENTAS d INNER JOIN PRODUCTOS p ON p.producto_id = d.producto_id
                WHERE d.venta_id = @ventaId ORDER BY d.detalle_id;", new { ventaId }, tx);

            return new VentaDetalle { Venta = venta, Lineas = lineas.ToList() };
        }
    }
}
