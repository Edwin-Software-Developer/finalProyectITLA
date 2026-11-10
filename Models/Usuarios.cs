namespace ControlStock.Models
{
    public class Usuarios
    {
        public int Usuario_id { get; set; }
        public int Rol_id { get; set; }
        public string Nombre { get; set; }
        public string Email { get; set; }
        public string Password_Hash { get; set; }
        public bool Activo { get; set; }
        public DateTime Creado_en { get; set; } = DateTime.UtcNow;

    }
}
