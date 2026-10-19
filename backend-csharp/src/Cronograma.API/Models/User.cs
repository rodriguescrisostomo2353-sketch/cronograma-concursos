using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Cronograma.API.Models;

[Table("Users")]
public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    public string PasswordSalt { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginAt { get; set; }

    // Relação 1-para-1 com os dados do usuário
    public virtual UserData? UserData { get; set; }

    // Relação 1-para-N com os arquivos do usuário
    public virtual ICollection<UserFileMetadata> Files { get; set; } = new List<UserFileMetadata>();
}
