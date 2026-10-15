# 🚀 BACKEND EM C# (ASP.NET CORE 9 WEB API)

> **Projeto:** Cronograma de Estudos para Concursos  
> **Linguagem & Framework:** C# (.NET 9.0 / ASP.NET Core Web API)  
> **Banco de Dados:** Entity Framework Core com SQLite (Pronto para PostgreSQL / SQL Server)  
> **Segurança:** Autenticação JWT Bearer + Hash de Senha com PBKDF2 (SHA-512) + LGPD Compliance  
> **Documentação Interativa:** Swagger / OpenAPI UI Integrado

---

## 📌 1. Estrutura da Solução em C#

A solução foi estruturada no padrão profissional de Clean Architecture em `backend-csharp/`:

```text
backend-csharp/
├── CronogramaBackend.sln              # Arquivo de solução do .NET
├── Dockerfile                         # Build multi-stage para deploy em contêiner
└── src/
    └── Cronograma.API/
        ├── Cronograma.API.csproj      # Configuração e pacotes NuGet
        ├── Program.cs                 # Configuração de DI, JWT, CORS, SQLite e Swagger
        ├── appsettings.json           # Configurações de conexão, JWT e limites
        ├── Data/
        │   └── AppDbContext.cs        # Contexto do EF Core com índices e cascata LGPD
        ├── Models/
        │   ├── User.cs                # Usuário, credenciais e timestamps
        │   ├── UserData.cs            # Matérias, cronogramas, horas de estudo (JSONB)
        │   ├── UserFileMetadata.cs    # Metadados de PDFs da biblioteca virtual
        │   └── DTOs/
        │       ├── AuthDTOs.cs        # RegisterRequest, LoginRequest, AuthResponse, etc.
        │       ├── UserDataDTOs.cs    # UserDataDto, SyncResponse, SyncCheckResponse
        │       └── FileDTOs.cs        # FileItemDto, FileUploadResponse
        ├── Services/
        │   ├── IPasswordHasher.cs     # Interface e implementação PBKDF2 SHA-512
        │   ├── PasswordHasher.cs
        │   ├── ITokenService.cs       # Geração e validação de tokens JWT
        │   └── TokenService.cs
        └── Controllers/
            ├── AuthController.cs      # Cadastro, login, recuperação e exclusão de conta
            ├── UserDataController.cs  # Leitura, sincronização e verificação incremental
            └── FilesController.cs      # Upload, download e exclusão de PDFs
```

---

## ⚡ 2. Como Rodar a API Localmente

### Opção A: Pelo Terminal via .NET CLI
Na pasta raiz do projeto:
```bash
dotnet run --project backend-csharp/src/Cronograma.API/Cronograma.API.csproj --urls "http://localhost:5000"
```

A API iniciará ouvindo em `http://localhost:5000`.

