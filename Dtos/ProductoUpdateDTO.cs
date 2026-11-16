using System.ComponentModel.DataAnnotations;

namespace ControlStock.Dtos
{
    public class ProductoUpdateDTO : ProductoCreateDTO
    {
        [Range(1, int.MaxValue)]
        public int Producto_id { get; set; }
    }
}
