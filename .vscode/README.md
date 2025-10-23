# VS Code Configuration

This folder contains VS Code workspace configuration for the ACORD Parser project.

## Quick Start

### Running the Application

1. **Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)** to see all available tasks
2. **Select "🚀 Run Full Stack"** to start both backend and frontend
3. **Press `F5`** to start debugging (or use the Run and Debug panel)

### Available Tasks

Access tasks via:
- `Ctrl+Shift+B` / `Cmd+Shift+B` - Build menu
- `Ctrl+Shift+P` / `Cmd+Shift+P` then type "Tasks: Run Task"
- Terminal menu → Run Task

## Task Categories

### 🚀 Quick Start Tasks

| Task | Description |
|------|-------------|
| 🚀 Run Full Stack | Runs both backend and frontend simultaneously |
| 🏗️ Build All | Builds backend and frontend |
| 📦 Restore All | Restores all dependencies |

### Backend Tasks

| Task | Description |
|------|-------------|
| Run Backend | Start the .NET API server |
| Build Backend | Build the backend solution |
| Restore Backend | Restore NuGet packages |
| Clean Backend | Clean build artifacts |
| Watch Backend | Run backend with hot reload |

### 📊 Database Migration Tasks

| Task | Description |
|------|-------------|
| 📊 EF: Add Migration | Create a new database migration (prompts for name) |
| 📊 EF: Update Database | Apply pending migrations to database |
| 📊 EF: Remove Last Migration | Remove the most recent migration |
| 📊 EF: List Migrations | Show all migrations |
| 📊 EF: Drop Database | Delete the entire database (use with caution!) |
| 📊 EF: Generate SQL Script | Export migrations as SQL script |

### Frontend Tasks

| Task | Description |
|------|-------------|
| Run Frontend | Start Angular dev server |
| Build Frontend | Build for development |
| Build Frontend (Production) | Build optimized production bundle |
| Install Frontend Dependencies | Run npm install |
| Lint Frontend | Check code quality |
| Test Frontend | Run unit tests |

### 🐳 Docker Tasks

| Task | Description |
|------|-------------|
| 🐳 Docker: Compose Up | Start all containers |
| 🐳 Docker: Compose Down | Stop all containers |
| 🐳 Docker: Compose Build | Build Docker images |
| 🐳 Docker: View Logs | Stream container logs |
| 🐳 Docker: Restart | Restart all containers |

### 🧪 Test Tasks

| Task | Description |
|------|-------------|
| Test Backend | Run .NET tests |
| Test Frontend | Run Angular tests |
| 🧪 Test All | Run all tests |

### Utility Tasks

| Task | Description |
|------|-------------|
| 🧹 Clean All | Remove all build artifacts |
| 📊 Open Swagger | Open API documentation |
| 🌐 Open Frontend | Open app in browser |

## Launch Configurations

Access via:
- Press `F5` to start default configuration
- Click the Run and Debug icon in the sidebar
- `Ctrl+Shift+D` / `Cmd+Shift+D`

### Available Configurations

#### Backend Debugging

- **🚀 Launch Backend API** - Build and debug the backend
- **🐞 Attach to Backend Process** - Attach to running process
- **🔍 Launch Backend (No Build)** - Debug without building

#### Frontend Debugging

- **🌐 Launch Frontend (Chrome)** - Debug in Chrome
- **🌐 Launch Frontend (Edge)** - Debug in Edge
- **🔗 Attach to Frontend (Chrome)** - Attach to running Chrome instance

#### Full Stack Debugging

- **🎯 Full Stack (Backend + Frontend)** - Debug both simultaneously in Chrome
- **🎯 Full Stack (Edge)** - Debug both simultaneously in Edge

#### Docker Debugging

- **🐳 Docker: Launch Backend** - Debug backend in Docker container

## Common Workflows

### First Time Setup

1. Open command palette: `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Run Task: **"📦 Restore All"**
3. Run Task: **"📊 EF: Update Database"**

### Daily Development

1. Press `F5` or select **"🎯 Full Stack (Backend + Frontend)"**
2. Both backend and frontend will start with debugging enabled
3. Swagger opens at `https://localhost:5001/swagger`
4. Frontend opens at `http://localhost:4200`

