using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Cronograma.API.Data;
using Cronograma.API.Models;
using Cronograma.API.Models.DTOs;

namespace Cronograma.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FilesController> _logger;

    public FilesController(AppDbContext context, IConfiguration configuration, ILogger<FilesController> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        if (Guid.TryParse(idStr, out var id)) return id;
        throw new UnauthorizedAccessException("Usuário não autenticado.");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FileItemDto>>> ListFiles()
    {
        var userId = GetCurrentUserId();
        var files = await _context.UserFiles
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.UploadedAt)
            .Select(f => new FileItemDto
            {
                Id = f.Id,
                FileName = f.FileName,
                FileSizeBytes = f.FileSizeBytes,
                ContentType = f.ContentType,
                UploadedAt = f.UploadedAt
            })
            .ToListAsync();

        return Ok(files);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(26214400)] // 25 MB
    public async Task<ActionResult<FileUploadResponse>> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new FileUploadResponse { Success = false, Message = "Nenhum arquivo enviado." });

        var userId = GetCurrentUserId();
        var uploadDir = _configuration["StorageSettings:UploadDirectory"] ?? "storage";
        var userDir = Path.Combine(uploadDir, userId.ToString());

        if (!Directory.Exists(userDir))
        {
            Directory.CreateDirectory(userDir);
        }

        var fileId = Guid.NewGuid();
        var fileExtension = Path.GetExtension(file.FileName);
        var safeFileName = Path.GetFileName(file.FileName);
        var storedFileName = $"{fileId}{fileExtension}";
        var physicalPath = Path.Combine(userDir, storedFileName);

        await using (var stream = new FileStream(physicalPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var metadata = new UserFileMetadata
        {
            Id = fileId,
            UserId = userId,
            FileName = safeFileName,
            FileSizeBytes = file.Length,
            ContentType = file.ContentType ?? "application/octet-stream",
            StoragePath = physicalPath,
            UploadedAt = DateTime.UtcNow
        };

        _context.UserFiles.Add(metadata);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Arquivo {FileName} ({Size} bytes) enviado com sucesso para usuário {UserId}", safeFileName, file.Length, userId);

        return Ok(new FileUploadResponse
        {
            Success = true,
            Message = "Arquivo enviado com sucesso.",
            File = new FileItemDto
            {
                Id = metadata.Id,
                FileName = metadata.FileName,
                FileSizeBytes = metadata.FileSizeBytes,
                ContentType = metadata.ContentType,
                UploadedAt = metadata.UploadedAt
            }
        });
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadFile(Guid id)
    {
        var userId = GetCurrentUserId();
        var fileMeta = await _context.UserFiles.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

        if (fileMeta == null)
            return NotFound(new { message = "Arquivo não encontrado." });

        if (!System.IO.File.Exists(fileMeta.StoragePath))
            return NotFound(new { message = "Arquivo físico não encontrado no servidor." });

        var stream = new FileStream(fileMeta.StoragePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return File(stream, fileMeta.ContentType, fileMeta.FileName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFile(Guid id)
    {
        var userId = GetCurrentUserId();
        var fileMeta = await _context.UserFiles.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

        if (fileMeta == null)
            return NotFound(new { message = "Arquivo não encontrado." });

        if (System.IO.File.Exists(fileMeta.StoragePath))
        {
            try
            {
                System.IO.File.Delete(fileMeta.StoragePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao excluir arquivo físico {Path}", fileMeta.StoragePath);
            }
        }

        _context.UserFiles.Remove(fileMeta);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Arquivo excluído com sucesso." });
    }
}
