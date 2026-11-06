using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Producto_Proveedor
    {
        public int Producto_id { get; set; }
        public int Proveedor_id { get; set; }
        public int Moneda_id { get; set; }

        [Range(18,4)]
        public decimal Precio_compra { get; set; }
        public int Lead_time_dias { get; set; }
        public int Cantidad_minima { get; set; }
        public bool es_preferido { get; set; }
    }
}
