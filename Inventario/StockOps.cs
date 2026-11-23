using System.Data;
using Dapper;

namespace ControlStock.Inventario
{
    /// <summary>La existencia no alcanza para el movimiento pedido (HTTP 409).</summary>
    public sealed class ExistenciaInsuficiente : Exception
    {
        public ExistenciaInsuficiente(string message) : base(message) { }
    }

    /// <summary>
    /// Operaciones de stock compartidas por Movimientos, Compras y Ventas. Siempre se llaman dentro de una
    /// transacción abierta por el llamador. Convención: MOVIMIENTOS_INVENTARIO.cantidad es el cambio con signo.
    /// </summary>
    public static class StockOps
    {
        private sealed class Existencia
        {
            public decimal Actual { get; set; }
            public decimal Reservada { get; set; }
        }

        /// <summary>
        /// Suma <paramref name="delta"/> a la existencia. Rechaza dejarla por debajo de lo reservado
        /// y crea la fila de INVENTARIO si un producto recibe su primera entrada en el almacén.
        /// </summary>
        public static async Task AplicarAsync(IDbConnection cn, IDbTransaction tx, int productoId, int almacenId, decimal delta)
        {
            var filas = await cn.ExecuteAsync(@"
                UPDATE INVENTARIO
                SET cantidad_actual = cantidad_actual + @delta, actualizado_en = SYSUTCDATETIME()
                WHERE almacen_id = @almacenId AND producto_id = @productoId
                  AND cantidad_actual + @delta >= cantidad_reservada;",
                new { delta, almacenId, productoId }, tx);
            if (filas > 0) return;

            var actual = await cn.QuerySingleOrDefaultAsync<Existencia>(@"
                SELECT cantidad_actual AS Actual, cantidad_reservada AS Reservada FROM INVENTARIO WITH (UPDLOCK, HOLDLOCK)
                WHERE almacen_id = @almacenId AND producto_id = @productoId;",
                new { almacenId, productoId }, tx);

            if (actual is null)
            {
                if (delta < 0)
                    throw new ExistenciaInsuficiente("No hay existencias de este producto en el almacén.");

                await cn.ExecuteAsync(@"
                    INSERT INTO INVENTARIO (almacen_id, producto_id, cantidad_actual, cantidad_reservada, actualizado_en)
                    VALUES (@almacenId, @productoId, @delta, 0, SYSUTCDATETIME());",
                    new { almacenId, productoId, delta }, tx);
                return;
            }

            var disponible = actual.Actual - actual.Reservada;
            throw new ExistenciaInsuficiente($"Existencia insuficiente: hay {disponible:0.##} disponibles (sin contar lo reservado).");
        }

        public static Task<long> RegistrarAsync(
            IDbConnection cn, IDbTransaction tx, int productoId, int almacenId, int usuarioId,
            string tipo, decimal cantidad, string? referenciaTipo, int? referenciaId) =>
            cn.ExecuteScalarAsync<long>(@"
                INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, almacen_id, usuario_id, tipo, cantidad, referencia_tipo, referencia_id, fecha)
                VALUES (@productoId, @almacenId, @usuarioId, @tipo, @cantidad, @referenciaTipo, @referenciaId, SYSUTCDATETIME());
                SELECT CAST(SCOPE_IDENTITY() AS bigint);",
                new { productoId, almacenId, usuarioId, tipo, cantidad, referenciaTipo, referenciaId }, tx);
    }
}
