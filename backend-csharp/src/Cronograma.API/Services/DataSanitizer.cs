using System.Text.Json;
using System.Text.Json.Nodes;

namespace Cronograma.API.Services;

/// <summary>
/// Serviço de Sanitização e Validação Anti-Duplicação para gravações na nuvem.
/// Garante unicidade lógica mesmo se clientes enviarem dados com IDs repetidos.
/// </summary>
public static class DataSanitizer
{
    public static string SanitizeMateriasJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return "[]";
        try
        {
            var node = JsonNode.Parse(json);
            if (node is not JsonArray array) return json;

            var result = new JsonArray();
            var seenMateriaIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var seenMateriaNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in array)
            {
                if (item is not JsonObject matObj) continue;

                var id = matObj["id"]?.ToString()?.Trim();
                var nome = (matObj["nome"]?.ToString() ?? matObj["name"]?.ToString())?.Trim() ?? "";

                if (string.IsNullOrEmpty(id))
                {
                    id = $"mat_{Math.Abs(nome.ToLowerInvariant().GetHashCode())}";
                    matObj["id"] = id;
                }

                if (seenMateriaIds.Contains(id) || (!string.IsNullOrEmpty(nome) && seenMateriaNames.Contains(nome)))
                {
                    // Mescla tópicos com a matéria existente se encontrada
                    continue;
                }

                seenMateriaIds.Add(id);
                if (!string.IsNullOrEmpty(nome)) seenMateriaNames.Add(nome);

                // Sanitiza tópicos dentro da matéria
                if (matObj["topicos"] is JsonArray topicosArray)
                {
                    var cleanTopicos = new JsonArray();
                    var seenTopicoIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    var seenTopicoKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (var top in topicosArray)
                    {
                        if (top is JsonObject topObj)
                        {
                            var topId = topObj["id"]?.ToString()?.Trim();
                            var topText = (topObj["texto"]?.ToString() ?? topObj["text"]?.ToString())?.Trim() ?? "";
                            var topNum = topObj["numero"]?.ToString()?.Trim() ?? "";
                            var logicalKey = $"{topNum}::{topText.ToLowerInvariant()}";

                            if (string.IsNullOrEmpty(topId))
                            {
                                topId = $"top_{Math.Abs(logicalKey.GetHashCode())}";
                                topObj["id"] = topId;
                            }

                            if (!seenTopicoIds.Contains(topId) && !seenTopicoKeys.Contains(logicalKey))
                            {
                                seenTopicoIds.Add(topId);
                                seenTopicoKeys.Add(logicalKey);
                                cleanTopicos.Add(topObj.DeepClone());
                            }
                        }
                    }
                    matObj["topicos"] = cleanTopicos;
                }

                result.Add(matObj.DeepClone());
            }

            return result.ToJsonString();
        }
        catch
        {
            return json;
        }
    }

    public static string SanitizeStudyLogJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return "[]";
        try
        {
            var node = JsonNode.Parse(json);
            if (node is not JsonArray array) return json;

            var map = new Dictionary<string, JsonObject>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in array)
            {
                if (item is not JsonObject logObj) continue;
                var id = logObj["id"]?.ToString()?.Trim();
                if (string.IsNullOrEmpty(id))
                {
                    id = $"log_{Guid.NewGuid():N}";
                    logObj["id"] = id;
                }

                if (!map.ContainsKey(id))
                {
                    map[id] = (JsonObject)logObj.DeepClone();
                }
                else
                {
                    // Se já existe, mantém o que tiver UpdatedAt mais recente
                    var existing = map[id];
                    var newUpdated = logObj["updatedAt"]?.ToString();
                    var existingUpdated = existing["updatedAt"]?.ToString();

                    if (!string.IsNullOrEmpty(newUpdated) && string.Compare(newUpdated, existingUpdated, StringComparison.Ordinal) > 0)
                    {
                        map[id] = (JsonObject)logObj.DeepClone();
                    }
                }
            }

            var result = new JsonArray();
            foreach (var val in map.Values)
            {
                result.Add(val);
            }
            return result.ToJsonString();
        }
        catch
        {
            return json;
        }
    }

    public static string SanitizeStringArray(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return "[]";
        try
        {
            var node = JsonNode.Parse(json);
            if (node is not JsonArray array) return json;

            var result = new JsonArray();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in array)
            {
                var s = item?.ToString()?.Trim();
                if (!string.IsNullOrEmpty(s) && seen.Add(s))
                {
                    result.Add(s);
                }
            }
            return result.ToJsonString();
        }
        catch
        {
            return json;
        }
    }
}