### Opção B: Acessando a Documentação Interativa Swagger
Abra no navegador:
👉 **[http://localhost:5000/swagger](http://localhost:5000/swagger)**

Pelo Swagger você pode:
- Testar o cadastro de usuário (`POST /api/auth/register`)
- Realizar login e obter o Token JWT (`POST /api/auth/login`)
- Clicar no botão verde **Authorize** no topo do Swagger, colar `Bearer {seu_token}` e testar os endpoints protegidos de sincronização e arquivos.

---

## 🐳 3. Como Rodar via Docker (Container)

A solução inclui um `Dockerfile` multi-stage otimizado:

```bash
cd backend-csharp
docker build -t cronograma-api .
docker run -d -p 5000:5000 -v cronograma_data:/app/storage --name cronograma-backend cronograma-api
```

---

## 🌐 4. Catálogo Completo de Endpoints da API

### Autenticação (`/api/auth`)
| Método | Endpoint | Protegido? | Descrição |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | ❌ Não | Cria nova conta, gera hash seguro de senha e emite token JWT. |
| `POST` | `/api/auth/login` | ❌ Não | Valida credenciais e retorna o token JWT de acesso. |
| `POST` | `/api/auth/reset-password` | ❌ Não | Solicita recuperação de senha com proteção contra enumeração. |
| `GET` | `/api/auth/me` | 🔒 Sim | Retorna os dados do usuário logado baseado no token. |
| `DELETE` | `/api/auth/delete-account` | 🔒 Sim | Exclusão definitiva de conta e todos os dados em cascata (LGPD). |

### Sincronização de Dados (`/api/userdata`)
| Método | Endpoint | Protegido? | Descrição |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/userdata` | 🔒 Sim | Retorna matérias, cronogramas, horas de estudo e anotações. |
| `POST` | `/api/userdata` | 🔒 Sim | Grava ou atualiza os dados do usuário e carimba `updatedAt`. |
| `GET` | `/api/userdata/check-sync` | 🔒 Sim | Retorna apenas `updatedAt` para economizar banda (sincronização incremental). |

### Biblioteca Virtual de Arquivos (`/api/files`)
| Método | Endpoint | Protegido? | Descrição |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/files` | 🔒 Sim | Lista os arquivos e PDFs enviados pelo usuário. |
| `POST` | `/api/files/upload` | 🔒 Sim | Upload de PDF/documento com limite configurável (padrão 25MB). |
| `GET` | `/api/files/{id}/download`| 🔒 Sim | Download seguro do arquivo com validação de proprietário. |
| `DELETE`| `/api/files/{id}` | 🔒 Sim | Exclui arquivo físico e registro de metadados. |

---

## 🔒 5. Segurança e Proteções Implementadas

1. **Hash Criptográfico de Senhas:**
   - Algoritmo: PBKDF2 com `HMAC-SHA512`.
   - Iterações: 100.000 iterações.
   - Salt: 256 bits criptograficamente aleatório por usuário.
   - Comparação segura em tempo constante (`CryptographicOperations.FixedTimeEquals`) contra ataques de temporização (Timing Attacks).
2. **Tokens JWT com Validação Estrita:**
   - Assinatura HMAC-SHA256 com chave secreta no servidor.
   - Claims de segurança: `sub`, `email`, `jti`, `userId`.
   - Expiração configurável (padrão 30 dias para persistência de sessão).
3. **CORS Inteligente:**
   - Permite conexões do navegador (`localhost:*`), GitHub Pages (`*.github.io`) e schemes nativos do celular via Capacitor (`capacitor://localhost`, `https://localhost`).
4. **Conformidade LGPD:**
   - O endpoint `DELETE /api/auth/delete-account` exige a confirmação da senha atual e executa exclusão em cascata: exclui o registro do usuário, seus dados de estudo, matérias, cronogramas e os arquivos físicos em disco.

---

## 🧪 6. Testes Automatizados de Validação

Para validar todos os 12 cenários de integração da API C#:
```bash
node scratch/test_csharp_api.js
```

Resultado comprovado:
```text
========================================================================
  TESTES DE INTEGRAÇÃO & SEGURANÇA DA API C# (ASP.NET CORE 9)
========================================================================

  ✅ [PASS] 1. Health Check da API C# (Cronograma de Estudos - Backend C# - .NET 9.0)
  ✅ [PASS] 2. Cadastro de novo usuário com hash PBKDF2 e retorno de JWT
  ✅ [PASS] 3. Rejeição de cadastro duplicado (Status 409)
  ✅ [PASS] 4. Login com senha válida e emissão de novo token JWT
  ✅ [PASS] 5. Rejeição de credencial inválida (Status 401)
  ✅ [PASS] 6. Bloqueio de endpoint protegido sem token JWT (Status 401)
  ✅ [PASS] 7. Gravação e sincronização de dados do usuário com Bearer JWT
  ✅ [PASS] 8. Recuperação com integridade total dos dados salvos na nuvem C#
  ✅ [PASS] 9. Endpoint check-sync retornando carimbo de data/hora para economia de banda
  ✅ [PASS] 10. Endpoint de recuperação de senha com proteção contra enumeração
  ✅ [PASS] 11. Exclusão definitiva de conta e dados em cascata (Conformidade LGPD)
  ✅ [PASS] 12. Verificação de remoção definitiva: login do usuário excluído recusado

========================================================================
  RESULTADO: 12 de 12 TESTES DA API C# APROVADOS COM SUCESSO!
========================================================================
```

---

## ☁️ 7. Onde Hospedar na Nuvem Gratuitamente

Você pode hospedar essa API C# em qualquer provedor de nuvem:
1. **Render.com (Gratuito):** Crie um *Web Service*, conecte ao seu repositório do GitHub e escolha o `Dockerfile`.
2. **Railway.app:** Deploy automático direto do repositório ou Docker.
3. **Azure App Service (F1 Free Tier):** Deploy direto do Visual Studio ou via GitHub Actions.
4. **Fly.io / VPS:** Deploy via contêiner Docker em segundos.
