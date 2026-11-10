using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Clientes
    {
        public int Cliente_id { get; set; }
        
        [Required (ErrorMessage ="El nombre es requerido")]
        public string Nombre { get; set; }

        [Required (ErrorMessage ="El Documento es requerido")]
        public string Documento { get; set; }

        [Required(ErrorMessage = "El Email es requerido")]
        public string Email { get; set; }

        [Required(ErrorMessage = "El Telefono es requerido")]
        public string Telefono { get; set; }

        [Required(ErrorMessage = "La Direccion  es requerido")]
        public string Direccion { get; set; }

        public bool Activo { get; set; }
    }
}
