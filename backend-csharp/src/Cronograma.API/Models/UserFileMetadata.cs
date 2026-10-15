using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Cronograma.API.Models;

[Table("UserFiles")]
public class UserFileMetadata
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }

    [Required]
    [MaxLength(260)]
    public string FileName { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/pdf";

    [Required]
    [MaxLength(500)]
    public string StoragePath { get; set; } = string.Empty;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