### Creating a Database Migration

1. Make changes to your entity models
2. Run Task: **"📊 EF: Add Migration"**
3. Enter migration name (e.g., "AddUserProfile")
4. Run Task: **"📊 EF: Update Database"**

### Running with Docker

1. Run Task: **"🐳 Docker: Compose Up"**
2. Run Task: **"🐳 Docker: View Logs"** (to see output)
3. When done: **"🐳 Docker: Compose Down"**

### Frontend Only Development

1. Ensure backend is running (via Docker or `dotnet run`)
2. Run Task: **"Run Frontend"**
3. Or press `F5` and select **"🌐 Launch Frontend (Chrome)"**

### Backend Only Development

1. Run Task: **"Watch Backend"** for hot reload
2. Or press `F5` and select **"🚀 Launch Backend API"**

## Debugging Tips

### Backend Debugging

- Set breakpoints in your C# code (click left margin or `F9`)
- Breakpoints appear in Debug sidebar
- Use Debug Console to evaluate expressions
- Step through code with `F10` (step over) and `F11` (step into)

### Frontend Debugging

- Set breakpoints in TypeScript files
- Use browser DevTools in addition to VS Code debugger
- Console logs appear in Debug Console
- Inspect variables in Variables panel

### Full Stack Debugging

- Set breakpoints in both backend and frontend
- Switch between debuggers in Call Stack panel
- View variables and call stacks for both simultaneously

## Settings

The workspace includes optimized settings for:

- **Auto-formatting** on save
- **Auto-import** organization
- **TypeScript** strict mode
- **C#** semantic highlighting
- **ESLint** integration
- **Path IntelliSense**
- **Git** auto-fetch

## Recommended Extensions

When you open the workspace, VS Code will prompt to install recommended extensions:

### Essential
- C# Dev Kit
- Angular Language Service
- ESLint
- Docker

### Database
- SQL Server (mssql)

### Productivity
- GitLens
- Path Intellisense
- Todo Highlight
- REST Client

Install all recommended extensions:
1. Open command palette
2. Type: "Extensions: Show Recommended Extensions"
3. Click "Install All"

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Start Debugging |
| `Ctrl+F5` | Run Without Debugging |
| `Ctrl+Shift+B` | Show Build Tasks |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+` ` | Toggle Terminal |
| `F9` | Toggle Breakpoint |
| `F10` | Step Over |
| `F11` | Step Into |

## Customization

### Adding Your Own Tasks

Edit `.vscode/tasks.json`:

```json
{
  "label": "My Custom Task",
  "type": "shell",
  "command": "your-command",
  "problemMatcher": []
}
```

### Adding Launch Configurations

Edit `.vscode/launch.json`:

```json
{
  "name": "My Debug Config",
  "type": "coreclr",
  "request": "launch",
  "program": "${workspaceFolder}/path/to/dll"
}
```

### Workspace Settings

Edit `.vscode/settings.json` to customize:
- Formatting rules
- Editor behavior
- Language-specific settings
- Extension configurations

## Troubleshooting

### Tasks Not Appearing

1. Reload window: `Ctrl+Shift+P` → "Reload Window"
2. Check `tasks.json` for syntax errors
3. Ensure `.vscode` folder is in workspace root

### Debugger Not Working

1. Ensure project builds successfully
2. Check `launch.json` paths are correct
3. Install C# Dev Kit extension for .NET debugging
4. Install Chrome/Edge extension for frontend debugging

### Frontend Not Auto-Opening

1. Check if `open` command exists (Mac/Linux) or use browser manually
2. Modify `serverReadyAction` in `launch.json`

### EF Tasks Failing

1. Ensure you're in correct directory
2. Check connection string in `appsettings.json`
3. Verify SQL Server is running
4. Install EF tools: `dotnet tool install --global dotnet-ef`

## Additional Resources

- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [VS Code Tasks](https://code.visualstudio.com/docs/editor/tasks)
- [C# Dev Kit](https://code.visualstudio.com/docs/csharp/get-started)
- [Angular in VS Code](https://code.visualstudio.com/docs/nodejs/angular-tutorial)
