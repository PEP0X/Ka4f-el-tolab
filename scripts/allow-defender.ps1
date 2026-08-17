# ==============================================================================
# Ka4f El-Tolab - Windows Defender Exclusion Helper
# ==============================================================================
# Run this script in PowerShell as Administrator if Windows Defender blocks
# development builds or binaries.

#Requires -RunAsAdministrator

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Ka4f El-Tolab - Windows Defender Whitelisting" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$projectRoot = (Get-Item $PSScriptRoot).Parent.FullName
$binPath = Join-Path $projectRoot "build\bin\Ka4f-el-tolab.exe"

Write-Host "`nAdding exclusions to Windows Defender..." -ForegroundColor Yellow

try {
    # Add folder exclusion for project build directory
    Add-MpPreference -ExclusionPath (Join-Path $projectRoot "build\bin")
    Write-Host "[+] Added directory exclusion: $projectRoot\build\bin" -ForegroundColor Green

    # Add process exclusion for the application
    Add-MpPreference -ExclusionProcess "Ka4f-el-tolab.exe"
    Write-Host "[+] Added process exclusion: Ka4f-el-tolab.exe" -ForegroundColor Green

    Write-Host "`nSuccessfully added exclusions to Windows Defender!" -ForegroundColor Green
} catch {
    Write-Error "Failed to add exclusion: $_"
}
