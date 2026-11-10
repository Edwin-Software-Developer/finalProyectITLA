using System.ComponentModel.DataAnnotations;

namespace ControlStock.Dtos
{
    public class ProductoCreateDTO
    {
        [Required(ErrorMessage = "El SKU es requerido")]
        [MaxLength(50, ErrorMessage = "El SKU admite un máximo de 50 caracteres")]
        public string Sku { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre es requerido")]
        [MaxLength(150, ErrorMessage = "El nombre admite un máximo de 150 caracteres")]
        public string Nombre { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona una categoría")]
        public int Categoria_id { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un impuesto")]
        public int Impuesto_id { get; set; }

        [Required(ErrorMessage = "La unidad de medida es requerida")]
        [MaxLength(20, ErrorMessage = "La unidad de medida admite un máximo de 20 caracteres")]
        public string Unidad_medida { get; set; } = string.Empty;

        [Range(0, 9999999999999999.99, ErrorMessage = "El costo no puede ser negativo")]
        public decimal Costo_unitario { get; set; }

        [Range(0, 9999999999999999.99, ErrorMessage = "El precio no puede ser negativo")]
        public decimal Precio_venta { get; set; }

        public bool Activo { get; set; } = true;
    }
}
