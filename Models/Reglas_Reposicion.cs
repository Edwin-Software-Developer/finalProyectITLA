using System.ComponentModel.DataAnnotations;

namespace ControlStock.Models
{
    public class Reglas_Reposicion
    {
        public int Regla_id { get; set; }
        public int Producto_id { get; set; }
        public int Almacen_id { get; set; }

        [Range(18,2)]
        public decimal Stock_minimo { get; set; }

        [Range(18, 2)]
        public decimal Stock_maximo { get; set; }

        [Range(18, 2)]
        public decimal Stock_seguridad { get; set; }

        [Range(18, 2)]
        public decimal Punto_reorden { get; set; }

        public bool Pedido_automatico { get; set; }
    }
}
