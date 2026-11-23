using ControlStock.Reportes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ControlStock.Controllers
{
    /// <summary>Informes de inventario redactados por IA (Replicate) y exportables a PDF.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportesController : ControllerBase
    {
        private readonly InformeBuilder _builder;
        private readonly InformeIAService _ia;
        private readonly ILogger<ReportesController> _logger;

        public ReportesController(InformeBuilder builder, InformeIAService ia, ILogger<ReportesController> logger)
        {
            _builder = builder;
            _ia = ia;
            _logger = logger;
        }

        /// <summary>Calcula las cifras, pide a la IA el análisis y devuelve todo como JSON.</summary>
        [HttpPost("inventario")]
        [EnableRateLimiting("reportes")]
        public async Task<IActionResult> GenerarInventario(CancellationToken ct)
        {
            try
            {
                var datos = await _builder.ConstruirAsync(ct);
                var informe = await _ia.GenerarAsync(datos, ct);
                return Ok(informe);
            }
            catch (ReplicateException ex)
            {
                return StatusCode(StatusCodes.Status502BadGateway, ex.Message);
            }
            catch (TaskCanceledException) when (!ct.IsCancellationRequested)
            {
                return StatusCode(StatusCodes.Status504GatewayTimeout, "La IA tardó demasiado en responder. Intenta de nuevo.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "No se pudo contactar a Replicate");
                return StatusCode(StatusCodes.Status502BadGateway, "No se pudo contactar al servicio de IA.");
            }
            catch (Microsoft.Data.SqlClient.SqlException ex)
            {
                _logger.LogError(ex, "Error de base de datos al armar el informe");
                return StatusCode(StatusCodes.Status500InternalServerError, "Error al acceder a la base de datos.");
            }
        }

        /// <summary>Convierte un informe ya generado en PDF (no vuelve a llamar a la IA).</summary>
        [HttpPost("inventario/pdf")]
        public IActionResult ExportarPdf([FromBody] InformeInventarioDto dto)
        {
            if (dto?.Datos is null || dto.Informe is null)
                return BadRequest("El informe está incompleto.");

            var pdf = InformePdf.Generar(dto);
            return File(pdf, "application/pdf", $"informe-inventario-{DateTime.Now:yyyyMMdd-HHmm}.pdf");
        }
    }
}
