#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Manifest Inventory System — Windows Installer
  Run as Administrator in PowerShell:
    Set-ExecutionPolicy Bypass -Scope Process
    .\install.ps1
#>

$ErrorActionPreference = "Stop"
$AppDir   = "C:\Manifest"
$AppPort  = 3000
$DbName   = "manifest"
$DbUser   = "manifest_app"
$SvcName  = "ManifestInventory"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

# ── Ask for passwords ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Manifest Inventory System — Installer" -ForegroundColor White
Write-Host "  ──────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

$DbPassword    = Read-Host "Enter a password for the database user (or press Enter for auto-generated)"
if (-not $DbPassword) { $DbPassword = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(18)).Replace("=","").Replace("+","").Replace("/","") }
$AdminPassword = Read-Host "Enter the admin login password (default: manifest2024)"
if (-not $AdminPassword) { $AdminPassword = "manifest2024" }
$StaffPassword = Read-Host "Enter the staff login password (default: staff2024)"
if (-not $StaffPassword) { $StaffPassword = "staff2024" }
$SessionSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# ── 1. Node.js ────────────────────────────────────────────────────────────────
Write-Step "Checking Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Step "Installing Node.js 20 LTS via winget..."
  winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  Write-OK "Node.js installed"
} else { Write-OK "Node.js already installed: $(node --version)" }

# ── 2. PostgreSQL ─────────────────────────────────────────────────────────────
Write-Step "Checking PostgreSQL..."
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if (-not $pgService) {
  Write-Step "Installing PostgreSQL 15 via winget..."
  winget install --id PostgreSQL.PostgreSQL.15 -e --silent --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  Start-Sleep -Seconds 5
  Write-OK "PostgreSQL installed"
} else { Write-OK "PostgreSQL already installed" }

# Locate psql
$psqlPath = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
if (-not $psqlPath) {
  $pgBin = (Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)?.FullName
  if ($pgBin) { $psqlPath = $pgBin }
}
if (-not $psqlPath) { throw "Cannot find psql.exe. Make sure PostgreSQL is installed." }
Write-OK "psql found: $psqlPath"

# ── 3. Create database and user ───────────────────────────────────────────────
Write-Step "Creating database user and database..."
$pgDir = Split-Path $psqlPath
$env:PGPASSWORD = "postgres"  # default superuser password; may need changing
$createSql = @"
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DbUser') THEN
    CREATE USER $DbUser WITH PASSWORD '$DbPassword';
  ELSE
    ALTER USER $DbUser WITH PASSWORD '$DbPassword';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE $DbName OWNER $DbUser'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DbName')\gexec
GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;
"@
$createSql | & $psqlPath -U postgres 2>&1 | Write-Host
Write-OK "Database '$DbName' and user '$DbUser' ready"

# ── 4. Copy app files ─────────────────────────────────────────────────────────
Write-Step "Copying app to $AppDir..."
if (-not (Test-Path $AppDir)) { New-Item -ItemType Directory -Path $AppDir | Out-Null }
$source = Split-Path -Parent $MyInvocation.MyCommand.Definition
Copy-Item -Path "$source\*" -Destination $AppDir -Recurse -Force -Exclude @("node_modules", ".next", ".git")
Write-OK "App files copied"

# ── 5. Write .env ─────────────────────────────────────────────────────────────
Write-Step "Writing .env..."
@"
DATABASE_URL="postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
SESSION_SECRET="${SessionSecret}"
NODE_ENV="production"
"@ | Set-Content "$AppDir\.env"
Write-OK ".env written"

# ── 6. Install dependencies & set up database ─────────────────────────────────
Write-Step "Installing npm dependencies..."
Set-Location $AppDir
& node (Get-Command npm).Source install --production 2>&1 | Write-Host

Write-Step "Running database migrations..."
$env:DATABASE_URL = "postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
& node (Get-Command npx).Source prisma migrate deploy 2>&1 | Write-Host

