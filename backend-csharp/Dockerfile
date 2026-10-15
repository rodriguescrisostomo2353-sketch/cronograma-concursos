# Imagem base com SDK para compilação
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copia arquivo do projeto e restaura dependências NuGet
COPY src/Cronograma.API/*.csproj ./src/Cronograma.API/
RUN dotnet restore ./src/Cronograma.API/Cronograma.API.csproj

# Copia todo o código-fonte e compila em modo Release
COPY src/ ./src/
WORKDIR /app/src/Cronograma.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Imagem final de runtime leve e segura
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Cria diretório de armazenamento persistente
RUN mkdir -p /app/storage

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
EXPOSE 5000

ENTRYPOINT ["dotnet", "Cronograma.API.dll"]

