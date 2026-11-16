using System.ComponentModel.DataAnnotations;

namespace ControlStock.Dtos
{
    public record LoginRequest(
        [Required, EmailAddress, StringLength(150)] string Email,
        [Required, StringLength(72)] string Password);

    public record UsuarioActual(int Id, string Nombre, string Email, string Rol);

    public record LoginResponse(string Token, DateTime ExpiresAt, UsuarioActual Usuario);

    /// <summary>Usuario tal como se lista en la administración (nunca incluye el hash).</summary>
    public class UsuarioDTO
    {
        public int Usuario_id { get; set; }
        public int Rol_id { get; set; }
        public string Rol { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public DateTime Creado_en { get; set; }
    }

    public class UsuarioCreateDTO
    {
        [Required, StringLength(100)] public string Nombre { get; set; } = string.Empty;
        [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = string.Empty;
        [Required, StringLength(72, MinimumLength = 8)] public string Password { get; set; } = string.Empty;
        [Range(1, int.MaxValue)] public int Rol_id { get; set; }
    }

    public class UsuarioUpdateDTO
    {
        [Required, StringLength(100)] public string Nombre { get; set; } = string.Empty;
        [Range(1, int.MaxValue)] public int Rol_id { get; set; }
        public bool Activo { get; set; } = true;

        /// <summary>Opcional: si viene, reemplaza la contraseña actual.</summary>
        [StringLength(72, MinimumLength = 8)] public string? Password { get; set; }
    }
}
