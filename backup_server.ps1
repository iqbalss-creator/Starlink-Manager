$ErrorActionPreference = 'Continue'

$backupRoot = "C:\Backups\StarlinkManager"
$mikrotikBackupRoot = "C:\Backups\MikroTik"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupZip = "$backupRoot\backup_full_$timestamp.zip"
$latestZip = "$backupRoot\latest_backup.zip"
$tempFolder = "$backupRoot\temp_$timestamp"

Write-Host "================================================="
Write-Host "   MEMULAI BACKUP TOTAL (SERVER + MIKROTIK)      "
Write-Host "================================================="

# 1. Buat folder jika belum ada
if (-not (Test-Path $backupRoot)) { New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null }
if (-not (Test-Path $mikrotikBackupRoot)) { New-Item -ItemType Directory -Force -Path $mikrotikBackupRoot | Out-Null }
if (-not (Test-Path $tempFolder)) { New-Item -ItemType Directory -Force -Path $tempFolder | Out-Null }

# 2. Ambil Backup MikroTik (Winbox) via API & FTP
Write-Host "`n1. Mengambil Binary Backup & Export Script dari MikroTik (10.8.0.2)..."
$nodePath = "C:\tools\nodejs\node.exe"
if (Test-Path $nodePath) {
    & $nodePath "C:\Project\backup_mikrotik.js"
}

# 3. Kumpulkan file Project & Konfigurasi Server
Write-Host "`n2. Mengumpulkan file aplikasi, konfigurasi & database..."
$projectDest = "$tempFolder\Project"
New-Item -ItemType Directory -Force -Path $projectDest | Out-Null

$excludeList = @("node_modules", ".next", ".git")
Get-ChildItem -Path "C:\Project" -Force | Where-Object { $excludeList -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $projectDest -Recurse -Force
}

# Salin WireGuard & Caddy
if (Test-Path "C:\tools\wireguard") {
    $wgDest = "$tempFolder\WireGuard"
    New-Item -ItemType Directory -Force -Path $wgDest | Out-Null
    Copy-Item -Path "C:\tools\wireguard\*" -Destination $wgDest -Recurse -Force
}
if (Test-Path "C:\Project\Caddyfile") {
    Copy-Item -Path "C:\Project\Caddyfile" -Destination "$tempFolder\Caddyfile" -Force
}

# Salin File Backup MikroTik Terbaru ke dalam arsip
$latestMikrotikBackup = Get-ChildItem -Path $mikrotikBackupRoot -Filter "*.backup" | Sort-Object CreationTime -Descending | Select-Object -First 1
$latestMikrotikRsc = Get-ChildItem -Path $mikrotikBackupRoot -Filter "*.rsc" | Sort-Object CreationTime -Descending | Select-Object -First 1

if ($latestMikrotikBackup -and $latestMikrotikRsc) {
    $mtDest = "$tempFolder\MikroTik_Backup"
    New-Item -ItemType Directory -Force -Path $mtDest | Out-Null
    Copy-Item -Path $latestMikrotikBackup.FullName -Destination "$mtDest\mikrotik_latest.backup" -Force
    Copy-Item -Path $latestMikrotikRsc.FullName -Destination "$mtDest\mikrotik_latest.rsc" -Force
}

# 4. Kompresi ke format ZIP
Write-Host "`n3. Mengompresi arsip backup total..."
Compress-Archive -Path "$tempFolder\*" -DestinationPath $backupZip -Force
Copy-Item -Path $backupZip -Destination $latestZip -Force

# Bersihkan temp
Remove-Item -Path $tempFolder -Recurse -Force

$zipSizeMb = [Math]::Round((Get-Item $backupZip).Length / 1MB, 2)
Write-Host "Backup total berhasil dibuat! Ukuran: $zipSizeMb MB"

# 5. Kirim ke Telegram
Write-Host "`n4. Mengirim backup ke Telegram..."
$botToken = ""
$chatId = ""

if (Test-Path "C:\Project\.env.local") {
    Get-Content "C:\Project\.env.local" | ForEach-Object {
        if ($_ -match "^TELEGRAM_BOT_TOKEN=(.+)$") { $botToken = $matches[1].Trim('"').Trim("'") }
        if ($_ -match "^TELEGRAM_CHAT_ID=(.+)$") { $chatId = $matches[1].Trim('"').Trim("'") }
    }
}

if ($botToken -and $chatId) {
    Write-Host "Mengirim file ke Telegram (Chat ID: $chatId)..."
    
    # 1. Kirim Arsip Full Server + MikroTik
    $capFull = "BACKUP TOTAL: SERVER & MIKROTIK`nHost: allstar.my.id (38.253.224.108)`nWaktu: $(Get-Date -Format 'dd-MM-yyyy HH:mm:ss')`nFile: $($backupZip | Split-Path -Leaf)`nUkuran: $zipSizeMb MB`n`nIsi Backup:`n1. Web Server Starlink Manager & Configs`n2. VPN WireGuard & Port Forwarding`n3. MikroTik Winbox Backup (.backup)`n4. MikroTik Script Export (.rsc)"
    $sendUrl = "https://api.telegram.org/bot$botToken/sendDocument"
    curl.exe -s -F "chat_id=$chatId" -F "caption=$capFull" -F "document=@$backupZip" $sendUrl | Out-Null

    # 2. Kirim juga file .backup MikroTik terpisah agar bisa di-restore langsung di Winbox
    if ($latestMikrotikBackup) {
        $capMt = "MIKROTIK WINBOX BACKUP (.backup)`nRouter: RB1100AHx4`nBisa langsung di-restore di Winbox menu Files -> Restore."
        curl.exe -s -F "chat_id=$chatId" -F "caption=$capMt" -F "document=@$($latestMikrotikBackup.FullName)" $sendUrl | Out-Null
    }

    # 3. Kirim file .rsc MikroTik
    if ($latestMikrotikRsc) {
        $capRsc = "MIKROTIK CONFIG EXPORT (.rsc)`nRouter: RB1100AHx4`nScript konfigurasi teks lengkap MikroTik."
        curl.exe -s -F "chat_id=$chatId" -F "caption=$capRsc" -F "document=@$($latestMikrotikRsc.FullName)" $sendUrl | Out-Null
    }

    Write-Host "BERHASIL: Seluruh file backup Server & Winbox MikroTik telah terkirim ke Telegram!"
}

# 6. Rotasi Backup Lokal
Write-Host "`n5. Membersihkan backup lokal lama..."
$allBackups = Get-ChildItem -Path $backupRoot -Filter "backup_full_*.zip" | Sort-Object CreationTime -Descending
if ($allBackups.Count -gt 7) {
    $allBackups | Select-Object -Skip 7 | ForEach-Object {
        Remove-Item $_.FullName -Force
    }
}
$allMtBackups = Get-ChildItem -Path $mikrotikBackupRoot -Filter "mikrotik_*" | Sort-Object CreationTime -Descending
if ($allMtBackups.Count -gt 14) {
    $allMtBackups | Select-Object -Skip 14 | ForEach-Object {
        Remove-Item $_.FullName -Force
    }
}

Write-Host "`n================================================="
Write-Host "Auto Backup Server & MikroTik Selesai dengan Sukses!"
Write-Host "================================================="
