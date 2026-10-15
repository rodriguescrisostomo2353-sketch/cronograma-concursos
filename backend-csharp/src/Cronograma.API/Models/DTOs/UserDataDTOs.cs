using System.Text.Json;

namespace Cronograma.API.Models.DTOs;

public class UserDataDto
{
    public JsonElement? Materias { get; set; }
    public JsonElement? NaoClassificado { get; set; }
    public JsonElement? Schedules { get; set; }
    public string? ActiveScheduleId { get; set; }
    public JsonElement? CompletedSlots { get; set; }
    public JsonElement? Priorities { get; set; }
    public JsonElement? AutoConfig { get; set; }
    public string? ExamDate { get; set; }
    public string? ExamTitle { get; set; }
    public JsonElement? SpacedReviews { get; set; }
    public JsonElement? StudyLog { get; set; }
    public string? Theme { get; set; } = "light";
    public JsonElement? PdfAnnotations { get; set; }
    public JsonElement? PdfBookmarks { get; set; }
    public int? DataVersion { get; set; } = 1;
    public DateTime? UpdatedAt { get; set; }
}

public class SyncCheckResponse
{
    public bool HasData { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int DataVersion { get; set; }
    public long ServerTimeUnixMs { get; set; }
}

public class SyncResponse
{
    public bool Success { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserDataDto? Data { get; set; }
}
