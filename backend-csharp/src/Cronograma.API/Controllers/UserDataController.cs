using System.Security.Claims;
using System.Text.Json;
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
public class UserDataController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserDataController> _logger;

    public UserDataController(AppDbContext context, ILogger<UserDataController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        if (Guid.TryParse(idStr, out var id)) return id;
        throw new UnauthorizedAccessException("Identificador de usuário inválido no token.");
    }

    [HttpGet]
    public async Task<ActionResult<UserDataDto>> GetUserData()
    {
        var userId = GetCurrentUserId();
        var data = await _context.UserData.FirstOrDefaultAsync(d => d.UserId == userId);

        if (data == null)
        {
            // Cria um registro padrão se ainda não existir
            data = new UserData
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserData.Add(data);
            await _context.SaveChangesAsync();
        }

        return Ok(new UserDataDto
        {
            Materias = JsonDocument.Parse(data.MateriasJson).RootElement,
            NaoClassificado = JsonDocument.Parse(data.NaoClassificadoJson).RootElement,
            Schedules = JsonDocument.Parse(data.SchedulesJson).RootElement,
            ActiveScheduleId = data.ActiveScheduleId,
            CompletedSlots = JsonDocument.Parse(data.CompletedSlotsJson).RootElement,
            Priorities = JsonDocument.Parse(data.PrioritiesJson).RootElement,
            AutoConfig = JsonDocument.Parse(data.AutoConfigJson).RootElement,
            ExamDate = data.ExamDate,
            ExamTitle = data.ExamTitle,
            SpacedReviews = JsonDocument.Parse(data.SpacedReviewsJson).RootElement,
            StudyLog = JsonDocument.Parse(data.StudyLogJson).RootElement,
            Theme = data.Theme,
            PdfAnnotations = JsonDocument.Parse(data.PdfAnnotationsJson).RootElement,
            PdfBookmarks = JsonDocument.Parse(data.PdfBookmarksJson).RootElement,
            DataVersion = data.DataVersion,
            UpdatedAt = data.UpdatedAt
        });
    }

    [HttpPost]
    [HttpPut]
    public async Task<ActionResult<SyncResponse>> SaveUserData([FromBody] UserDataDto payload)
    {
        var userId = GetCurrentUserId();
        var data = await _context.UserData.FirstOrDefaultAsync(d => d.UserId == userId);

        if (data == null)
        {
            data = new UserData
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.UserData.Add(data);
        }

        // Atualiza campos JSON
        if (payload.Materias.HasValue)
            data.MateriasJson = payload.Materias.Value.GetRawText();

        if (payload.NaoClassificado.HasValue)
            data.NaoClassificadoJson = payload.NaoClassificado.Value.GetRawText();

        if (payload.Schedules.HasValue)
            data.SchedulesJson = payload.Schedules.Value.GetRawText();

        if (payload.ActiveScheduleId != null)
            data.ActiveScheduleId = payload.ActiveScheduleId;

        if (payload.CompletedSlots.HasValue)
            data.CompletedSlotsJson = payload.CompletedSlots.Value.GetRawText();

        if (payload.Priorities.HasValue)
            data.PrioritiesJson = payload.Priorities.Value.GetRawText();

        if (payload.AutoConfig.HasValue)
            data.AutoConfigJson = payload.AutoConfig.Value.GetRawText();

        if (payload.ExamDate != null)
            data.ExamDate = payload.ExamDate;

        if (payload.ExamTitle != null)
            data.ExamTitle = payload.ExamTitle;

        if (payload.SpacedReviews.HasValue)
            data.SpacedReviewsJson = payload.SpacedReviews.Value.GetRawText();

        if (payload.StudyLog.HasValue)
            data.StudyLogJson = payload.StudyLog.Value.GetRawText();

        if (!string.IsNullOrEmpty(payload.Theme))
            data.Theme = payload.Theme;

        if (payload.PdfAnnotations.HasValue)
            data.PdfAnnotationsJson = payload.PdfAnnotations.Value.GetRawText();

        if (payload.PdfBookmarks.HasValue)
            data.PdfBookmarksJson = payload.PdfBookmarks.Value.GetRawText();

        if (payload.DataVersion.HasValue)
            data.DataVersion = payload.DataVersion.Value;

        data.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Dados sincronizados com sucesso para usuário {UserId}", userId);

        return Ok(new SyncResponse
        {
            Success = true,
            UpdatedAt = data.UpdatedAt,
            Message = "Dados sincronizados com sucesso na nuvem."
        });
    }

    [HttpGet("check-sync")]
    public async Task<ActionResult<SyncCheckResponse>> CheckSync([FromQuery] DateTime? since)
    {
        var userId = GetCurrentUserId();
        var data = await _context.UserData
            .AsNoTracking()
            .Select(d => new { d.UserId, d.UpdatedAt, d.DataVersion })
            .FirstOrDefaultAsync(d => d.UserId == userId);

        return Ok(new SyncCheckResponse
        {
            HasData = data != null,
            UpdatedAt = data?.UpdatedAt,
            DataVersion = data?.DataVersion ?? 1,
            ServerTimeUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }
}
