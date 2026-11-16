using ControlStock.Auth;
using ControlStock.Dtos;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ControlStock.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : DbControllerBase
    {
        // Hash de relleno: se verifica cuando el email no existe para que el tiempo
        // de respuesta no revele si la cuenta existe.
        private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("relleno-no-valido", 11);

        private readonly ITokenService _tokens;

        public AuthController(IConfiguration configuration, IHostEnvironment environment, ITokenService tokens)
            : base(configuration, environment) => _tokens = tokens;

        private sealed class UsuarioLogin
        {
            public int Usuario_id { get; set; }
            public string Nombre { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password_hash { get; set; } = string.Empty;
            public bool Activo { get; set; }
            public string Rol { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            try
            {
                var email = request.Email.Trim().ToLowerInvariant();

                using var connection = CreateConnection();
                var usuario = await connection.QuerySingleOrDefaultAsync<UsuarioLogin>(@"
                    SELECT u.usuario_id AS Usuario_id, u.nombre AS Nombre, u.email AS Email,
                           u.password_hash AS Password_hash, u.activo AS Activo, r.nombre AS Rol
                    FROM USUARIOS u
                    INNER JOIN ROLES r ON r.rol_id = u.rol_id
                    WHERE u.email = @email;", new { email });

                var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, usuario?.Password_hash ?? DummyHash);

                if (usuario is null || !passwordOk || !usuario.Activo)
                {
                    return Unauthorized("Correo o contraseña incorrectos.");
                }

                var (token, expiresAt) = _tokens.CreateToken(usuario.Usuario_id, usuario.Nombre, usuario.Email, usuario.Rol);
                return Ok(new LoginResponse(token, expiresAt,
                    new UsuarioActual(usuario.Usuario_id, usuario.Nombre, usuario.Email, usuario.Rol)));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }

        /// <summary>Datos del usuario del token. El frontend lo usa para validar la sesión guardada.</summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            try
            {
                var id = User.GetUsuarioId();
                using var connection = CreateConnection();
                var usuario = await connection.QuerySingleOrDefaultAsync<UsuarioLogin>(@"
                    SELECT u.usuario_id AS Usuario_id, u.nombre AS Nombre, u.email AS Email,
                           u.password_hash AS Password_hash, u.activo AS Activo, r.nombre AS Rol
                    FROM USUARIOS u
                    INNER JOIN ROLES r ON r.rol_id = u.rol_id
                    WHERE u.usuario_id = @id;", new { id });

                // Cuenta eliminada o desactivada después de emitir el token.
                if (usuario is null || !usuario.Activo) return Unauthorized();

                return Ok(new UsuarioActual(usuario.Usuario_id, usuario.Nombre, usuario.Email, usuario.Rol));
            }
            catch (Exception ex)
            {
                return ServerError(ex);
            }
        }
    }
}
