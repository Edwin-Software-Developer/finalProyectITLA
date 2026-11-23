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
    public class AlmacenesController : DbControllerBase
    {
        private const int ForeignKeyViolation = 547;

        public AlmacenesController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<AlmacenDTO>(
                    "SELECT almacen_id AS Almacen_id, nombre AS Nombre, ubicacion AS Ubicacion FROM ALMACENES ORDER BY nombre;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> Create(AlmacenDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Almacen_id = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO ALMACENES (nombre, ubicacion) VALUES (@Nombre, @Ubicacion);
                    SELECT CAST(SCOPE_IDENTITY() AS int);", dto);
                return Created($"/api/almacenes/{dto.Almacen_id}", dto);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPut("{almacen_id:int}")]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> Update(int almacen_id, AlmacenDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Almacen_id = almacen_id;
                var filas = await cn.ExecuteAsync(
                    "UPDATE ALMACENES SET nombre = @Nombre, ubicacion = @Ubicacion WHERE almacen_id = @Almacen_id;", dto);
                return filas == 0 ? NotFound($"El almacén {almacen_id} no existe.") : NoContent();
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpDelete("{almacen_id:int}")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Delete(int almacen_id)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = await cn.ExecuteAsync("DELETE FROM ALMACENES WHERE almacen_id = @almacen_id;", new { almacen_id });
                return filas == 0 ? NotFound($"El almacén {almacen_id} no existe.") : NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return Conflict("No se puede eliminar: el almacén tiene inventario, ventas o movimientos asociados.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }
    }
}
