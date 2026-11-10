namespace ControlStock.Models
{
    public class Producto
    {
        public int Producto_id { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public int Categoria_id { get; set; }
        public int Impuesto_id { get; set; }
        public int Unidad_medida {get;set;}
        public decimal Costo_unitario { get; set; }
        public decimal Precio_venta { get; set; }
        public bool activo { get; set; }
    }
}
