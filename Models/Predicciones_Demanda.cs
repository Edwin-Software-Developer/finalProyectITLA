namespace ControlStock.Models
{
    public class Predicciones_Demanda
    {
        public int Prediccion_id { get; set; }
        public int Producto_id { get; set; }
        public int Almacen_id { get; set; }
        public int Modelo_id { get; set; }
        public DateTime Fecha_objetivo { get; set; }
        public decimal Demanda_prevista { get; set; }
        public decimal Limite_inferior { get; set; }
        public decimal Limite_superior { get; set; }
        public DateTime Generado_en { get; set; }
    }
}
