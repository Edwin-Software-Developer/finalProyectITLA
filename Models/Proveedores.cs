using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Proveedores
    {
        public int Proveedor_id { get; set; }

        [MaxLength(150, ErrorMessage ="El maximo de caracteres para el nombre es de 150")]
        public string Nombre { get; set; }

        [MaxLength(150, ErrorMessage = "El maximo de caracteres para el Email es de 150")]
        public string Email { get; set; }

        [MaxLength(30, ErrorMessage ="El maximo de caracteres para el telefono es de 30")]
        public string Telefono { get; set; }

        public int Moneda_id { get; set; }
        public bool Activo { get; set; }
    }
}
