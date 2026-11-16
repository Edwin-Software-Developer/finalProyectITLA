namespace ControlStock.Auth
{
    /// <summary>Nombres de rol (deben coincidir con ROLES.nombre en la base de datos).</summary>
    public static class AppRoles
    {
        public const string Administrador = "Administrador";
        public const string Operador = "Operador";
        public const string Consulta = "Consulta";

        /// <summary>Roles que pueden crear y modificar datos.</summary>
        public const string Escritura = Administrador + "," + Operador;

        public static readonly (string Nombre, string Descripcion)[] Todos =
        {
            (Administrador, "Acceso total, incluida la gestión de usuarios"),
            (Operador, "Registra y modifica productos, inventario y movimientos"),
            (Consulta, "Solo lectura: consulta de datos, dashboard y reportes"),
        };
    }
}
