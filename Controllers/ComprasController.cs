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
    /// Órdenes de compra. Estados: PENDIENTE → RECIBIDA_PARCIAL → RECIBIDA, o CANCELADA (solo si no se recibió nada).
    /// Recibir mercancía genera movimientos ENTRADA (referencia ORDEN_COMPRA) y suma la existencia.
    /// Los montos se calculan en el servidor: el cliente solo envía cantidades y costos.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = AppRoles.Escritura)]
    public class ComprasController : DbControllerBase
    {
        private const string Pendiente = "PENDIENTE";
        private const string Parcial = "RECIBIDA_PARCIAL";
        private const string Recibida = "RECIBIDA";
        private const string Cancelada = "CANCELADA";
        private const int UniqueViolation = 2627;
        private const int UniqueIndexViolation = 2601;
        private const int ForeignKeyViolation = 547;

        public class OrdenResumen
        {
            public int Orden_id { get; set; }
            public string Numero_orden { get; set; } = string.Empty;
            public DateTime Fecha { get; set; }
            public DateTime? Fecha_entrega_esperada { get; set; }
            public string Estado { get; set; } = string.Empty;
            public string Origen { get; set; } = string.Empty;
            public int Proveedor_id { get; set; }
            public string Proveedor { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
            public string Almacen { get; set; } = string.Empty;
            public string Moneda_codigo { get; set; } = string.Empty;
            public string Moneda_simbolo { get; set; } = string.Empty;
            public decimal Subtotal { get; set; }
            public decimal Impuesto_total { get; set; }
            public decimal Total { get; set; }
            public string? Notas { get; set; }
            public int Lineas { get; set; }
        }

        public class LineaOrden
        {
            public int Detalle_id { get; set; }
            public int Producto_id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string Producto { get; set; } = string.Empty;
            public decimal Cantidad_pedida { get; set; }
            public decimal Cantidad_recibida { get; set; }
            public decimal Costo_unitario { get; set; }
            public decimal Descuento_porcentaje { get; set; }
            public decimal Subtotal { get; set; }
            public decimal Porcentaje_impuesto { get; set; }
            public decimal Monto_impuesto { get; set; }
            public decimal Total_linea { get; set; }
        }

        public class OrdenDetalle
        {
            public OrdenResumen Orden { get; set; } = default!;
            public List<LineaOrden> Lineas { get; set; } = new();
        }

        public class LineaCreateDTO
        {
            [Range(1, int.MaxValue, ErrorMessage = "Producto inválido")]
            public int Producto_id { get; set; }

            [Range(0.01, 9999999999999999.99, ErrorMessage = "La cantidad debe ser mayor que 0")]
            public decimal Cantidad { get; set; }

            [Range(0, 9999999999999999.99, ErrorMessage = "El costo no puede ser negativo")]
            public decimal Costo_unitario { get; set; }

            [Range(0, 100, ErrorMessage = "El descuento debe estar entre 0 y 100")]
            public decimal Descuento_porcentaje { get; set; }
        }

        public class OrdenCreateDTO
        {
            [Range(1, int.MaxValue, ErrorMessage = "Selecciona un proveedor")]
            public int Proveedor_id { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "Selecciona el almacén de destino")]
            public int Almacen_id { get; set; }

            [Range(1, int.MaxValue, ErrorMessage = "Selecciona una moneda")]
            public int Moneda_id { get; set; }

            public DateTime? Fecha_entrega_esperada { get; set; }

            [MaxLength(500, ErrorMessage = "Las notas admiten un máximo de 500 caracteres")]
            public string? Notas { get; set; }

            /// <summary>MANUAL | AUTO (creada desde las sugerencias de reposición)</summary>
            [MaxLength(10)]
            public string Origen { get; set; } = "MANUAL";

            [MinLength(1, ErrorMessage = "Agrega al menos un producto")]
            public List<LineaCreateDTO> Lineas { get; set; } = new();
        }

        public class RecepcionLineaDTO
        {
            public int Detalle_id { get; set; }

            [Range(0.01, 9999999999999999.99, ErrorMessage = "La cantidad debe ser mayor que 0")]
            public decimal Cantidad { get; set; }
        }

        public class RecepcionDTO
        {
            [MinLength(1, ErrorMessage = "Indica qué recibiste")]
            public List<RecepcionLineaDTO> Lineas { get; set; } = new();
        }

        public class Sugerencia
        {
            public int Producto_id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string Nombre { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
            public string Almacen { get; set; } = string.Empty;
            public decimal Cantidad_actual { get; set; }
            public decimal Cantidad_sugerida { get; set; }
            public decimal Costo_unitario { get; set; }
            public int? Proveedor_id { get; set; }
            public string? Proveedor { get; set; }
        }

        private sealed class OrdenEstado
        {
            public string Estado { get; set; } = string.Empty;
            public int Almacen_id { get; set; }
        }

        private sealed class ProductoImpuesto
        {
            public int Producto_id { get; set; }
            public decimal Porcentaje { get; set; }
        }

        private const string SelectResumen = @"
            SELECT o.orden_id AS Orden_id, o.numero_orden AS Numero_orden, o.fecha AS Fecha,
                   o.fecha_entrega_esperada AS Fecha_entrega_esperada, o.estado AS Estado, o.origen AS Origen,
                   o.proveedor_id AS Proveedor_id, pr.nombre AS Proveedor,
                   o.almacen_id AS Almacen_id, a.nombre AS Almacen,
                   m.codigo AS Moneda_codigo, m.simbolo AS Moneda_simbolo,
                   o.subtotal AS Subtotal, o.impuesto_total AS Impuesto_total, o.total AS Total, o.notas AS Notas,
                   (SELECT COUNT(*) FROM DETALLE_ORDEN_COMPRA d WHERE d.orden_id = o.orden_id) AS Lineas
            FROM ORDENES_COMPRA o
            INNER JOIN PROVEEDORES pr ON pr.proveedor_id = o.proveedor_id
            INNER JOIN ALMACENES a ON a.almacen_id = o.almacen_id
            INNER JOIN MONEDAS m ON m.moneda_id = o.moneda_id";

        public ComprasController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<OrdenResumen>(SelectResumen + " ORDER BY o.fecha DESC, o.orden_id DESC;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpGet("{orden_id:int}", Name = "GetOrdenCompra")]
        public async Task<IActionResult> GetById(int orden_id)
        {
            try
            {
                using var cn = CreateConnection();
                var detalle = await CargarAsync(cn, null, orden_id);
                return detalle is null ? NotFound($"La orden {orden_id} no existe.") : Ok(detalle);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        /// <summary>Productos en o bajo su punto de reorden, con la cantidad para llegar al máximo.</summary>
        [HttpGet("sugerencias")]
        public async Task<IActionResult> GetSugerencias()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<Sugerencia>(@"
                    SELECT p.producto_id AS Producto_id, p.sku AS Sku, p.nombre AS Nombre,
                           a.almacen_id AS Almacen_id, a.nombre AS Almacen,
                           i.cantidad_actual AS Cantidad_actual,
                           r.stock_maximo - i.cantidad_actual AS Cantidad_sugerida,
                           p.costo_unitario AS Costo_unitario,
                           pp.proveedor_id AS Proveedor_id, pr.nombre AS Proveedor
                    FROM REGLAS_REPOSICION r
                    INNER JOIN PRODUCTOS p ON p.producto_id = r.producto_id AND p.activo = 1
                    INNER JOIN ALMACENES a ON a.almacen_id = r.almacen_id
                    INNER JOIN INVENTARIO i ON i.producto_id = r.producto_id AND i.almacen_id = r.almacen_id
                    OUTER APPLY (SELECT TOP 1 proveedor_id FROM PRODUCTO_PROVEEDOR
                                 WHERE producto_id = p.producto_id ORDER BY es_preferido DESC, precio_compra) pp
                    LEFT JOIN PROVEEDORES pr ON pr.proveedor_id = pp.proveedor_id
                    WHERE i.cantidad_actual <= r.punto_reorden AND r.stock_maximo > i.cantidad_actual
                    ORDER BY a.nombre, i.cantidad_actual / NULLIF(r.stock_minimo, 0), p.nombre;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        public async Task<IActionResult> Create(OrdenCreateDTO dto)
        {
            if (dto.Lineas.GroupBy(l => l.Producto_id).Any(g => g.Count() > 1))
                return BadRequest("Hay productos repetidos en la orden. Suma sus cantidades en una sola línea.");
            var origen = dto.Origen?.ToUpperInvariant() == "AUTO" ? "AUTO" : "MANUAL";

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                var tasa = await cn.QuerySingleOrDefaultAsync<decimal?>(
                    "SELECT tasa_actual FROM MONEDAS WHERE moneda_id = @id AND activo = 1;", new { id = dto.Moneda_id }, tx);
                if (tasa is null) return BadRequest("La moneda no existe o está inactiva.");

                // El impuesto sale del producto (no del cliente) y solo se aceptan productos activos.
                var ids = dto.Lineas.Select(l => l.Producto_id).ToArray();
                var impuestos = (await cn.QueryAsync<ProductoImpuesto>(@"
                    SELECT p.producto_id AS Producto_id, i.porcentaje AS Porcentaje
                    FROM PRODUCTOS p INNER JOIN IMPUESTOS i ON i.impuesto_id = p.impuesto_id
                    WHERE p.activo = 1 AND p.producto_id IN @ids;", new { ids }, tx)).ToDictionary(x => x.Producto_id);
                if (impuestos.Count != ids.Length)
                    return BadRequest("Algún producto no existe o está inactivo.");

                var lineas = dto.Lineas.Select(l =>
                {
                    var bruto = l.Cantidad * l.Costo_unitario;
                    var descuento = Math.Round(bruto * l.Descuento_porcentaje / 100m, 2);
                    var subtotal = Math.Round(bruto - descuento, 2);
                    var pct = impuestos[l.Producto_id].Porcentaje;
                    var iva = Math.Round(subtotal * pct / 100m, 2);
                    return new { l, descuento, subtotal, pct, iva, total = subtotal + iva };
                }).ToList();

                var subtotalOrden = lineas.Sum(x => x.subtotal);
                var descuentoOrden = lineas.Sum(x => x.descuento);
                var impuestoOrden = lineas.Sum(x => x.iva);
                var totalOrden = subtotalOrden + impuestoOrden;

                // Número consecutivo por día: OC-AAAAMMDD-0001
                var prefijo = $"OC-{DateTime.UtcNow:yyyyMMdd}-";
                var n = await cn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM ORDENES_COMPRA WITH (UPDLOCK, HOLDLOCK) WHERE numero_orden LIKE @p;",
                    new { p = prefijo + "%" }, tx) + 1;
                var numero = prefijo + n.ToString("0000");

                var ordenId = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO ORDENES_COMPRA
                        (numero_orden, proveedor_id, almacen_id, usuario_id, moneda_id, tasa_cambio, fecha, fecha_entrega_esperada,
                         estado, origen, subtotal, descuento_total, impuesto_total, total, total_base, notas)
                    VALUES (@numero, @Proveedor_id, @Almacen_id, @usuario, @Moneda_id, @tasa, SYSUTCDATETIME(), @entrega,
                            @estado, @origen, @subtotal, @descuento, @impuesto, @total, @totalBase, @Notas);
                    SELECT CAST(SCOPE_IDENTITY() AS int);",
                    new
                    {
                        numero, dto.Proveedor_id, dto.Almacen_id, usuario = User.GetUsuarioId(), dto.Moneda_id, tasa,
                        entrega = dto.Fecha_entrega_esperada?.Date, estado = Pendiente, origen,
                        subtotal = subtotalOrden, descuento = descuentoOrden, impuesto = impuestoOrden, total = totalOrden,
                        totalBase = Math.Round(totalOrden * tasa.Value, 2), dto.Notas,
                    }, tx);

                foreach (var x in lineas)
                {
                    await cn.ExecuteAsync(@"
                        INSERT INTO DETALLE_ORDEN_COMPRA
                            (orden_id, producto_id, cantidad_pedida, cantidad_recibida, costo_unitario, descuento_porcentaje,
                             descuento_monto, subtotal, impuesto_id, porcentaje_impuesto, monto_impuesto, total_linea)
                        SELECT @ordenId, @Producto_id, @Cantidad, 0, @Costo_unitario, @Descuento_porcentaje,
                               @descuento, @subtotal, p.impuesto_id, @pct, @iva, @total
                        FROM PRODUCTOS p WHERE p.producto_id = @Producto_id;",
                        new { ordenId, x.l.Producto_id, x.l.Cantidad, x.l.Costo_unitario, x.l.Descuento_porcentaje,
                              x.descuento, x.subtotal, x.pct, x.iva, x.total }, tx);
                }

                var creada = await CargarAsync(cn, tx, ordenId);
                tx.Commit();
                return CreatedAtRoute("GetOrdenCompra", new { orden_id = ordenId }, creada);
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict("Se generó un número de orden repetido. Intenta de nuevo.");
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El proveedor, el almacén o la moneda no existe.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        /// <summary>Registra una recepción (total o parcial): suma al inventario y genera movimientos ENTRADA.</summary>
        [HttpPost("{orden_id:int}/recibir")]
        public async Task<IActionResult> Recibir(int orden_id, RecepcionDTO dto)
        {
            if (dto.Lineas.GroupBy(l => l.Detalle_id).Any(g => g.Count() > 1))
                return BadRequest("Hay líneas repetidas en la recepción.");

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                var orden = await cn.QuerySingleOrDefaultAsync<OrdenEstado>(
                    "SELECT estado AS Estado, almacen_id AS Almacen_id FROM ORDENES_COMPRA WITH (UPDLOCK, HOLDLOCK) WHERE orden_id = @orden_id;",
                    new { orden_id }, tx);
                if (orden is null) return NotFound($"La orden {orden_id} no existe.");
                if (orden.Estado is not (Pendiente or Parcial))
                    return Conflict($"La orden está {orden.Estado.ToLowerInvariant().Replace('_', ' ')} y no admite recepciones.");

                var detalles = (await cn.QueryAsync<LineaOrden>(@"
                    SELECT detalle_id AS Detalle_id, producto_id AS Producto_id,
                           cantidad_pedida AS Cantidad_pedida, cantidad_recibida AS Cantidad_recibida
                    FROM DETALLE_ORDEN_COMPRA WHERE orden_id = @orden_id;", new { orden_id }, tx))
                    .ToDictionary(d => d.Detalle_id);

                var usuario = User.GetUsuarioId();
                foreach (var l in dto.Lineas)
                {
                    if (!detalles.TryGetValue(l.Detalle_id, out var d))
                        return BadRequest("Una de las líneas no pertenece a esta orden.");
                    var pendiente = d.Cantidad_pedida - d.Cantidad_recibida;
                    if (l.Cantidad > pendiente)
                        return BadRequest($"Solo quedan {pendiente:0.##} unidades por recibir en una de las líneas.");

                    await cn.ExecuteAsync(
                        "UPDATE DETALLE_ORDEN_COMPRA SET cantidad_recibida = cantidad_recibida + @cantidad WHERE detalle_id = @id;",
                        new { cantidad = l.Cantidad, id = l.Detalle_id }, tx);
                    d.Cantidad_recibida += l.Cantidad;

                    await StockOps.AplicarAsync(cn, tx, d.Producto_id, orden.Almacen_id, l.Cantidad);
                    await StockOps.RegistrarAsync(cn, tx, d.Producto_id, orden.Almacen_id, usuario,
                        "ENTRADA", l.Cantidad, "ORDEN_COMPRA", orden_id);
                }

                var completa = detalles.Values.All(d => d.Cantidad_recibida >= d.Cantidad_pedida);
                await cn.ExecuteAsync("UPDATE ORDENES_COMPRA SET estado = @estado WHERE orden_id = @orden_id;",
                    new { estado = completa ? Recibida : Parcial, orden_id }, tx);

                tx.Commit();
                return NoContent();
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost("{orden_id:int}/cancelar")]
        public async Task<IActionResult> Cancelar(int orden_id)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = await cn.ExecuteAsync(
                    "UPDATE ORDENES_COMPRA SET estado = @cancelada WHERE orden_id = @orden_id AND estado = @pendiente;",
                    new { cancelada = Cancelada, pendiente = Pendiente, orden_id });
                if (filas > 0) return NoContent();

                var existe = await cn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM ORDENES_COMPRA WHERE orden_id = @orden_id;", new { orden_id });
                return existe == 0
                    ? NotFound($"La orden {orden_id} no existe.")
                    : Conflict("Solo se pueden cancelar órdenes pendientes que no hayan recibido mercancía.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        private static async Task<OrdenDetalle?> CargarAsync(System.Data.IDbConnection cn, System.Data.IDbTransaction? tx, int ordenId)
        {
            var orden = await cn.QuerySingleOrDefaultAsync<OrdenResumen>(
                SelectResumen + " WHERE o.orden_id = @ordenId;", new { ordenId }, tx);
            if (orden is null) return null;

            var lineas = await cn.QueryAsync<LineaOrden>(@"
                SELECT d.detalle_id AS Detalle_id, d.producto_id AS Producto_id, p.sku AS Sku, p.nombre AS Producto,
                       d.cantidad_pedida AS Cantidad_pedida, d.cantidad_recibida AS Cantidad_recibida,
                       d.costo_unitario AS Costo_unitario, d.descuento_porcentaje AS Descuento_porcentaje,
                       d.subtotal AS Subtotal, d.porcentaje_impuesto AS Porcentaje_impuesto,
                       d.monto_impuesto AS Monto_impuesto, d.total_linea AS Total_linea
                FROM DETALLE_ORDEN_COMPRA d INNER JOIN PRODUCTOS p ON p.producto_id = d.producto_id
                WHERE d.orden_id = @ordenId ORDER BY d.detalle_id;", new { ordenId }, tx);

            return new OrdenDetalle { Orden = orden, Lineas = lineas.ToList() };
        }
    }
}
