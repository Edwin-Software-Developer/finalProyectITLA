namespace ControlStock.Models
{
    public class Impuestos
    {
        public int Impuesto_id { get; set; }
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public decimal Porcentaje { get; set; }
        public bool Activo { get; set; }
    }
}
