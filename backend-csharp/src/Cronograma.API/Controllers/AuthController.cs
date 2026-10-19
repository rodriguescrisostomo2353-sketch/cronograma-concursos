using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Cronograma.API.Data;
using Cronograma.API.Models;
using Cronograma.API.Models.DTOs;
using Cronograma.API.Services;

namespace Cronograma.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new AuthResponse { Success = false, Message = "Dados inválidos." });

        var emailNormalized = request.Email.Trim().ToLowerInvariant();

        var existingUser = await _context.Users.AnyAsync(u => u.Email == emailNormalized);
        if (existingUser)
        {
            return Conflict(new AuthResponse
            {
                Success = false,
                Message = "Este endereço de email já está cadastrado."
            });
        }

        var (hash, salt) = _passwordHasher.HashPassword(request.Password);

        var user = new User
        {
            Email = emailNormalized,
            PasswordHash = hash,
            PasswordSalt = salt,
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        // Cria registro inicial de UserData vazio para o novo usuário
        user.UserData = new UserData
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);

        return Ok(new AuthResponse
        {
            Success = true,
            Token = token,
            Message = "Usuário cadastrado com sucesso.",
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new AuthResponse { Success = false, Message = "Email ou senha não fornecidos." });

        var emailNormalized = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == emailNormalized);
        if (user == null)
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Email ou senha incorretos."
            });
        }

        var isValidPassword = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
        if (!isValidPassword)
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Email ou senha incorretos."
            });
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);

        return Ok(new AuthResponse
        {
            Success = true,
            Token = token,
            Message = "Login efetuado com sucesso.",
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { message = "Email inválido." });

        var emailNormalized = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == emailNormalized);

        // Responde com 200 independente de encontrar para evitar enumeração de emails
        _logger.LogInformation("Solicitação de recuperação de senha para: {Email} (Existe: {Exists})", emailNormalized, user != null);

        return Ok(new
        {
            success = true,
            message = "Se o endereço estiver cadastrado, um link de recuperação será processado."
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        });
    }

    [Authorize]
    [HttpDelete("delete-account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { message = "Não autorizado." });

        var user = await _context.Users.Include(u => u.UserData).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado." });

        var isValidPassword = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
        if (!isValidPassword)
        {
            return BadRequest(new { message = "Senha incorreta. Não foi possível confirmar a exclusão da conta." });
        }

        // Remoção completa em cascata de dados e conta (LGPD)
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Conta e dados excluídos com sucesso para o usuário {UserId}", userId);

        return Ok(new
        {
            success = true,
            message = "Sua conta e todos os dados associados foram excluídos com sucesso."
        });
    }
}
