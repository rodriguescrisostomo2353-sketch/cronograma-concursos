# 🚀 BACK-END-ABA (Cronograma de Estudos API)

[![.NET 9](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-Web_API-blue)](https://docs.microsoft.com/aspnet/core)
[![Entity Framework Core](https://img.shields.io/badge/Entity_Framework-Core_9-5C2D91)](https://docs.microsoft.com/ef/core/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD Build](https://github.com/rodriguescrisostomo2353-sketch/BACK-END-ABA/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/rodriguescrisostomo2353-sketch/BACK-END-ABA/actions)
[![GHCR Container](https://img.shields.io/badge/GHCR-Docker_Image-2496ED?logo=docker&logoColor=white)](https://github.com/rodriguescrisostomo2353-sketch/BACK-END-ABA/pkgs/container/back-end-aba)

Backend robusto e de alta performance em **C# (.NET 9.0 / ASP.NET Core Web API)** para o aplicativo **Cronograma de Estudos para Concursos**. Fornece autenticação com JWT, persistência relacional com Entity Framework Core, sincronização em tempo real e biblioteca virtual de arquivos com conformidade LGPD.


---

## 📌 Funcionalidades Principais

- 🔐 **Autenticação JWT Bearer:** Cadastro, login, renovação de sessão e recuperação de senha.
- 🛡️ **Segurança Criptográfica:** Hash de senhas com algoritmo **PBKDF2 (HMAC-SHA512)** com 100.000 iterações e salt criptográfico individual.
- ⚖️ **Conformidade LGPD:** Exclusão definitiva de conta com remoção em cascata de dados e arquivos físicos em disco.
- 🔄 **Sincronização em Nuvem:** Leitura, salvamento atômico e endpoint ultra-rápido de verificação incremental (`check-sync`).
- 📁 **Biblioteca Virtual de Arquivos:** Upload (até 25MB), listagem, download e streaming seguro de PDFs e materiais de estudo.
- 📖 **Documentação Interativa Swagger:** Teste e visualização de todos os endpoints via interface gráfica no navegador.
- 🐳 **Pronto para Nuvem:** Contêiner multi-stage Docker e pipeline de CI/CD automatizado via GitHub Actions.

---

## 📁 Estrutura do Projeto

```text
BACK-END-ABA/
├── CronogramaBackend.sln              # Arquivo de Solução .NET
├── Dockerfile                         # Build multi-stage para deploy em contêiner
├── .gitignore                         # Regras de exclusão para .NET e SQLite
├── .github/workflows/ci-cd.yml        # CI/CD automatizado no GitHub Actions
└── src/
    └── Cronograma.API/
        ├── Cronograma.API.csproj      # Dependências NuGet (.NET 9, EF Core, JWT, Swagger)
        ├── Program.cs                 # Configurações de DI, CORS, JWT, Banco e Swagger
        ├── appsettings.json           # Configurações de ConnectionString e JWT
        ├── Data/
        │   └── AppDbContext.cs        # Contexto do banco relacional
        ├── Models/
        │   ├── User.cs                # Modelo de Usuário e Credenciais
        │   ├── UserData.cs            # Modelo de Dados de Estudo (JSONB)
        │   ├── UserFileMetadata.cs    # Metadados de PDFs da Biblioteca
        │   └── DTOs/                  # Contratos de Request e Response
        ├── Services/
        │   ├── PasswordHasher.cs      # Criptografia PBKDF2 SHA-512
        │   └── TokenService.cs        # Geração de tokens JWT
        └── Controllers/
            ├── AuthController.cs      # /api/auth (Login, Cadastro, LGPD)
            ├── UserDataController.cs  # /api/userdata (Sincronização de dados)
            └── FilesController.cs      # /api/files (Upload e Download de PDFs)
```

---

## ⚡ Como Rodar Localmente

### 1. Pré-requisitos
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) instalado.

### 2. Executando a API
Na pasta do projeto, execute:
```bash
dotnet run --project src/Cronograma.API/Cronograma.API.csproj --urls "http://localhost:5000"
```

A API estará disponível em `http://localhost:5000`.

### 3. Acessando a Documentação Swagger
Abra no navegador:
👉 **[http://localhost:5000/swagger](http://localhost:5000/swagger)**

---

## 🌐 Endpoints da API

| Módulo | Método | Endpoint | Protegido? | Descrição |
| :--- | :---: | :--- | :---: | :--- |
| **Auth** | `POST` | `/api/auth/register` | ❌ | Cadastro de novo usuário |
| **Auth** | `POST` | `/api/auth/login` | ❌ | Login e emissão de token JWT |
| **Auth** | `POST` | `/api/auth/reset-password` | ❌ | Solicitação de recuperação de senha |
| **Auth** | `GET` | `/api/auth/me` | 🔒 | Dados do usuário autenticado |
| **Auth** | `DELETE`| `/api/auth/delete-account` | 🔒 | Exclusão definitiva de conta (LGPD) |
| **Dados**| `GET` | `/api/userdata` | 🔒 | Obter matérias, cronogramas e horas |
| **Dados**| `POST` | `/api/userdata` | 🔒 | Gravação e sincronização de dados |
| **Dados**| `GET` | `/api/userdata/check-sync` | 🔒 | Verificação rápida incremental |
| **PDFs** | `GET` | `/api/files` | 🔒 | Listar arquivos do usuário |
| **PDFs** | `POST` | `/api/files/upload` | 🔒 | Upload de PDF/documento (até 25MB) |
| **PDFs** | `GET` | `/api/files/{id}/download` | 🔒 | Download/streaming de arquivo |
| **PDFs** | `DELETE`| `/api/files/{id}` | 🔒 | Exclusão de arquivo e metadados |

---

## ☁️ Como Hospedar na Nuvem Gratuitamente

### Opção 1: Render.com (Recomendado - 100% Grátis)
1. Crie uma conta em [Render.com](https://render.com/).
2. Clique em **New +** > **Web Service**.
3. Conecte o repositório do GitHub `BACK-END-ABA`.
4. Em **Environment**, escolha **Docker**.
5. Clique em **Create Web Service**.
6. Pronto! O Render fornecerá uma URL HTTPS pública automática (ex.: `https://back-end-aba.onrender.com`).

### Opção 2: Railway.app
1. Acesse [Railway.app](https://railway.app/).
2. Clique em **New Project** > **Deploy from GitHub repo** > selecione `BACK-END-ABA`.
3. O Railway detectará o `Dockerfile` automaticamente e iniciará a publicação.

### Opção 3: Qualquer Servidor VPS com Docker
```bash
docker build -t back-end-aba .
docker run -d -p 5000:5000 -v backend_storage:/app/storage --name backend-aba back-end-aba
```
