using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ControlStock.Auth
{
    public static class ClaimsPrincipalExtensions
    {
        public static int GetUsuarioId(this ClaimsPrincipal user)
        {
            var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return int.TryParse(sub, out var id)
                ? id
                : throw new InvalidOperationException("El token no contiene un id de usuario válido.");
        }
    }
}
