using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Ventas
    {
        public int Venta_id { get; set; }

        [MaxLength(30, ErrorMessage ="El maximo de caracteres para el numero de factura")]
        public string Numero_factura { get; set; }

        public int Almacen_id { get; set; }
        public int Usuario_id { get; set; }
        public int Cliente_id { get; set; }
        public int Modena_id { get; set; }

        [Range(18,6)]
        public decimal Tasa_cambio { get; set; }
        public DateTime Fecha { get; set; }

        [MaxLength(20, ErrorMessage ="El maximo de caracteres para este campo es de 20")]
        public string Estado { get; set; }

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
