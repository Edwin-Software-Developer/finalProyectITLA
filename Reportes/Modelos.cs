using System.Text.Json.Serialization;

namespace ControlStock.Reportes
{
    // ---------- Datos calculados por el backend (la IA NO calcula nada) ----------

    public record KpisInventario(
        int ProductosActivos,
        decimal UnidadesEnStock,
        decimal ValorInventarioCosto,
        int ProductosBajoMinimo,
        int ProductosSobrestock,
        int ProductosSinVentas90d,
        decimal UnidadesVendidas90d);

    public record ItemStock(string Producto, string Sku, string Almacen, decimal Cantidad, decimal Referencia);

    public record ItemVenta(string Producto, string Sku, decimal UnidadesVendidas, decimal StockActual, decimal? DiasDeCobertura);

    public record ItemCategoria(string Categoria, decimal Unidades, decimal ValorCosto);

    public record DatosInventario(
        DateTime GeneradoEn,
        KpisInventario Kpis,
        IReadOnlyList<ItemStock> BajoMinimo,
        IReadOnlyList<ItemStock> Sobrestock,
        IReadOnlyList<ItemVenta> MasVendidos,
        IReadOnlyList<ItemVenta> SinMovimiento,
        IReadOnlyList<ItemCategoria> PorCategoria);

    // ---------- JSON que redacta la IA ----------

    public class InformeIA
    {
        [JsonPropertyName("titulo")] public string Titulo { get; set; } = string.Empty;
        [JsonPropertyName("resumen_ejecutivo")] public string ResumenEjecutivo { get; set; } = string.Empty;
        [JsonPropertyName("hallazgos")] public List<Hallazgo> Hallazgos { get; set; } = new();
        [JsonPropertyName("recomendaciones")] public List<Recomendacion> Recomendaciones { get; set; } = new();
    }

    public class Hallazgo
    {
        /// <summary>quiebre | sobrestock | rotacion | general</summary>
        [JsonPropertyName("tipo")] public string Tipo { get; set; } = "general";
        [JsonPropertyName("producto")] public string? Producto { get; set; }
        [JsonPropertyName("detalle")] public string Detalle { get; set; } = string.Empty;
    }

    public class Recomendacion
    {
        /// <summary>alta | media | baja</summary>
        [JsonPropertyName("prioridad")] public string Prioridad { get; set; } = "media";
        [JsonPropertyName("accion")] public string Accion { get; set; } = string.Empty;
    }

    // ---------- Respuesta final de la API (y entrada del endpoint de PDF) ----------

    public class InformeInventarioDto
    {
        public DateTime GeneradoEn { get; set; }
        /// <summary>Modelo de Replicate usado, o "simulado" si no hay token configurado.</summary>
        public string Modelo { get; set; } = string.Empty;
        public bool Simulado { get; set; }
        public DatosInventario Datos { get; set; } = default!;
        public InformeIA Informe { get; set; } = default!;
    }
}
