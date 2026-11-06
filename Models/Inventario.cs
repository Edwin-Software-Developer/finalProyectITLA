using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Inventario
    {
        public int almacen_id { get; set; }
        public int Producto_id { get; set; }

        [Range(18,2)]
        public decimal Cantidad_actual { get; set; }

        [Range(18, 2)]
        public decimal Cantidad_reservada { get; set; }

        public DateTime Actualizado_en { get; set; }
    }
}
