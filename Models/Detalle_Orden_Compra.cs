using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Detalle_Orden_Compra
    {
        public int Detalle_id { get; set; }
        public int Orden_id { get; set; }
        public int Producto_id { get; set; }

        [Required(ErrorMessage = "La descripcion es requerida")]
        public string Descripcion { get; set; }

        [Range(18,2)]
        public decimal Cantidad_perdida { get; set; }

        [Range(18, 2)]
        public decimal Cantidad_recibida { get; set; }

        [Range(18, 4)]
        public decimal Costo_unitario { get; set; }

        [Range(5, 2)]
        public decimal Descuento_porcentaje { get; set; }

        [Range(18, 2)]
        public decimal Descuento_monto { get; set; }

        [Range(18, 2)]
        public decimal Subtotal { get; set; }

        public int Impuesto_id { get; set; }

        [Range(5,2)]
        public decimal Porcentaje_impuesto { get; set; }

        [Range(18, 2)]
        public decimal Monto_impuesto { get; set; }

        [Range(18, 2)]
        public decimal Total_linea { get; set; }
    }
}
