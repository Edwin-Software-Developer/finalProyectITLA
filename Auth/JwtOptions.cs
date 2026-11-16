namespace ControlStock.Auth
{
    /// <summary>Sección "Jwt" de la configuración.</summary>
    public class JwtOptions
    {
        public const string SectionName = "Jwt";

        /// <summary>Clave secreta de firma (HS256). Mínimo 32 caracteres. Nunca se versiona en producción.</summary>
        public string Key { get; set; } = string.Empty;
        public string Issuer { get; set; } = "ControlStock";
        public string Audience { get; set; } = "ControlStock.Frontend";
        public int ExpiresMinutes { get; set; } = 480;
    }
}
