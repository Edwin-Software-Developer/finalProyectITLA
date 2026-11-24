using System.Text;
using System.Threading.RateLimiting;
using ControlStock.Auth;
using ControlStock.Reportes;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Configuración local no versionada (cadena de conexión a la nube, credenciales del seed, etc.).
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// ---- Controllers / Swagger ----
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Pega el token JWT devuelto por POST /api/auth/login.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        },
    });
});

// ---- Autenticación JWT ----
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || Encoding.UTF8.GetByteCount(jwt.Key) < 32)
{
    throw new InvalidOperationException(
        "Falta 'Jwt:Key' o es demasiado corta (mínimo 32 caracteres). " +
        "Defínela en appsettings.Local.json o en la variable de entorno Jwt__Key.");
}

builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // conservamos los nombres cortos: sub, email, name, role
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
            RoleClaimType = "role",
        };
    });

builder.Services.AddAuthorization();

// ---- Límite de intentos de login (fuerza bruta) ----
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "desconocida",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));

    // Cada informe cuesta una llamada a la IA: máximo 5 por minuto y usuario.
    options.AddPolicy("reportes", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        httpContext.User.FindFirst("sub")?.Value ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonimo",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

// ---- Informes con IA (Replicate): token solo en backend (appsettings.Local.json / Replicate__Token) ----
builder.Services.Configure<ReplicateOptions>(builder.Configuration.GetSection(ReplicateOptions.SectionName));
builder.Services.AddHttpClient<ReplicateClient>(client =>
{
    client.BaseAddress = new Uri("https://api.replicate.com/");
    client.Timeout = TimeSpan.FromMinutes(3); // el límite real lo impone ReplicateOptions.TimeoutSeconds
});
builder.Services.AddSingleton<InformeBuilder>();
builder.Services.AddScoped<InformeIAService>();

// ---- CORS: frontend Angular (ng serve) ----
const string FrontendCors = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCors, policy => policy
        .SetIsOriginAllowed(origin =>
        {
            if (origin is "http://localhost:4200" or "http://localhost:4201") return true;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
            // Despliegues de Vercel (producción y previews con URL cambiante)
            return uri.Scheme == Uri.UriSchemeHttps && uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
        })
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCors);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter(); // después de autenticar: la política "reportes" usa el usuario

app.MapControllers();

// Roles y administrador inicial (no bloquea el arranque si la base no está disponible).
await DbSeeder.SeedAsync(app.Configuration, app.Logger);

app.Run();
