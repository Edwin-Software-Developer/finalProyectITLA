namespace ControlStock.Dtos
{
    /// <summary>Producto tal como se muestra en el listado (incluye nombres de categoría e impuesto).</summary>
    public class ProductoDTO
    {
        public int Producto_id { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public int Categoria_id { get; set; }
        public string Categoria { get; set; } = string.Empty;
        public int Impuesto_id { get; set; }
        public string Impuesto { get; set; } = string.Empty;
        public string Unidad_medida { get; set; } = string.Empty;
        public decimal Costo_unitario { get; set; }
        public decimal Precio_venta { get; set; }
        public bool Activo { get; set; }
    }
}
