using System.ComponentModel.DataAnnotations;
using ControlStock.Auth;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ImpuestosController : DbControllerBase
    {
        private const int UniqueViolation = 2627;
        private const int UniqueIndexViolation = 2601;
        private const int ForeignKeyViolation = 547;

        public class ImpuestoDTO
        {
            public int Impuesto_id { get; set; }

            [Required(ErrorMessage = "El código es requerido")]
            [MaxLength(20, ErrorMessage = "El código admite un máximo de 20 caracteres")]
            public string Codigo { get; set; } = string.Empty;

            [Required(ErrorMessage = "El nombre es requerido")]
            [MaxLength(100, ErrorMessage = "El nombre admite un máximo de 100 caracteres")]
            public string Nombre { get; set; } = string.Empty;

            [Range(0, 100, ErrorMessage = "El porcentaje debe estar entre 0 y 100")]
            public decimal Porcentaje { get; set; }

            public bool Activo { get; set; } = true;
        }

        public ImpuestosController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<ImpuestoDTO>(@"
                    SELECT impuesto_id AS Impuesto_id, codigo AS Codigo, nombre AS Nombre,
                           porcentaje AS Porcentaje, activo AS Activo
                    FROM IMPUESTOS ORDER BY porcentaje DESC, nombre;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Create(ImpuestoDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Impuesto_id = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO IMPUESTOS (codigo, nombre, porcentaje, activo) VALUES (@Codigo, @Nombre, @Porcentaje, @Activo);
                    SELECT CAST(SCOPE_IDENTITY() AS int);", dto);
                return Created($"/api/impuestos/{dto.Impuesto_id}", dto);
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe un impuesto con el código '{dto.Codigo}'.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPut("{impuesto_id:int}")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Update(int impuesto_id, ImpuestoDTO dto)
        {
            try
            {
                using var cn = CreateConnection();
                dto.Impuesto_id = impuesto_id;
                var filas = await cn.ExecuteAsync(@"
                    UPDATE IMPUESTOS SET codigo = @Codigo, nombre = @Nombre, porcentaje = @Porcentaje, activo = @Activo
                    WHERE impuesto_id = @Impuesto_id;", dto);
                return filas == 0 ? NotFound($"El impuesto {impuesto_id} no existe.") : NoContent();
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe otro impuesto con el código '{dto.Codigo}'.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpDelete("{impuesto_id:int}")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Delete(int impuesto_id)
        {
            try
            {
                using var cn = CreateConnection();
                var filas = await cn.ExecuteAsync("DELETE FROM IMPUESTOS WHERE impuesto_id = @impuesto_id;", new { impuesto_id });
                return filas == 0 ? NotFound($"El impuesto {impuesto_id} no existe.") : NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return Conflict("No se puede eliminar: el impuesto lo usan productos, ventas o compras. Desactívalo en su lugar.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }
    }
}
