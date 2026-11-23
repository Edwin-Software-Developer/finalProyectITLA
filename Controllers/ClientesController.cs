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
    public class ClientesController : DbControllerBase
    {
        private const int ForeignKeyViolation = 547;

        public ClientesController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<ClienteDTO>(@"
                    SELECT cliente_id AS Cliente_id, nombre AS Nombre, documento AS Documento, email AS Email,
                           telefono AS Telefono, direccion AS Direccion, activo AS Activo
                    FROM CLIENTES ORDER BY nombre;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> Create(ClienteDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Cliente_id = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO CLIENTES (nombre, documento, email, telefono, direccion, activo)
                    VALUES (@Nombre, @Documento, @Email, @Telefono, @Direccion, @Activo);
                    SELECT CAST(SCOPE_IDENTITY() AS int);", dto);
                return Created($"/api/clientes/{dto.Cliente_id}", dto);
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPut("{cliente_id:int}")]
        [Authorize(Roles = AppRoles.Escritura)]
        public async Task<IActionResult> Update(int cliente_id, ClienteDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Cliente_id = cliente_id;
                var filas = await cn.ExecuteAsync(@"
                    UPDATE CLIENTES SET nombre = @Nombre, documento = @Documento, email = @Email,
                                        telefono = @Telefono, direccion = @Direccion, activo = @Activo
                    WHERE cliente_id = @Cliente_id;", dto);
                return filas == 0 ? NotFound($"El cliente {cliente_id} no existe.") : NoContent();
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpDelete("{cliente_id:int}")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Delete(int cliente_id)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = await cn.ExecuteAsync("DELETE FROM CLIENTES WHERE cliente_id = @cliente_id;", new { cliente_id });
                return filas == 0 ? NotFound($"El cliente {cliente_id} no existe.") : NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return Conflict("No se puede eliminar: el cliente tiene ventas asociadas. Desactívalo en su lugar.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }
    }
}
