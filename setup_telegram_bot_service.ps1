$taskName = "StarlinkTelegramBot"
$nodePath = "C:\tools\nodejs\node.exe"
$botScript = "C:\Project\telegram_bot.js"

$action = New-ScheduledTaskAction -Execute $nodePath -Argument $botScript -WorkingDirectory "C:\Project"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
    Write-Host "Telegram Bot scheduled task '$taskName' registered successfully (auto-start at boot)."
} catch {
    Write-Host "Error: $_"
}
