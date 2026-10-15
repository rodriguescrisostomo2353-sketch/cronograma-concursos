using Microsoft.EntityFrameworkCore;
using Cronograma.API.Models;

namespace Cronograma.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserData> UserData => Set<UserData>();
    public DbSet<UserFileMetadata> UserFiles => Set<UserFileMetadata>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Índice único em Email
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Relação 1-para-1: User <-> UserData com cascata em delete (LGPD)
        modelBuilder.Entity<User>()
            .HasOne(u => u.UserData)
            .WithOne(ud => ud.User)
            .HasForeignKey<UserData>(ud => ud.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Relação 1-para-N: User <-> UserFileMetadata com cascata em delete
        modelBuilder.Entity<User>()
            .HasMany(u => u.Files)
            .WithOne(f => f.User)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Índice para buscas de sincronização incremental por UpdatedAt
        modelBuilder.Entity<UserData>()
            .HasIndex(ud => ud.UpdatedAt);
    }
}
