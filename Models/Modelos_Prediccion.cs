using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Modelos_Prediccion
    {
        public int Modelo_id { get; set; }

        [Required(ErrorMessage = "El nombre es requerido")]
        public string Nombre { get; set; }

        [Required(ErrorMessage = "El algoritmo es requerido")]
        public string Algoritmo { get; set; }

        [Required(ErrorMessage = "El version es requerido")]
        public string Version { get; set; }

        [Range(18,4)]
        public decimal Error_mae { get; set; }

        public DateTime Entrenado_en { get; set; }
    }
}
