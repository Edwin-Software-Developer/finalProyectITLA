using Dapper;
using Microsoft.Data.SqlClient;

namespace ControlStock.Auth
{
    /// <summary>
    /// Al arrancar: garantiza que existan los roles y, si no hay ningún usuario,
    /// crea el administrador inicial con las credenciales de la sección "Seed".
    /// La contraseña NO está en el repositorio: vive en appsettings.Local.json o en variables de entorno.
    /// </summary>
    public static class DbSeeder
    {
        public static async Task SeedAsync(IConfiguration configuration, ILogger logger)
        {
            var connectionString = configuration.GetConnectionString("ConexionSQL");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                logger.LogWarning("Seed omitido: no hay cadena de conexión 'ConexionSQL'.");
                return;
            }

            try
            {
                await using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();

                foreach (var (nombre, descripcion) in AppRoles.Todos)
                {
                    await connection.ExecuteAsync(@"
                        IF NOT EXISTS (SELECT 1 FROM ROLES WHERE nombre = @nombre)
                            INSERT INTO ROLES (nombre, descripcion) VALUES (@nombre, @descripcion);",
                        new { nombre, descripcion });
                }

                var hayUsuarios = await connection.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM USUARIOS;") > 0;
                if (hayUsuarios) return;

                var email = configuration["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
                var password = configuration["Seed:AdminPassword"];
                var nombreAdmin = configuration["Seed:AdminNombre"] ?? "Administrador";

                if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password))
                {
                    logger.LogWarning(
                        "No hay usuarios y falta 'Seed:AdminEmail' / 'Seed:AdminPassword'. " +
                        "Configúralos en appsettings.Local.json para crear el administrador inicial.");
                    return;
                }

                if (password.Length < 8)
                {
                    logger.LogWarning("Seed:AdminPassword debe tener al menos 8 caracteres. No se creó el administrador.");
                    return;
                }

                await connection.ExecuteAsync(@"
                    INSERT INTO USUARIOS (rol_id, nombre, email, password_hash, activo, creado_en)
                    SELECT rol_id, @nombre, @email, @hash, 1, SYSUTCDATETIME()
                    FROM ROLES WHERE nombre = @rol;",
                    new
                    {
                        nombre = nombreAdmin,
                        email,
                        hash = BCrypt.Net.BCrypt.HashPassword(password, 11),
                        rol = AppRoles.Administrador,
                    });

                logger.LogInformation("Administrador inicial creado: {Email}", email);
            }
            catch (Exception ex)
            {
                // La API debe poder arrancar aunque la base no esté disponible.
                logger.LogWarning(ex, "No se pudo ejecutar el seed de roles/usuarios (¿tablas creadas y base accesible?).");
            }
        }
    }
}
