using System.Security.Cryptography;

namespace Cronograma.API.Services;

public interface IPasswordHasher
{
    (string hash, string salt) HashPassword(string password);
    bool VerifyPassword(string password, string storedHash, string storedSalt);
}

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 32; // 256 bits
    private const int HashSize = 64; // 512 bits
    private const int Iterations = 100_000;

    public (string hash, string salt) HashPassword(string password)
    {
        byte[] saltBytes = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hashBytes = Rfc2898DeriveBytes.Pbkdf2(
            password,
            saltBytes,
            Iterations,
            HashAlgorithmName.SHA512,
            HashSize
        );

        return (Convert.ToBase64String(hashBytes), Convert.ToBase64String(saltBytes));
    }

    public bool VerifyPassword(string password, string storedHash, string storedSalt)
    {
        byte[] saltBytes = Convert.FromBase64String(storedSalt);
        byte[] expectedHashBytes = Convert.FromBase64String(storedHash);

        byte[] actualHashBytes = Rfc2898DeriveBytes.Pbkdf2(
            password,
            saltBytes,
            Iterations,
            HashAlgorithmName.SHA512,
            HashSize
        );

        return CryptographicOperations.FixedTimeEquals(actualHashBytes, expectedHashBytes);
    }
}
