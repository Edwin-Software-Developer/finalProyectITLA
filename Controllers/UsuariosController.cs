using ControlStock.Auth;
using ControlStock.Dtos;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    /// <summary>Administración de usuarios y roles. Solo para administradores.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = AppRoles.Administrador)]
    public class UsuariosController : DbControllerBase
    {
        private const int UniqueViolation = 2627;
        private const int UniqueIndexViolation = 2601;
        private const int ForeignKeyViolation = 547;

        public record RolDTO(int Id, string Nombre, string? Descripcion);

        private sealed class EstadoUsuario
        {
            public int Rol_id { get; set; }
            public bool Activo { get; set; }
        }

        private const string SelectUsuarios = @"
            SELECT u.usuario_id AS Usuario_id, u.rol_id AS Rol_id, r.nombre AS Rol,
                   u.nombre AS Nombre, u.email AS Email, u.activo AS Activo, u.creado_en AS Creado_en
            FROM USUARIOS u
            INNER JOIN ROLES r ON r.rol_id = u.rol_id";

        public UsuariosController(IConfiguration configuration, IHostEnvironment environment)
            : base(configuration, environment) { }

        [HttpGet]
        public async Task<IActionResult> GetUsuarios()
        {
            try
            {
                using var connection = CreateConnection();
                return Ok(await connection.QueryAsync<UsuarioDTO>(SelectUsuarios + " ORDER BY u.nombre;"));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            try
            {
                using var connection = CreateConnection();
                var roles = await connection.QueryAsync<RolDTO>(
                    "SELECT rol_id AS Id, nombre AS Nombre, descripcion AS Descripcion FROM ROLES ORDER BY rol_id;");
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpGet("{usuario_id:int}", Name = "GetUsuario")]
        public async Task<IActionResult> GetUsuario(int usuario_id)
        {
            try
            {
                using var connection = CreateConnection();
                var usuario = await connection.QuerySingleOrDefaultAsync<UsuarioDTO>(
                    SelectUsuarios + " WHERE u.usuario_id = @usuario_id;", new { usuario_id });
                return usuario is null ? NotFound($"El usuario {usuario_id} no existe.") : Ok(usuario);
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateUsuario(UsuarioCreateDTO nuevo)
        {
            var email = nuevo.Email.Trim().ToLowerInvariant();
            try
            {
                using var connection = CreateConnection();
                int usuario_id = await connection.ExecuteScalarAsync<int>(@"
                    INSERT INTO USUARIOS (rol_id, nombre, email, password_hash, activo, creado_en)
                    VALUES (@Rol_id, @Nombre, @Email, @Hash, 1, SYSUTCDATETIME());
                    SELECT CAST(SCOPE_IDENTITY() AS int);",
                    new
                    {
                        nuevo.Rol_id,
                        Nombre = nuevo.Nombre.Trim(),
                        Email = email,
                        Hash = BCrypt.Net.BCrypt.HashPassword(nuevo.Password, 11),
                    });

                var creado = await connection.QuerySingleAsync<UsuarioDTO>(
                    SelectUsuarios + " WHERE u.usuario_id = @usuario_id;", new { usuario_id });
                return CreatedAtRoute("GetUsuario", new { usuario_id }, creado);
            }
            catch (SqlException ex) when (ex.Number is UniqueViolation or UniqueIndexViolation)
            {
                return Conflict($"Ya existe un usuario con el correo '{email}'.");
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El rol seleccionado no existe.");
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        [HttpPut("{usuario_id:int}")]
        public async Task<IActionResult> UpdateUsuario(int usuario_id, UsuarioUpdateDTO cambios)
        {
            try
            {
                using var connection = CreateConnection();

                var actual = await connection.QuerySingleOrDefaultAsync<EstadoUsuario>(
                    "SELECT rol_id AS Rol_id, activo AS Activo FROM USUARIOS WHERE usuario_id = @usuario_id;", new { usuario_id });
                if (actual is null) return NotFound($"El usuario {usuario_id} no existe.");

                // Evita que el administrador se bloquee a sí mismo.
                if (usuario_id == User.GetUsuarioId() && (!cambios.Activo || cambios.Rol_id != actual.Rol_id))
                {
                    return BadRequest("No puedes desactivar tu propia cuenta ni cambiar tu propio rol.");
                }

                await connection.ExecuteAsync(@"
                    UPDATE USUARIOS
                    SET nombre = @Nombre,
                        rol_id = @Rol_id,
                        activo = @Activo,
                        password_hash = COALESCE(@Hash, password_hash)
                    WHERE usuario_id = @usuario_id;",
                    new
                    {
                        usuario_id,
                        Nombre = cambios.Nombre.Trim(),
                        cambios.Rol_id,
                        cambios.Activo,
                        Hash = string.IsNullOrEmpty(cambios.Password)
                            ? null
                            : BCrypt.Net.BCrypt.HashPassword(cambios.Password, 11),
                    });

                return NoContent();
            }
            catch (SqlException ex) when (ex.Number == ForeignKeyViolation)
            {
                return BadRequest("El rol seleccionado no existe.");
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }
    }
}
