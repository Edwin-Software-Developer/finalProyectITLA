using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Ordenes_Compra
    {
        public int Orden_id { get; set; }

        [MaxLength(30, ErrorMessage ="El numero de orden no debe tener mas de 30 caracteres")]
        public string Numero_orden { get; set; }
        public int Proveedor_id { get; set; }
        public int Almacen_id { get; set; }
        public int Usuario_id { get; set; }
        public int Cliente_id { get; set; }
        public int Moneda_id { get; set; }

        [Range(18,6)]
        public decimal Tasa_cambio { get; set; }
        public DateTime fecha { get; set; }
        public DateTime Fecha_entrega_esperada { get; set; }

        [MaxLength(20, ErrorMessage ="El estado debe tener un maximo de 20 caracteres")]
        public string Estado { get; set; }

        [MaxLength(10, ErrorMessage = "El origen debe tener un maximo de 10 caracteres")]
        public string Origen { get; set; }

        [Range(18,2)]
        public decimal Subtotal { get; set; }

        [Range(18,2)]
        public decimal Descuento_total { get; set; }

        [Range(18,2)]
        public decimal Impuesto_total { get; set; }

        [Range(18,2)]
        public decimal Total { get; set; }

        [Range(18,2)]
        public decimal Total_base { get; set; }

        [MaxLength(500, ErrorMessage ="El maximo de caracteres para las notas es de 500")]
        public string Notas { get; set; }
    }
}
