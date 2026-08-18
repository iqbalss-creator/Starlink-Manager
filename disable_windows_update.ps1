$ErrorActionPreference = 'Continue'

Write-Host "========================================="
Write-Host "   MEMATIKAN WINDOWS AUTO UPDATE         "
Write-Host "========================================="

# 1. Matikan dan Nonaktifkan Layanan Windows Update (Services)
Write-Host "`n1. Menonaktifkan Layanan Windows Update..."

$services = @("wuauserv", "UsoSvc", "WaaSMedicSvc")
foreach ($svc in $services) {
    Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
    Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
}

# Paksa WaaSMedicSvc dan UsoSvc di Registry (karena sering diproteksi sistem)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\wuauserv" -Name "Start" -Value 4 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc" -Name "Start" -Value 4 -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\UsoSvc" -Name "Start" -Value 4 -ErrorAction SilentlyContinue

Write-Host "Layanan wuauserv, WaaSMedicSvc, dan UsoSvc telah dinonaktifkan."

# 2. Terapkan Kebijakan Registry (Group Policy) untuk Blokir Auto Update
Write-Host "`n2. Mengonfigurasi Registry Group Policy Windows Update..."

$wuPolicyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
$wuAUPolicyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"

if (-not (Test-Path $wuPolicyPath)) {
    New-Item -Path $wuPolicyPath -Force | Out-Null
}
if (-not (Test-Path $wuAUPolicyPath)) {
    New-Item -Path $wuAUPolicyPath -Force | Out-Null
}

# NoAutoUpdate = 1 (Matikan Auto Update sepenuhnya)
# AUOptions = 1 (Never check for updates)
# NoAutoRebootWithLoggedOnUsers = 1 (Jangan restart otomatis)
Set-ItemProperty -Path $wuAUPolicyPath -Name "NoAutoUpdate" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $wuAUPolicyPath -Name "AUOptions" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $wuAUPolicyPath -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $wuAUPolicyPath -Name "IncludeRecommendedUpdates" -Value 0 -Type DWord -Force
Set-ItemProperty -Path $wuPolicyPath -Name "DoNotConnectToWindowsUpdateInternetLocations" -Value 1 -Type DWord -Force

Write-Host "Policy Registry NoAutoUpdate = 1 berhasil diterapkan."

# 3. Nonaktifkan Task Scheduler yang menjalankan update otomatis
Write-Host "`n3. Menonaktifkan Task Scheduler Windows Update..."

$tasks = @(
    "\Microsoft\Windows\WindowsUpdate\Scheduled Start",
    "\Microsoft\Windows\WindowsUpdate\Automatic App Update",
    "\Microsoft\Windows\UpdateOrchestrator\Schedule Scan",
    "\Microsoft\Windows\UpdateOrchestrator\Schedule Scan Static",
    "\Microsoft\Windows\UpdateOrchestrator\UpdateModelTask",
    "\Microsoft\Windows\UpdateOrchestrator\USO_UxBroker",
    "\Microsoft\Windows\WaaSMedic\PerformRemediation"
)

foreach ($t in $tasks) {
    try {
        Disable-ScheduledTask -TaskPath ($t.Substring(0, $t.LastIndexOf('\') + 1)) -TaskName ($t.Substring($t.LastIndexOf('\') + 1)) -ErrorAction SilentlyContinue | Out-Null
    } catch {}
}

Write-Host "Task Scheduler Windows Update dinonaktifkan."

Write-Host "`n========================================="
Write-Host "Windows Auto Update berhasil DIMATIKAN! "
Write-Host "========================================="
