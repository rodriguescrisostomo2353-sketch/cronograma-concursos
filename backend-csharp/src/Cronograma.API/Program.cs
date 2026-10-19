using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Cronograma.API.Data;
using Cronograma.API.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuração do Banco de Dados (SQLite com suporte a migrações)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? "Data Source=cronograma.db";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(connectionString);
});

// 2. Registro de Serviços de Negócio
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();

// 3. Configuração de Autenticação JWT
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "CronogramaSuperSecretSecureKeyForJwtTokens2026!@#$%^&*";
var issuer = jwtSettings["Issuer"] ?? "CronogramaAPI";
var audience = jwtSettings["Audience"] ?? "CronogramaClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Permite desenvolvimento local e rede local
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 4. Configuração de CORS para Web PWA e Capacitor Mobile
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllAppOrigins", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            // Permite localhost, 127.0.0.1, schemes nativos do Capacitor e IPs de rede local
            if (string.IsNullOrEmpty(origin)) return false;
            var uri = new Uri(origin);
            return uri.Host == "localhost" 
                || uri.Host == "127.0.0.1" 
                || uri.Scheme == "capacitor" 
                || uri.Scheme == "ionic"
                || uri.Host.StartsWith("192.168.")
                || uri.Host.StartsWith("10.")
                || uri.Host.EndsWith("github.io");
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// 5. Configuração de Controllers e JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = false;
    });

// 6. Swagger / OpenAPI com suporte ao botão "Authorize" (Bearer JWT)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Cronograma de Estudos API (C# .NET 9)",
        Version = "v1",
        Description = "Backend em C# ASP.NET Core para autenticação, sincronização em nuvem e armazenamento de arquivos do Cronograma de Concursos."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Insira o token JWT neste formato: Bearer {seu_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 8. Suporte a variável de ambiente PORT (Render, Railway, Cloud Run, etc.)
var envPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(envPort))
{
    builder.WebHost.UseUrls($"http://*:{envPort}");
}

var app = builder.Build();

// 9. Auto-migração e criação do banco de dados na inicialização
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    try
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE UserData ADD COLUMN ResetEpoch INTEGER NOT NULL DEFAULT 0;");
    }
    catch { /* Coluna ResetEpoch já existe */ }
}

// 10. Pipeline HTTP e Swagger (Habilitado para fácil teste na nuvem)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Cronograma API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAllAppOrigins");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health Check Endpoints
app.MapGet("/", () => Results.Ok(new
{
    service = "Cronograma de Estudos - Backend C#",
    version = "1.8.0",
    framework = ".NET 9.0",
    status = "healthy",
    swagger = "/swagger",
    timestamp = DateTime.UtcNow
}));

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "Cronograma API C#",
    timestamp = DateTime.UtcNow
}));

app.Run();

