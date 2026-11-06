using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Almacenes
    {
        public int Almacen_id { get; set; }

        [MaxLength(100,ErrorMessage ="El maximo de caracteres para este campo es de 100")]
        public string Nombre { get; set; }

        [MaxLength(200, ErrorMessage = "El maximo de caracteres para este campo es de 200")]

        public string Ubicacion { get; set; }
    }
}
