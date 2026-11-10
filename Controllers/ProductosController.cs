using ControlStock.Dtos;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductosController : DbControllerBase
    {
        // Códigos de error de SQL Server
        private const int UniqueViolation = 2627;      // restricción UNIQUE (constraint)
        private const int UniqueIndexViolation = 2601; // índice único
        private const int ForeignKeyViolation = 547;

        private const string SelectProductos = @"
            SELECT p.producto_id  AS Producto_id,
                   p.sku          AS Sku,
                   p.nombre       AS Nombre,
                   p.categoria_id AS Categoria_id,
                   c.nombre       AS Categoria,
                   p.impuesto_id  AS Impuesto_id,
                   i.nombre       AS Impuesto,
                   p.unidad_medida AS Unidad_medida,
                   p.costo_unitario AS Costo_unitario,
                   p.precio_venta AS Precio_venta,
                   p.activo       AS Activo
            FROM PRODUCTOS p
            INNER JOIN CATEGORIAS c ON c.categoria_id = p.categoria_id
            INNER JOIN IMPUESTOS  i ON i.impuesto_id  = p.impuesto_id";

        public ProductosController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> GetProductos()
        {
            try
            {
                using var connection = CreateConnection();
                var productos = await connection.QueryAsync<ProductoDTO>(
                    SelectProductos + " ORDER BY p.nombre;");
                return Ok(productos);
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpGet("{producto_id:int}", Name = "GetProducto")]
        public async Task<IActionResult> GetProducto(int producto_id)
        {
            try
            {
                using var connection = CreateConnection();
                var producto = await connection.QuerySingleOrDefaultAsync<ProductoDTO>(
                    SelectProductos + " WHERE p.producto_id = @producto_id;", new { producto_id });

                return producto is null
                    ? NotFound($"El producto con el id {producto_id} no fue encontrado.")
                    : Ok(producto);
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateProducto(ProductoCreateDTO nuevo)
        {
            try
            {
                using var connection = CreateConnection();
                const string insert = @"
                    INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
                    VALUES (@Sku, @Nombre, @Categoria_id, @Impuesto_id, @Unidad_medida, @Costo_unitario, @Precio_venta, @Activo);
                    SELECT CAST(SCOPE_IDENTITY() AS int);";

                int producto_id = await connection.ExecuteScalarAsync<int>(insert, nuevo);
                var creado = await connection.QuerySingleAsync<ProductoDTO>(
                    SelectProductos + " WHERE p.producto_id = @producto_id;", new { producto_id });

                return CreatedAtRoute("GetProducto", new { producto_id }, creado);
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe un producto con el SKU '{nuevo.Sku}'.");
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("La categoría o el impuesto seleccionado no existe.");
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpPut("{producto_id:int}")]
        public async Task<IActionResult> UpdateProducto(int producto_id, ProductoUpdateDTO producto)
        {
            if (producto_id != producto.Producto_id)
            {
                return BadRequest("El id de la ruta no coincide con el del producto.");
            }

            try
            {
                using var connection = CreateConnection();
                const string update = @"
                    UPDATE PRODUCTOS
                    SET sku = @Sku,
                        nombre = @Nombre,
                        categoria_id = @Categoria_id,
                        impuesto_id = @Impuesto_id,
                        unidad_medida = @Unidad_medida,
                        costo_unitario = @Costo_unitario,
                        precio_venta = @Precio_venta,
                        activo = @Activo
                    WHERE producto_id = @Producto_id;";

                int filas = await connection.ExecuteAsync(update, producto);
                return filas == 0
                    ? NotFound($"El producto con el id {producto_id} no existe.")
                    : NoContent();
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe otro producto con el SKU '{producto.Sku}'.");
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("La categoría o el impuesto seleccionado no existe.");
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpDelete("{producto_id:int}")]
        public async Task<IActionResult> DeleteProducto(int producto_id)
        {
            try
            {
                using var connection = CreateConnection();
                int filas = await connection.ExecuteAsync(
                    "DELETE FROM PRODUCTOS WHERE producto_id = @producto_id;", new { producto_id });

                return filas == 0
                    ? NotFound($"El producto con el id {producto_id} no existe.")
                    : NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return Conflict("No se puede eliminar: el producto tiene inventario, ventas u órdenes asociadas. Desactívalo en su lugar.");
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }
    }
}
