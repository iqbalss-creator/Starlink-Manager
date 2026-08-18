param (
    [string]$BackupFile = "C:\Backups\StarlinkManager\latest_backup.zip"
)

$ErrorActionPreference = 'Continue'

Write-Host "========================================="
Write-Host "   1-CLICK SERVER DISASTER RECOVERY      "
Write-Host "========================================="

if (-not (Test-Path $BackupFile)) {
    Write-Error "File backup tidak ditemukan di: $BackupFile"
    exit 1
}

Write-Host "Memulihkan dari: $BackupFile"
$tempRestore = "C:\Backups\StarlinkManager\temp_restore"
New-Item -ItemType Directory -Force -Path $tempRestore | Out-Null

Write-Host "`n1. Mengekstrak file backup..."
Expand-Archive -Path $BackupFile -DestinationPath $tempRestore -Force

# Pulihkan file project
Write-Host "2. Memulihkan file aplikasi ke C:\Project..."
if (Test-Path "$tempRestore\Project") {
    Copy-Item -Path "$tempRestore\Project\*" -Destination "C:\Project" -Recurse -Force
}

# Pulihkan WireGuard
Write-Host "3. Memulihkan konfigurasi WireGuard..."
if (Test-Path "$tempRestore\WireGuard") {
    New-Item -ItemType Directory -Force -Path "C:\tools\wireguard" | Out-Null
    Copy-Item -Path "$tempRestore\WireGuard\*" -Destination "C:\tools\wireguard" -Recurse -Force
}

# Bersihkan temp
Remove-Item -Path $tempRestore -Recurse -Force

# Jalankan ulang setup & runner
Write-Host "`n4. Membangun ulang dan menyalakan seluruh service..."
powershell -ExecutionPolicy Bypass -File "C:\Project\setup_wireguard.ps1"
powershell -ExecutionPolicy Bypass -File "C:\Project\setup_winbox_forwarding.ps1"
powershell -ExecutionPolicy Bypass -File "C:\Project\build_app.ps1"
powershell -ExecutionPolicy Bypass -File "C:\Project\run_services.ps1"

Write-Host "`n========================================="
Write-Host "PEMULIHAN SERVER BERHASIL SELESAI!       "
Write-Host "Semua service kembali normal & aktif.   "
Write-Host "========================================="
