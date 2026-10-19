using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Cronograma.API.Models;

[Table("UserData")]
public class UserData
{
    [Key]
    [ForeignKey("User")]
    public Guid UserId { get; set; }

    public virtual User? User { get; set; }

    public string MateriasJson { get; set; } = "[]";

    public string NaoClassificadoJson { get; set; } = "[]";

    public string SchedulesJson { get; set; } = "[]";

    [MaxLength(100)]
    public string? ActiveScheduleId { get; set; }

    public string CompletedSlotsJson { get; set; } = "{}";

    public string PrioritiesJson { get; set; } = "{}";

    public string AutoConfigJson { get; set; } = "{}";

    [MaxLength(50)]
    public string? ExamDate { get; set; }

    [MaxLength(250)]
    public string? ExamTitle { get; set; }

    public string SpacedReviewsJson { get; set; } = "[]";

    public string StudyLogJson { get; set; } = "[]";

    [MaxLength(20)]
    public string Theme { get; set; } = "light";

    public string PdfAnnotationsJson { get; set; } = "[]";

    public string PdfBookmarksJson { get; set; } = "[]";

    public int DataVersion { get; set; } = 1;

    public long ResetEpoch { get; set; } = 0;

    [MaxLength(100)]
    public string? DeviceId { get; set; }

    public long Revision { get; set; } = 1;

    [MaxLength(64)]
    public string? ContentHash { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
