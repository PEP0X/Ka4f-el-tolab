# ==============================================================================
# Ka4f El-Tolab - Windows Build & Anti-False-Positive Packaging Script
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$Sign,
    [switch]$LegacyLoader,
    [string]$CertThumbprint = ""
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Ka4f El-Tolab - Production Windows Build" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Ensure we run in project root
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $rootDir

# 1. Build Flags Configuration
$tags = @()
if ($LegacyLoader) {
    Write-Host "[INFO] Using native WebView2 loader tag..." -ForegroundColor Yellow
    $tags += "native_webview2loader"
}

$buildCmd = "wails build -platform windows/amd64 -trimpath -ldflags `"-s -w -H windowsgui`""
if ($tags.Count -gt 0) {
    $buildCmd += " -tags " + ($tags -join ",")
}

Write-Host "`n[1/3] Compiling application with anti-heuristic flags..." -ForegroundColor Green
Write-Host "Command: $buildCmd" -ForegroundColor DarkGray
Invoke-Expression $buildCmd

$exePath = Join-Path $rootDir "build\bin\Ka4f-el-tolab.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "[ERROR] Build failed or executable not found at $exePath"
    exit 1
}

Write-Host "`n[2/3] Build succeeded: $exePath" -ForegroundColor Green

# 2. Optional Authenticode Code Signing
if ($Sign) {
    Write-Host "`n[3/3] Applying Authenticode Signature..." -ForegroundColor Green
    $cert = $null
    if ($CertThumbprint) {
        $cert = Get-Item "Cert:\CurrentUser\My\$CertThumbprint" -ErrorAction SilentlyContinue
    }
    if (-not $cert) {
        $cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*Ka4f*" -or $_.Subject -like "*Abanoub Nashaat*" } | Select-Object -First 1
    }

    if ($cert) {
        Write-Host "Signing with certificate: $($cert.Subject) ($($cert.Thumbprint))" -ForegroundColor Cyan
        Set-AuthenticodeSignature -FilePath $exePath -Certificate $cert -HashAlgorithm SHA256
        Write-Host "Executable signed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No code signing certificate found in Cert:\CurrentUser\My. Run .\scripts\sign-executable.ps1 to generate one." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/3] Code signing skipped (use -Sign to enable)." -ForegroundColor Gray
}

Write-Host "`n[DONE] Production build is ready in build\bin\Ka4f-el-tolab.exe`n" -ForegroundColor Cyan
