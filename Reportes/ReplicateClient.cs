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

        /// <summary>Modelo "propietario/nombre" de Replicate.</summary>
        public string Model { get; set; } = "anthropic/claude-4.5-haiku";

        public int MaxTokens { get; set; } = 2500;

        /// <summary>
        /// Parámetros adicionales del modelo (nombre → valor en JSON), p. ej. { "reasoning_effort": "\"low\"" }.
        /// Solo se envían los que la versión actual del modelo declara en su esquema.
        /// </summary>
        public Dictionary<string, string> ParametrosExtra { get; set; } = new();

        /// <summary>Pide al modelo salida JSON (response_format) si lo admite. Apagado por defecto: ver ConstruirCuerpoAsync.</summary>
        public bool ForzarJson { get; set; } = false;

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

            var body = await ConstruirCuerpoAsync(systemPrompt, prompt, timeout.Token);

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
                throw new ReplicateException((int)response.StatusCode switch
                {
                    401 => "El token de Replicate no es válido. Avisa al administrador del sistema.",
                    402 => "La cuenta de Replicate no tiene saldo suficiente. Avisa al administrador del sistema.",
                    422 => "Replicate rechazó los parámetros enviados al modelo.",
                    429 => "Replicate está limitando las solicitudes. Intenta de nuevo en un momento.",
                    _ => $"Replicate respondió con error {(int)response.StatusCode}.",
                });
            }

            var prediction = JsonDocument.Parse(json).RootElement.Clone();

            // Si no terminó dentro del "wait", consultamos hasta que termine o venza el timeout.
            while (true)
            {
                var status = prediction.GetProperty("status").GetString();
                if (status == "succeeded")
                {
                    var salida = LeerSalida(prediction);
                    if (string.IsNullOrWhiteSpace(salida))
                    {
                        // Salida vacía aunque Replicate dice "succeeded": dejar rastro (logs y métricas) para diagnosticar.
                        var logs = prediction.TryGetProperty("logs", out var l) ? l.ToString() : "";
                        var metricas = prediction.TryGetProperty("metrics", out var m) ? m.ToString() : "";
                        _logger.LogWarning("Replicate devolvió salida vacía. Métricas: {Metricas}. Logs: {Logs}",
                            metricas, logs.Length <= 1200 ? logs : logs[^1200..]);
                    }
                    return salida;
                }
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

        // Campos de entrada que acepta la versión actual del modelo (se consulta una vez y se recuerda).
        private HashSet<string>? _camposEntrada;

        /// <summary>
        /// Los modelos de texto de Replicate no comparten esquema: unos reciben "messages" (chat) y otros
        /// "prompt" + "system_prompt"; el tope de tokens es "max_tokens" o "max_completion_tokens". Se lee el
        /// esquema de la versión más reciente del modelo y se arma la entrada con lo que realmente acepta.
        /// </summary>
        private async Task<string> ConstruirCuerpoAsync(string systemPrompt, string prompt, CancellationToken ct)
        {
            var campos = await ObtenerCamposEntradaAsync(ct);
            var input = new Dictionary<string, object>();

            // Se prefiere "prompt" + "system_prompt": con "messages" Replicate devuelve el sobre completo de la API
            // de chat (y con el razonamiento apagado, el contenido llega vacío). Medido con ibm-granite/granite-4.2-8b.
            if (!campos.Contains("prompt") && campos.Contains("messages"))
            {
                input["messages"] = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = prompt },
                };
            }
            else
            {
                input["prompt"] = prompt;
                input["system_prompt"] = systemPrompt;
            }

            // Preferir el campo vigente; si no se pudo leer el esquema, el clásico.
            if (campos.Contains("max_completion_tokens")) input["max_completion_tokens"] = _options.MaxTokens;
            else input["max_tokens"] = _options.MaxTokens;

            // Respuestas consistentes: baja temperatura solo si el modelo la admite.
            if (campos.Contains("temperature")) input["temperature"] = 0.2;

            foreach (var (nombre, valorJson) in _options.ParametrosExtra)
            {
                if (!campos.Contains(nombre)) continue;
                try { input[nombre] = JsonDocument.Parse(valorJson).RootElement.Clone(); }
                catch (JsonException) { _logger.LogWarning("ParametrosExtra:{Nombre} no es JSON válido", nombre); }
            }

            // Opcional (ForzarJson): salida JSON forzada si el modelo la soporta. Con ibm-granite/granite-4.2-8b,
            // forzar JSON o apagar el razonamiento (reasoning_effort/include_reasoning) devolvió contenido vacío,
            // por eso no se tocan los parámetros de razonamiento. El servidor valida el esquema de todos modos.
            if (_options.ForzarJson && campos.Contains("response_format"))
                input["response_format"] = new { type = "json_object" };

            return JsonSerializer.Serialize(new { input });
        }

        private async Task<HashSet<string>> ObtenerCamposEntradaAsync(CancellationToken ct)
        {
            if (_camposEntrada is not null) return _camposEntrada;

            var campos = new HashSet<string>();
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"v1/models/{_options.Model}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);
                using var response = await _http.SendAsync(request, ct);
                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                    if (doc.RootElement.TryGetProperty("latest_version", out var version) &&
                        version.ValueKind == JsonValueKind.Object &&
                        version.TryGetProperty("openapi_schema", out var schema) &&
                        schema.TryGetProperty("components", out var comp) &&
                        comp.GetProperty("schemas").TryGetProperty("Input", out var inputSchema) &&
                        inputSchema.TryGetProperty("properties", out var props))
                    {
                        foreach (var p in props.EnumerateObject()) campos.Add(p.Name);
                    }
                }
                else
                {
                    _logger.LogWarning("No se pudo leer el esquema de {Modelo}: HTTP {Status}", _options.Model, (int)response.StatusCode);
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException)
            {
                _logger.LogWarning(ex, "No se pudo leer el esquema de {Modelo}", _options.Model);
            }

            // Solo se recuerda si se obtuvo algo; si no, se reintenta en la próxima llamada.
            if (campos.Count > 0) _camposEntrada = campos;
            return campos;
        }

        /// <summary>La salida de los modelos de texto es un string o una lista de fragmentos.</summary>
        private static string LeerSalida(JsonElement prediction)
        {
            if (!prediction.TryGetProperty("output", out var output)) return string.Empty;
            var texto = output.ValueKind switch
            {
                JsonValueKind.String => output.GetString() ?? string.Empty,
                JsonValueKind.Array => string.Concat(output.EnumerateArray().Select(x => x.GetString())),
                _ => string.Empty,
            };
            return DesenvolverSobreChat(texto);
        }

        /// <summary>
        /// Algunos modelos devuelven el sobre de la API de chat ({"choices":[{"message":{"content":...}}]}) en lugar
        /// del texto. Si es el caso, se extrae el contenido; si no, el texto se devuelve tal cual.
        /// </summary>
        internal static string DesenvolverSobreChat(string texto)
        {
            var t = texto.TrimStart();
            if (!t.StartsWith('{') || !t.Contains("\"choices\"")) return texto;
            try
            {
                using var doc = JsonDocument.Parse(t);
                var msg = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
                foreach (var campo in new[] { "content", "reasoning_content", "reasoning" })
                {
                    if (msg.TryGetProperty(campo, out var c) && c.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(c.GetString()))
                        return c.GetString()!;
                }
                return string.Empty;
            }
            catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException)
            {
                return texto;
            }
        }

        private static string Recortar(string s) => s.Length <= 500 ? s : s[..500] + "…";
    }

    public class ReplicateException : Exception
    {
        public ReplicateException(string message) : base(message) { }
    }
}
