using ControlStock.Models;

namespace ControlStock.Dtos
{
    public class ProductoUpdateDTO
    {
        public int Producto_id { get; set; }
        public string Sku { get; set; }
        public string Nombre { get; set; }
        public int Unidad_medida { get; set; }
        public decimal Costo_unitario { get; set; }
        public decimal Presio_venta { get; set; }
        public bool activo { get; set; }
    }
}
