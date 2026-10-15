namespace Cronograma.API.Models.DTOs;

public class FileItemDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}

public class FileUploadResponse
{
    public bool Success { get; set; }
    public FileItemDto? File { get; set; }
    public string? Message { get; set; }
}
