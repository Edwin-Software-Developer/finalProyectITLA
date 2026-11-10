using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Roles
    {
        public int Rol_id { get; set; }
        [Required]
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
    }
}
