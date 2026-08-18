$action = New-ScheduledTaskAction -Execute "C:\tools\nodejs\pm2.cmd" -Argument "resurrect"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Register-ScheduledTask -TaskName "StarlinkManagerPM2" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
    Write-Host "Auto-start scheduled task configured successfully."
} catch {
    Write-Host "Task scheduler registration note: $_"
}