Write-Step "Seeding initial users..."
$env:ADMIN_PASSWORD = $AdminPassword
$env:STAFF_PASSWORD = $StaffPassword
& node (Get-Command npx).Source prisma db seed 2>&1 | Write-Host

Write-Step "Building the app..."
& node (Get-Command npm).Source run build 2>&1 | Write-Host

# ── 7. Register Windows Service via NSSM ─────────────────────────────────────
Write-Step "Registering Windows Service..."
$nssmPath = "$AppDir\tools\nssm.exe"
if (-not (Test-Path $nssmPath)) {
  Write-Warn "nssm.exe not found at $nssmPath. Downloading..."
  New-Item -ItemType Directory -Force -Path "$AppDir\tools" | Out-Null
  Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "$env:TEMP\nssm.zip"
  Expand-Archive "$env:TEMP\nssm.zip" -DestinationPath "$env:TEMP\nssm" -Force
  Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" -Destination $nssmPath
}

$nodePath = (Get-Command node).Source
$existing = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
if ($existing) {
  & $nssmPath stop $SvcName 2>&1 | Out-Null
  & $nssmPath remove $SvcName confirm 2>&1 | Out-Null
}
& $nssmPath install $SvcName $nodePath
& $nssmPath set $SvcName AppParameters "$AppDir\node_modules\.bin\next start -p $AppPort"
& $nssmPath set $SvcName AppDirectory $AppDir
& $nssmPath set $SvcName DisplayName "Manifest Inventory System"
& $nssmPath set $SvcName Description "Manifest operations dashboard for products, diary, transport, and clients."
& $nssmPath set $SvcName Start SERVICE_AUTO_START
& $nssmPath set $SvcName AppEnvironmentExtra "NODE_ENV=production" "PORT=$AppPort"
& $nssmPath set $SvcName AppStdout "$AppDir\logs\service.log"
& $nssmPath set $SvcName AppStderr "$AppDir\logs\service-error.log"
New-Item -ItemType Directory -Force -Path "$AppDir\logs" | Out-Null
& $nssmPath start $SvcName
Write-OK "Service '$SvcName' installed and started"

# ── 8. Firewall rule ──────────────────────────────────────────────────────────
Write-Step "Adding firewall rule for port $AppPort..."
$ruleName = "Manifest Inventory System"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $AppPort -Action Allow | Out-Null
  Write-OK "Firewall rule added"
} else { Write-OK "Firewall rule already exists" }

# ── 9. Desktop shortcut ───────────────────────────────────────────────────────
Write-Step "Creating desktop shortcut..."
$WshShell  = New-Object -ComObject WScript.Shell
$Shortcut  = $WshShell.CreateShortcut("$env:PUBLIC\Desktop\Manifest Inventory.lnk")
$Shortcut.TargetPath       = "http://localhost:$AppPort"
$Shortcut.Description      = "Open Manifest Inventory System"
$Shortcut.WorkingDirectory = $AppDir
$Shortcut.Save()
Write-OK "Desktop shortcut created (for all users)"

# ── Done ──────────────────────────────────────────────────────────────────────
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  ✓ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Server address (share this with office computers):" -ForegroundColor White
Write-Host "    http://${LocalIP}:${AppPort}" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Admin login:  admin / $AdminPassword" -ForegroundColor White
Write-Host "  Staff login:  staff / $StaffPassword" -ForegroundColor White
Write-Host ""
Write-Host "  ⚠  Change these passwords after first login!" -ForegroundColor Yellow
Write-Host "     (Use Prisma Studio: npm run db:studio in $AppDir)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Service management:" -ForegroundColor White
Write-Host "    Start:   net start $SvcName" -ForegroundColor DarkGray
Write-Host "    Stop:    net stop $SvcName" -ForegroundColor DarkGray
Write-Host "    Restart: net stop $SvcName && net start $SvcName" -ForegroundColor DarkGray
Write-Host ""
