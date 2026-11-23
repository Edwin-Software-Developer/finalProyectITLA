using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace ControlStock.Reportes
{
    public class ReplicateOptions
    {
        public const string SectionName = "Replicate";

        /// <summary>API token de Replicate. Vacío = modo simulado (sin llamar a la IA).</summary>
        public string Token { get; set; } = string.Empty;

        /// <summary>Modelo "propietario/nombre". Haiku para desarrollo, Sonnet para la demo final.</summary>
        public string Model { get; set; } = "anthropic/claude-4.5-haiku";

        public int MaxTokens { get; set; } = 2500;

        /// <summary>Tiempo máximo total esperando la predicción.</summary>
        public int TimeoutSeconds { get; set; } = 90;
    }

    /// <summary>Cliente mínimo de la API de predicciones de Replicate (texto → texto).</summary>
    public class ReplicateClient
    {
        private readonly HttpClient _http;
        private readonly ReplicateOptions _options;
        private readonly ILogger<ReplicateClient> _logger;

        public ReplicateClient(HttpClient http, IOptions<ReplicateOptions> options, ILogger<ReplicateClient> logger)
        {
            _http = http;
            _options = options.Value;
            _logger = logger;
        }

        public bool Configurado => !string.IsNullOrWhiteSpace(_options.Token);
        public string Modelo => _options.Model;

        /// <summary>Envía el prompt y devuelve el texto completo generado por el modelo.</summary>
        public async Task<string> GenerarAsync(string systemPrompt, string prompt, CancellationToken ct)
        {
            if (!Configurado) throw new InvalidOperationException("Replicate no está configurado.");

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var body = JsonSerializer.Serialize(new
            {
                input = new
                {
                    prompt,
                    system_prompt = systemPrompt,
                    max_tokens = _options.MaxTokens,
                },
            });

            using var request = new HttpRequestMessage(HttpMethod.Post, $"v1/models/{_options.Model}/predictions")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);
            // Replicate responde en la misma petición si termina antes de ~60 s.
            request.Headers.Add("Prefer", "wait");

            using var response = await _http.SendAsync(request, timeout.Token);
            var json = await response.Content.ReadAsStringAsync(timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Replicate respondió {Status}: {Body}", (int)response.StatusCode, Recortar(json));
                throw new ReplicateException($"Replicate respondió con error {(int)response.StatusCode}.");
            }

            var prediction = JsonDocument.Parse(json).RootElement.Clone();

            // Si no terminó dentro del "wait", consultamos hasta que termine o venza el timeout.
            while (true)
            {
                var status = prediction.GetProperty("status").GetString();
                if (status == "succeeded") return LeerSalida(prediction);
                if (status is "failed" or "canceled")
                {
                    var error = prediction.TryGetProperty("error", out var e) ? e.ToString() : "sin detalle";
                    _logger.LogError("Predicción {Status}: {Error}", status, error);
                    throw new ReplicateException("La IA no pudo generar el informe.");
                }

                var getUrl = prediction.GetProperty("urls").GetProperty("get").GetString()!;
                await Task.Delay(TimeSpan.FromSeconds(2), timeout.Token);

                using var poll = new HttpRequestMessage(HttpMethod.Get, getUrl);
                poll.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);
                using var pollResponse = await _http.SendAsync(poll, timeout.Token);
                var pollJson = await pollResponse.Content.ReadAsStringAsync(timeout.Token);
                if (!pollResponse.IsSuccessStatusCode)
                    throw new ReplicateException($"Replicate respondió con error {(int)pollResponse.StatusCode}.");
                prediction = JsonDocument.Parse(pollJson).RootElement.Clone();
            }
        }

        /// <summary>La salida de los modelos de texto es un string o una lista de fragmentos.</summary>
        private static string LeerSalida(JsonElement prediction)
        {
            if (!prediction.TryGetProperty("output", out var output)) return string.Empty;
            return output.ValueKind switch
            {
                JsonValueKind.String => output.GetString() ?? string.Empty,
                JsonValueKind.Array => string.Concat(output.EnumerateArray().Select(x => x.GetString())),
                _ => string.Empty,
            };
        }

        private static string Recortar(string s) => s.Length <= 500 ? s : s[..500] + "…";
    }

    public class ReplicateException : Exception
    {
        public ReplicateException(string message) : base(message) { }
    }
}
