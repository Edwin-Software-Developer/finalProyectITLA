using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Monedas
    {
        public int Monada_id { get; set; }
        [Required(ErrorMessage = "El codigo es requerido")]
        public string Codigo { get; set; }

        [Required(ErrorMessage = "El simbolo es requerido")]
        public char Simbolo { get; set; }
        public decimal Decimales { get; set; }
        public bool Es_base { get; set; }
        public decimal Tasa_actual { get; set; }
        public bool Activo { get; set; }
    }
}
