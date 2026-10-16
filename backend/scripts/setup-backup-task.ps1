<#
.SYNOPSIS
    EVAL Windows Scheduled Task Automation Script
    Configures, inspects, executes, and removes the automated daily backup task for EVAL.

.DESCRIPTION
    Manages the Windows Task Scheduler task "EVAL_Daily_Backup" for the school server using native PowerShell ScheduledTasks cmdlets.
    - install: Registers the scheduled task to execute backend/scripts/backup.ps1 daily at 23:00 (or specified time).
    - status: Checks the current configuration and last run status of the task.
    - run-now: Triggers an immediate execution of the backup task.
    - uninstall: Removes the scheduled task from Windows Task Scheduler.

.PARAMETER Action
    Operation to perform: 'install', 'status', 'run-now', 'uninstall'. Default: 'status'.

.PARAMETER Time
    Daily execution time in 24h format (HH:mm). Default: '23:00'.

.PARAMETER RetentionCount
    Number of daily backups to preserve before rolling deletion. Default: 7.
#>

param(
    [ValidateSet('install', 'status', 'run-now', 'uninstall')][string]$Action = 'status',
    [string]$Time = "23:00",
    [int]$RetentionCount = 7
)

$ErrorActionPreference = 'Stop'
$TaskName = "EVAL_Daily_Backup"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = [IO.Path]::GetFullPath((Join-Path $scriptDir "..\.."))
$backupScript = Join-Path $repo "backend\scripts\backup.ps1"

if (!(Test-Path -LiteralPath $backupScript)) {
    throw "Backup script not found at: $backupScript"
}

$powershellExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
if (!(Test-Path -LiteralPath $powershellExe)) {
    $powershellExe = "powershell.exe"
}

$taskArguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$backupScript`" -RetentionCount $RetentionCount"

switch ($Action) {
    'install' {
        Write-Host "[EVAL Task Scheduler] Configuring automated daily backup task '$TaskName'..." -ForegroundColor Cyan
        
        try {
            $actionObj = New-ScheduledTaskAction -Execute $powershellExe -Argument $taskArguments -WorkingDirectory $repo
            $triggerObj = New-ScheduledTaskTrigger -Daily -At $Time
            $settingsObj = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
            
            $null = Register-ScheduledTask -TaskName $TaskName -Action $actionObj -Trigger $triggerObj -Settings $settingsObj -Force
            
            Write-Host "[EVAL Task Scheduler] Task '$TaskName' successfully registered!" -ForegroundColor Green
            Write-Host "  Frequency: Daily at $Time"
            Write-Host "  Target script: $backupScript"
            Write-Host "  Retention: $RetentionCount archives"
            Write-Host "  Working dir: $repo"
        } catch {
            Write-Host "[EVAL Task Scheduler] Fallback to schtasks.exe..." -ForegroundColor Yellow
            $cmd = "`"$powershellExe`" $taskArguments"
            $p = Start-Process -FilePath "schtasks.exe" -ArgumentList @(
                "/Create", "/TN", $TaskName, "/TR", $cmd, "/SC", "DAILY", "/ST", $Time, "/F"
            ) -Wait -PassThru -NoNewWindow
            if ($p.ExitCode -eq 0) {
                Write-Host "[EVAL Task Scheduler] Task '$TaskName' successfully registered via schtasks!" -ForegroundColor Green
            } else {
                throw "Failed to register scheduled task: $_"
            }
        }
    }

    'status' {
        Write-Host "[EVAL Task Scheduler] Inspecting status for task '$TaskName'..." -ForegroundColor Cyan
        try {
            $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
            $info = Get-ScheduledTaskInfo -TaskName $TaskName
            Write-Host "  State: $($task.State)" -ForegroundColor Green
            Write-Host "  Last Run Time: $($info.LastRunTime)"
            Write-Host "  Last Result Code: $($info.LastTaskResult)"
            Write-Host "  Next Run Time: $($info.NextRunTime)"
        } catch {
            Write-Host "[EVAL Task Scheduler] Task '$TaskName' is currently NOT installed." -ForegroundColor Yellow
            Write-Host "Run with -Action install to schedule daily automated backups."
        }
    }

    'run-now' {
        Write-Host "[EVAL Task Scheduler] Triggering immediate execution of '$TaskName'..." -ForegroundColor Cyan
        try {
            Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
            Write-Host "[EVAL Task Scheduler] Backup task started successfully in background." -ForegroundColor Green
        } catch {
            $run = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/Run", "/TN", $TaskName) -Wait -PassThru -NoNewWindow
            if ($run.ExitCode -eq 0) {
                Write-Host "[EVAL Task Scheduler] Backup task started successfully in background via schtasks." -ForegroundColor Green
            } else {
                throw "Failed to trigger scheduled task '$TaskName': $_"
            }
        }
    }

    'uninstall' {
        Write-Host "[EVAL Task Scheduler] Removing task '$TaskName'..." -ForegroundColor Cyan
        try {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
            Write-Host "[EVAL Task Scheduler] Task '$TaskName' successfully removed." -ForegroundColor Green
        } catch {
            $del = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/Delete", "/TN", $TaskName, "/F") -Wait -PassThru -NoNewWindow
            if ($del.ExitCode -eq 0) {
                Write-Host "[EVAL Task Scheduler] Task '$TaskName' successfully removed via schtasks." -ForegroundColor Green
            } else {
                Write-Host "[EVAL Task Scheduler] Task '$TaskName' was not found." -ForegroundColor Yellow
            }
        }
    }
}
