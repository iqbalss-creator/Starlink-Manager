$ErrorActionPreference = 'Continue'

Write-Host "========================================="
Write-Host "   MEMPERBAIKI WINDOWS SETTINGS & SEARCH "
Write-Host "========================================="

# 1. Stop Explorer and Search processes temporarily
Write-Host "`n1. Menghentikan proses Explorer & Search yang macet..."
Get-Process -Name explorer, SearchApp, SearchUI, StartMenuExperienceHost, ShellExperienceHost -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Reset dan Daftarkan Ulang Paket Windows Settings (Immersive Control Panel)
Write-Host "`n2. Meregistrasi ulang Windows Settings (Immersive Control Panel)..."
try {
    Get-AppxPackage *immersivecontrolpanel* -AllUsers | ForEach-Object {
        Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"
    }
    Write-Host "Windows Settings berhasil diregistrasi ulang."
} catch {
    Write-Host "Catatan Settings: $_"
}

# 3. Reset dan Daftarkan Ulang Windows Search & Start Menu
Write-Host "`n3. Meregistrasi ulang Windows Search & Shell Experience..."
try {
    Get-AppxPackage *Microsoft.Windows.Search* -AllUsers | ForEach-Object {
        Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"
    }
    Get-AppxPackage *Microsoft.Windows.ShellExperienceHost* -AllUsers | ForEach-Object {
        Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"
    }
    Get-AppxPackage *Microsoft.Windows.StartMenuExperienceHost* -AllUsers | ForEach-Object {
        Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"
    }
    Get-AppxPackage *Microsoft.Windows.Cortana* -AllUsers | ForEach-Object {
        Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"
    }
    Write-Host "Windows Search & Shell berhasil diregistrasi ulang."
} catch {
    Write-Host "Catatan Search: $_"
}

# 4. Restart Windows Search Service
Write-Host "`n4. Merestart layanan Windows Search (WSearch)..."
try {
    Set-Service -Name WSearch -StartupType Automatic
    Restart-Service -Name WSearch -Force
    Write-Host "Layanan WSearch berhasil direstart."
} catch {
    Write-Host "Catatan WSearch: $_"
}

# 5. Jalankan Explorer kembali
Write-Host "`n5. Menjalankan kembali Windows Explorer..."
Start-Process explorer.exe

Write-Host "`nProses perbaikan selesai!"
