namespace ControlStock.Models
{
    public class Categorias
    {
        public int Categoria_Id { get; set; }
        public string Nombre { get; set; }

        public int Categoria_padre_id { get; set; }
    }
}
