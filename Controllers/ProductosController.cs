using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using Microsoft.Data.Sql;
using Microsoft.Data.SqlClient;
using Dapper;
using ControlStock.Models;
using System.Data.Common;
using ControlStock.Dtos;

namespace ControlStock.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductosController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;
        public ProductosController(IConfiguration configuration)
        {
            _configuration = configuration;
            _connectionString = _configuration.GetConnectionString("ConexionSQL") ?? throw new InvalidOperationException("Connection string does not found");
        }

        [HttpGet()]
        public async Task<IActionResult> GetProductos()
        {
            try
            {
                using IDbConnection connection = new SqlConnection(_connectionString);

                string query = "select * from PRODUCTOS;";
                var producto = await connection.QueryAsync<Producto>(query);
                return Ok(producto);
            }catch(Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpGet("{Producto_id}", Name="GetProducto")]
        public async Task<IActionResult> GetProducto(int Producto_id)
        {
            try
            {
                using IDbConnection connection = new SqlConnection(_connectionString);

                string query = "select * from PRODUCTOS where Producto_id = @Producto_id";
                Producto producto = await connection.QuerySingleOrDefaultAsync<Producto>(query, new { Producto_id });
            
                if(producto is null)
                {
                    return NotFound($"El producto con el id: {Producto_id} no fue encontrado.");
                }
                return Ok(producto);
            }
            catch(Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateProducto(Producto producto)
        {
            try
            {
                using IDbConnection connection = new SqlConnection(_connectionString);
                string query = @"
                    INSERT INTO PRODUCTOS (sku, nombre, categoria_id, impuesto_id, unidad_medida, costo_unitario, precio_venta, activo)
                    VALUES (@Sku, @Nombre, @Categoria_id, @Impuesto_id, @Unidad_medida, @Costo_unitario, @Precio_venta, @Activo);
                    SELECT SCOPE_IDENTITY();";
                int createdId = connection.ExecuteScalar<int>(query, producto);
                Producto ProductoCreado = new()
                {
                    Producto_id = createdId,
                    Sku = producto.Sku,
                    Nombre = producto.Nombre,
                    Categoria_id = producto.Categoria_id,
                    Impuesto_id = producto.Impuesto_id,
                    Unidad_medida = producto.Unidad_medida,
                    Costo_unitario = producto.Costo_unitario,
                    Precio_venta = producto.Precio_venta,
                    activo = producto.activo
                };
                return CreatedAtRoute("GetProducto", new { id = createdId }, ProductoCreado);
            }
            catch(Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpPut("{Producto_id}")]
        public async Task<IActionResult> UpdateProducto(ProductoUpdateDTO productoupdate, int Producto_id)
        {
            if (Producto_id != productoupdate.Producto_id)
            {
                return BadRequest("El id no coincide");
            }
            try
            {
                using IDbConnection connection = new SqlConnection(_connectionString);

                int ProductoExiste = await connection.ExecuteScalarAsync<int>("select count(1) from PRODUCTOS where Producto_id=@Producto_id", new { Producto_id });

                if (ProductoExiste == 0)
                {
                    return NotFound($"El producto con el id:{Producto_id} no existe");
                }
                string updateQuery = @"
                update PRODUCTOS
                set Sku=@Sku,
                Nombre=@Nombre,   
                Unidad_medida=@Unidad_medida,
                Costo_unitario=@Costo_unitario,
                Precio_venta=@Presio_venta,
                activo=@activo
                where producto_id=@producto_id;
                ";
                await connection.ExecuteAsync(updateQuery, productoupdate);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpDelete("{Producto_id}")]
        public async Task<IActionResult> DeleteProducto(int Producto_id)
        {

            try
            {
                using IDbConnection connection = new SqlConnection(_connectionString);

                int ProductoExiste = await connection.ExecuteScalarAsync<int>("select count(1) from PRODUCTOS where Producto_id=@Producto_id", new { Producto_id });

                
                if (ProductoExiste == 0)
                {
                    return NotFound($"El producto con este id:{Producto_id} no existe");
                }
                string deletequery = "delete from PRODUCTOS where Producto_id=@Producto_id;";
                await connection.ExecuteAsync(deletequery, new { Producto_id });
                return NoContent();
            }
            catch (Exception ex) 
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }

        }

    }
}
