$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\Project\backup_server.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Register-ScheduledTask -TaskName "StarlinkManagerAutoBackup" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
    Write-Host "Auto-backup scheduled task 'StarlinkManagerAutoBackup' registered successfully (Daily at 02:00 AM)."
} catch {
    Write-Host "Task registration error: $_"
}
