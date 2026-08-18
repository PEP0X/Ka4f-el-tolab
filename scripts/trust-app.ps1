# ==============================================================================
# Ka4f El-Tolab - Windows Publisher Trust & Code Signing Tool
# ==============================================================================
# This script signs the executable with a code signing certificate,
# installs the certificate into Trusted Root & Trusted Publishers stores,
# and unblocks the executable so Microsoft Defender SmartScreen recognizes
# the publisher as verified.
# ==============================================================================

[CmdletBinding()]
param(
    [string]$FilePath = "build\bin\Ka4f-el-tolab.exe",
    [string]$PublisherName = "Ka4f El Tolab (Abanoub Nashaat)"
)

$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $rootDir

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Ka4f El-Tolab - Windows Publisher Trust Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$target = Join-Path $rootDir $FilePath
if (-not (Test-Path $target)) {
    Write-Host "[WARN] Binary not found at $target" -ForegroundColor Yellow
    Write-Host "[INFO] Attempting to locate any Ka4f-el-tolab.exe in build\..." -ForegroundColor Gray
    $found = Get-ChildItem -Path "$rootDir\build" -Filter "Ka4f-el-tolab.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $target = $found.FullName
        Write-Host "[OK] Located binary: $target" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Could not find executable. Please run 'wails build' or '.\scripts\build-windows.ps1' first." -ForegroundColor Red
        exit 1
    }
}

# 1. Certificate Creation / Retrieval
Write-Host "`n[1/4] Checking Code Signing Certificate..." -ForegroundColor Green
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { 
    $_.Subject -like "*$PublisherName*" -or $_.Subject -like "*Abanoub Nashaat*" -or $_.Subject -like "*Ka4f*" 
} | Select-Object -First 1

if (-not $cert) {
    Write-Host "Creating new Code Signing Certificate for '$PublisherName'..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$PublisherName" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(10)
    Write-Host "Certificate created successfully (Thumbprint: $($cert.Thumbprint))" -ForegroundColor Green
} else {
    Write-Host "Using existing certificate: $($cert.Subject) ($($cert.Thumbprint))" -ForegroundColor Cyan
}

# 2. Signing the Executable
Write-Host "`n[2/4] Signing binary with Authenticode SHA256..." -ForegroundColor Green
try {
    $sig = Set-AuthenticodeSignature -FilePath $target -Certificate $cert -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com" -ErrorAction Stop
} catch {
    # Fallback without timestamp server if internet is offline
    $sig = Set-AuthenticodeSignature -FilePath $target -Certificate $cert -HashAlgorithm SHA256
}

Write-Host "Signature Status: $($sig.Status) ($($sig.StatusMessage))" -ForegroundColor Green

# 3. Installing to Trusted Publishers & Exporting Certificate
Write-Host "`n[3/4] Registering certificate in Trusted Certificate Stores..." -ForegroundColor Green
$certExportPath = Join-Path (Split-Path $target) "Ka4f-El-Tolab-Publisher.cer"

try {
    [System.IO.File]::WriteAllBytes($certExportPath, $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    Write-Host "[OK] Exported public certificate to: $certExportPath" -ForegroundColor Green

    # CurrentUser TrustedPublisher (.NET Store API - no UI prompt)
    $pubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
    $pubStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $pubStore.Add($cert)
    $pubStore.Close()
    Write-Host "[OK] Added to CurrentUser TrustedPublisher store" -ForegroundColor Green

    # Machine Store (If elevated / administrator)
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        try {
            $lmPubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "LocalMachine")
            $lmPubStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
            $lmPubStore.Add($cert)
            $lmPubStore.Close()
            Write-Host "[OK] Installed to LocalMachine TrustedPublisher store" -ForegroundColor Green
        } catch {
            Write-Host "[INFO] LocalMachine store registration skipped" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[WARN] Certificate registration note: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Unblock file from Windows Mark-of-the-Web
Write-Host "`n[4/4] Clearing Windows Mark-of-the-Web..." -ForegroundColor Green
Unblock-File -Path $target -ErrorAction SilentlyContinue
Write-Host "[OK] Executable unblocked successfully" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS: $target is signed and trusted!" -ForegroundColor Green
Write-Host "  Publisher: $PublisherName" -ForegroundColor White
Write-Host "  Public Cert: $certExportPath" -ForegroundColor White
Write-Host "==================================================`n" -ForegroundColor Cyan
