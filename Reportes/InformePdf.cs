using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ControlStock.Reportes
{
    /// <summary>Convierte el informe (cifras + texto de la IA) en un PDF.</summary>
    public static class InformePdf
    {
        private static readonly CultureInfo Cultura = new("es-DO");
        private const string Azul = "#1E3A8A";
        private const string GrisTexto = "#475569";
        private const string GrisLinea = "#E2E8F0";

        static InformePdf()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static byte[] Generar(InformeInventarioDto dto)
        {
            var d = dto.Datos;
            var k = d.Kpis;

            return Document.Create(doc =>
            {
                doc.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36);
                    page.DefaultTextStyle(t => t.FontSize(10).FontColor("#0F172A"));

                    page.Header().PaddingBottom(10).Column(col =>
                    {
                        col.Item().Text("ControlStock").FontSize(9).FontColor(GrisTexto).SemiBold();
                        col.Item().Text(dto.Informe.Titulo).FontSize(18).Bold().FontColor(Azul);
                        col.Item().Text($"Generado el {dto.GeneradoEn.ToLocalTime().ToString("dd/MM/yyyy HH:mm", Cultura)}" +
                                        (dto.Simulado ? " · contenido simulado" : $" · modelo {dto.Modelo}"))
                            .FontSize(8).FontColor(GrisTexto);
                    });

                    page.Content().Column(col =>
                    {
                        col.Spacing(12);

                        col.Item().Row(row =>
                        {
                            row.Spacing(8);
                            Kpi(row, "Productos activos", k.ProductosActivos.ToString("N0", Cultura));
                            Kpi(row, "Unidades en stock", k.UnidadesEnStock.ToString("N0", Cultura));
                            Kpi(row, "Valor a costo", k.ValorInventarioCosto.ToString("N2", Cultura));
                            Kpi(row, "Bajo mínimo", k.ProductosBajoMinimo.ToString("N0", Cultura));
                            Kpi(row, "Sobrestock", k.ProductosSobrestock.ToString("N0", Cultura));
                        });

                        Seccion(col, "Resumen ejecutivo");
                        col.Item().Text(dto.Informe.ResumenEjecutivo).LineHeight(1.35f);

                        Seccion(col, "Hallazgos");
                        foreach (var h in dto.Informe.Hallazgos)
                        {
                            col.Item().Text(t =>
                            {
                                t.Span($"[{h.Tipo.ToUpperInvariant()}] ").Bold().FontColor(ColorTipo(h.Tipo));
                                if (!string.IsNullOrWhiteSpace(h.Producto)) t.Span(h.Producto + ": ").SemiBold();
                                t.Span(h.Detalle);
                            });
                        }

                        Seccion(col, "Recomendaciones");
                        var n = 1;
                        foreach (var r in dto.Informe.Recomendaciones)
                        {
                            col.Item().Text(t =>
                            {
                                t.Span($"{n++}. ").Bold();
                                t.Span($"({r.Prioridad.ToUpperInvariant()}) ").Bold().FontColor(ColorPrioridad(r.Prioridad));
                                t.Span(r.Accion);
                            });
                        }

                        TablaStock(col, "Productos por debajo del stock mínimo", "Mínimo", d.BajoMinimo);
                        TablaStock(col, "Productos en sobrestock", "Máximo", d.Sobrestock);
                        TablaVentas(col, "Más vendidos (últimos 90 días)", d.MasVendidos);
                        TablaVentas(col, "Sin ventas en 90 días", d.SinMovimiento);
                        TablaCategorias(col, d.PorCategoria);
                    });

                    page.Footer().AlignCenter().Text(t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(8).FontColor(GrisTexto));
                        t.Span("Página ");
                        t.CurrentPageNumber();
                        t.Span(" de ");
                        t.TotalPages();
                    });
                });
            }).GeneratePdf();
        }

        private static void Kpi(RowDescriptor row, string etiqueta, string valor)
        {
            row.RelativeItem().Border(1).BorderColor(GrisLinea).Padding(6).Column(c =>
            {
                c.Item().Text(etiqueta).FontSize(7).FontColor(GrisTexto);
                c.Item().Text(valor).FontSize(13).Bold().FontColor(Azul);
            });
        }

        private static void Seccion(ColumnDescriptor col, string titulo)
        {
            col.Item().PaddingTop(4).BorderBottom(1).BorderColor(GrisLinea).PaddingBottom(2)
                .Text(titulo).FontSize(12).Bold().FontColor(Azul);
        }

        private static void TablaStock(ColumnDescriptor col, string titulo, string refEtiqueta, IReadOnlyList<ItemStock> items)
        {
            if (items.Count == 0) return;
            Seccion(col, titulo);
            col.Item().Table(t =>
            {
                t.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(4); c.RelativeColumn(2); c.RelativeColumn(3); c.RelativeColumn(1.4f); c.RelativeColumn(1.4f);
                });
                Encabezado(t, "Producto", "SKU", "Almacén", "Stock", refEtiqueta);
                foreach (var i in items)
                    Fila(t, i.Producto, i.Sku, i.Almacen, i.Cantidad.ToString("N0", Cultura), i.Referencia.ToString("N0", Cultura));
            });
        }

        private static void TablaVentas(ColumnDescriptor col, string titulo, IReadOnlyList<ItemVenta> items)
        {
            if (items.Count == 0) return;
            Seccion(col, titulo);
            col.Item().Table(t =>
            {
                t.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(4); c.RelativeColumn(2); c.RelativeColumn(1.6f); c.RelativeColumn(1.6f); c.RelativeColumn(1.8f);
                });
                Encabezado(t, "Producto", "SKU", "Vendidas", "Stock", "Cobertura (días)");
                foreach (var i in items)
                    Fila(t, i.Producto, i.Sku, i.UnidadesVendidas.ToString("N0", Cultura), i.StockActual.ToString("N0", Cultura),
                        i.DiasDeCobertura?.ToString("N0", Cultura) ?? "—");
            });
        }

        private static void TablaCategorias(ColumnDescriptor col, IReadOnlyList<ItemCategoria> items)
        {
            if (items.Count == 0) return;
            Seccion(col, "Inventario por categoría");
            col.Item().Table(t =>
            {
                t.ColumnsDefinition(c => { c.RelativeColumn(4); c.RelativeColumn(2); c.RelativeColumn(2); });
                Encabezado(t, "Categoría", "Unidades", "Valor a costo");
                foreach (var i in items)
                    Fila(t, i.Categoria, i.Unidades.ToString("N0", Cultura), i.ValorCosto.ToString("N2", Cultura));
            });
        }

        private static void Encabezado(TableDescriptor t, params string[] textos)
        {
            t.Header(h =>
            {
                foreach (var texto in textos)
                    h.Cell().Background(Azul).Padding(4).Text(texto).FontSize(8).Bold().FontColor(Colors.White);
            });
        }

        private static void Fila(TableDescriptor t, params string[] celdas)
        {
            foreach (var celda in celdas)
                t.Cell().BorderBottom(1).BorderColor(GrisLinea).Padding(4).Text(celda).FontSize(8.5f);
        }

        private static string ColorTipo(string tipo) => tipo switch
        {
            "quiebre" => "#B91C1C",
            "sobrestock" => "#B45309",
            "rotacion" => "#0369A1",
            _ => GrisTexto,
        };

        private static string ColorPrioridad(string prioridad) => prioridad switch
        {
            "alta" => "#B91C1C",
            "media" => "#B45309",
            _ => "#15803D",
        };
    }
}
