using System.ComponentModel.DataAnnotations;

namespace ControlStock.Dtos
{
    public class AlmacenDTO
    {
        public int Almacen_id { get; set; }

        [Required(ErrorMessage = "El nombre es requerido")]
        [MaxLength(100, ErrorMessage = "El nombre admite un máximo de 100 caracteres")]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(200, ErrorMessage = "La ubicación admite un máximo de 200 caracteres")]
        public string? Ubicacion { get; set; }
    }

    public class ProveedorDTO
    {
        public int Proveedor_id { get; set; }

        [Required(ErrorMessage = "El nombre es requerido")]
        [MaxLength(150, ErrorMessage = "El nombre admite un máximo de 150 caracteres")]
        public string Nombre { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "El correo no es válido")]
        [MaxLength(150, ErrorMessage = "El correo admite un máximo de 150 caracteres")]
        public string? Email { get; set; }

        [MaxLength(30, ErrorMessage = "El teléfono admite un máximo de 30 caracteres")]
        public string? Telefono { get; set; }

        public bool Activo { get; set; } = true;
    }

    public class ClienteDTO
    {
        public int Cliente_id { get; set; }

        [Required(ErrorMessage = "El nombre es requerido")]
        [MaxLength(150, ErrorMessage = "El nombre admite un máximo de 150 caracteres")]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(30, ErrorMessage = "El documento admite un máximo de 30 caracteres")]
        public string? Documento { get; set; }

        [EmailAddress(ErrorMessage = "El correo no es válido")]
        [MaxLength(150, ErrorMessage = "El correo admite un máximo de 150 caracteres")]
        public string? Email { get; set; }

        [MaxLength(30, ErrorMessage = "El teléfono admite un máximo de 30 caracteres")]
        public string? Telefono { get; set; }

        [MaxLength(250, ErrorMessage = "La dirección admite un máximo de 250 caracteres")]
        public string? Direccion { get; set; }

        public bool Activo { get; set; } = true;
    }
}
