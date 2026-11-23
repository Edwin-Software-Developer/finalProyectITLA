using ControlStock.Auth;
using ControlStock.Dtos;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProveedoresController : DbControllerBase
    {
        private const int ForeignKeyViolation = 547;

        public ProveedoresController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<ProveedorDTO>(@"
                    SELECT proveedor_id AS Proveedor_id, nombre AS Nombre, email AS Email,
                           telefono AS Telefono, activo AS Activo
                    FROM PROVEEDORES ORDER BY nombre;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> Create(ProveedorDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Proveedor_id = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO PROVEEDORES (nombre, email, telefono, activo) VALUES (@Nombre, @Email, @Telefono, @Activo);
                    SELECT CAST(SCOPE_IDENTITY() AS int);", dto);
                return Created($"/api/proveedores/{dto.Proveedor_id}", dto);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPut("{proveedor_id:int}")]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> Update(int proveedor_id, ProveedorDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Proveedor_id = proveedor_id;
                var filas = await cn.ExecuteAsync(@"
                    UPDATE PROVEEDORES SET nombre = @Nombre, email = @Email, telefono = @Telefono, activo = @Activo
                    WHERE proveedor_id = @Proveedor_id;", dto);
                return filas == 0 ? NotFound($"El proveedor {proveedor_id} no existe.") : NoContent();
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpDelete("{proveedor_id:int}")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Delete(int proveedor_id)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = await cn.ExecuteAsync("DELETE FROM PROVEEDORES WHERE proveedor_id = @proveedor_id;", new { proveedor_id });
                return filas == 0 ? NotFound($"El proveedor {proveedor_id} no existe.") : NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return Conflict("No se puede eliminar: el proveedor tiene órdenes de compra o productos asociados. Desactívalo en su lugar.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }
    }
}
