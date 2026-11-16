using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ControlStock.Controllers
{
    /// <summary>
    /// Base común de los controladores que consultan SQL Server:
    /// centraliza la conexión y el manejo de errores de base de datos.
    /// </summary>
    public abstract class DbControllerBase : ControllerBase
    {
        private readonly string _connectionString;
        private readonly IHostEnvironment _environment;

        protected DbControllerBase(IConfiguration configuration, IHostEnvironment environment)
        {
            _connectionString = configuration.GetConnectionString("ConexionSQL")
                ?? throw new InvalidOperationException("Falta la cadena de conexión 'ConexionSQL' en appsettings.");
            _environment = environment;
        }

        protected IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        /// <summary>Respuesta 500. El detalle técnico solo se expone en Development.</summary>
        protected ObjectResult ServerError(Exception ex)
        {
            var mensaje = _environment.IsDevelopment()
                ? $"Error al acceder a la base de datos: {ex.Message}"
                : "Error al acceder a la base de datos.";
            return StatusCode(StatusCodes.Status500InternalServerError, mensaje);
        }
    }
}
