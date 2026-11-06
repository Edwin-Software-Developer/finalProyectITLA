using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Tasas_Cambio
    {
        public int Tasa_id { get; set; }
        public int Moneda_id { get; set; }
        public DateTime datetime2 { get; set; } = DateTime.UtcNow;

        [Range(18,6)]
        public decimal Tasa { get; set; }

        [Required(ErrorMessage = "La fuente es requerido")]
        public string Fuente { get; set; }
        public int Usuario_id { get; set; }
    }
}
