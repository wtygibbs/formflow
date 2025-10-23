FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["AcordParser.sln", "./"]
COPY ["AcordParser.API/AcordParser.API.csproj", "AcordParser.API/"]
COPY ["AcordParser.Core/AcordParser.Core.csproj", "AcordParser.Core/"]
COPY ["AcordParser.Infrastructure/AcordParser.Infrastructure.csproj", "AcordParser.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "AcordParser.sln"

# Copy everything else
COPY . .

# Build
WORKDIR "/src/AcordParser.API"
RUN dotnet build "AcordParser.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "AcordParser.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AcordParser.API.dll"]
