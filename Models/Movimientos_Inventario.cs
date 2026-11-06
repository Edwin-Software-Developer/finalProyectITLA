using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Movimientos_Inventario
    {
        public int Movimiento_id { get; set; }
        public int Producto_id { get; set; }
        public int Almacen_id { get; set; }

        [MaxLength(20, ErrorMessage ="El maximo de caracteres para este campo es de 20")]
        public string Tipo { get; set; }

        [Range(18,2)]
        public decimal Cantidad { get; set; }

        [MaxLength(30, ErrorMessage ="El maximo de caracteres para este campo es de 30")]
        public string Referencia_tipo { get; set; }

        public int Referencia_id { get; set; }
        public DateTime Fecha { get; set; }
    }
}
