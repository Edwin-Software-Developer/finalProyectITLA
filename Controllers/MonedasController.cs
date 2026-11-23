using System.ComponentModel.DataAnnotations;
using ControlStock.Auth;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    /// <summary>Monedas y tasas de cambio. Debe existir exactamente una moneda base (tasa 1).</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MonedasController : DbControllerBase
    {
        private const int UniqueViolation = 2627;
        private const int UniqueIndexViolation = 2601;

        public class MonedaDTO
        {
            public int Moneda_id { get; set; }

            [Required(ErrorMessage = "El código es requerido")]
            [RegularExpression("^[A-Za-z]{3}$", ErrorMessage = "El código debe tener 3 letras (ej. DOP)")]
            public string Codigo { get; set; } = string.Empty;

            [Required(ErrorMessage = "El nombre es requerido")]
            [MaxLength(50, ErrorMessage = "El nombre admite un máximo de 50 caracteres")]
            public string Nombre { get; set; } = string.Empty;

            [Required(ErrorMessage = "El símbolo es requerido")]
            [MaxLength(5, ErrorMessage = "El símbolo admite un máximo de 5 caracteres")]
            public string Simbolo { get; set; } = string.Empty;

            [Range(0, 6, ErrorMessage = "Los decimales deben estar entre 0 y 6")]
            public byte Decimales { get; set; } = 2;

            public bool Es_base { get; set; }

            [Range(0.000001, 999999999999.0, ErrorMessage = "La tasa debe ser mayor que 0")]
            public decimal Tasa_actual { get; set; } = 1;

            public bool Activo { get; set; } = true;
        }

        public MonedasController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        private const string Select = @"
            SELECT moneda_id AS Moneda_id, codigo AS Codigo, nombre AS Nombre, simbolo AS Simbolo,
                   decimales AS Decimales, es_base AS Es_base, tasa_actual AS Tasa_actual, activo AS Activo
            FROM MONEDAS";

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                using var cn = CreateConnection();
                return Ok(await cn.QueryAsync<MonedaDTO>(Select + " ORDER BY es_base DESC, codigo;"));
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPost]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Create(MonedaDTO dto)
        {
            dto.Codigo = dto.Codigo.ToUpperInvariant();
            if (dto.Es_base) dto.Tasa_actual = 1;

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                if (dto.Es_base)
                    await cn.ExecuteAsync("UPDATE MONEDAS SET es_base = 0 WHERE es_base = 1;", transaction: tx);

                dto.Moneda_id = await cn.ExecuteScalarAsync<int>(@"
                    INSERT INTO MONEDAS (codigo, nombre, simbolo, decimales, es_base, tasa_actual, activo)
                    VALUES (@Codigo, @Nombre, @Simbolo, @Decimales, @Es_base, @Tasa_actual, @Activo);
                    SELECT CAST(SCOPE_IDENTITY() AS int);", dto, tx);

                await RegistrarTasaAsync(cn, tx, dto.Moneda_id, dto.Tasa_actual);
                tx.Commit();
                return Created($"/api/monedas/{dto.Moneda_id}", dto);
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe una moneda con el código '{dto.Codigo}'.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        [HttpPut("{moneda_id:int}")]
        [Authorize(Roles = AppRoles.Administrador)]
        public async Task<IActionResult> Update(int moneda_id, MonedaDTO dto)
        {
            dto.Codigo = dto.Codigo.ToUpperInvariant();
            dto.Moneda_id = moneda_id;
            if (dto.Es_base) dto.Tasa_actual = 1;

            try
            {
                using var cn = CreateConnection();
                cn.Open();
                using var tx = cn.BeginTransaction();

                var actual = await cn.QuerySingleOrDefaultAsync<MonedaDTO>(
                    Select + " WHERE moneda_id = @moneda_id;", new { moneda_id }, tx);
                if (actual is null) return NotFound($"La moneda {moneda_id} no existe.");

                if (actual.Es_base && !dto.Es_base)
                    return BadRequest("Debe existir una moneda base. Marca otra como base en su lugar.");
                if (actual.Es_base && !dto.Activo)
                    return BadRequest("La moneda base no se puede desactivar.");

                if (dto.Es_base && !actual.Es_base)
                    await cn.ExecuteAsync("UPDATE MONEDAS SET es_base = 0 WHERE es_base = 1;", transaction: tx);

                await cn.ExecuteAsync(@"
                    UPDATE MONEDAS
                    SET codigo = @Codigo, nombre = @Nombre, simbolo = @Simbolo, decimales = @Decimales,
                        es_base = @Es_base, tasa_actual = @Tasa_actual, activo = @Activo
                    WHERE moneda_id = @Moneda_id;", dto, tx);

                // Cada cambio de tasa queda en el historial.
                if (dto.Tasa_actual != actual.Tasa_actual)
                    await RegistrarTasaAsync(cn, tx, moneda_id, dto.Tasa_actual);

                tx.Commit();
                return NoContent();
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe otra moneda con el código '{dto.Codigo}'.");
            }
            catch (Exception ex) { return ServerError(ex); }
        }

        private Task RegistrarTasaAsync(System.Data.IDbConnection cn, System.Data.IDbTransaction tx, int monedaId, decimal tasa) =>
            cn.ExecuteAsync(@"
                INSERT INTO TASAS_CAMBIO (moneda_id, fecha, tasa, fuente, usuario_id)
                VALUES (@monedaId, SYSUTCDATETIME(), @tasa, N'Manual', @usuarioId);",
                new { monedaId, tasa, usuarioId = User.GetUsuarioId() }, tx);
    }
}
