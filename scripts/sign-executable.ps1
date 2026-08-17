# ==============================================================================
# Ka4f El-Tolab - Authenticode Code Signing Utility
# ==============================================================================

[CmdletBinding()]
param(
    [string]$FilePath = "build\bin\Ka4f-el-tolab.exe",
    [string]$SubjectName = "Ka4f El Tolab (Abanoub Nashaat)",
    [switch]$InstallToTrustedRoot
)

$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $rootDir

if (-not (Test-Path $FilePath)) {
    Write-Error "Target binary not found: $FilePath"
    exit 1
}

# Look for existing certificate
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*$SubjectName*" -or $_.Subject -like "*Abanoub Nashaat*" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Generating a new self-signed Code Signing Certificate..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$SubjectName" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(5)
    
    Write-Host "Created certificate: $($cert.Thumbprint)" -ForegroundColor Green
}

Write-Host "Signing $FilePath with certificate: $($cert.Subject)" -ForegroundColor Cyan
$res = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -HashAlgorithm SHA256

Write-Host "Signature Result: $($res.Status) - $($res.StatusMessage)" -ForegroundColor Green

if ($InstallToTrustedRoot) {
    Write-Host "`nTo trust this certificate on this machine, run the following in an Admin PowerShell:" -ForegroundColor Yellow
    Write-Host "Import-Certificate -FilePath `"$($cert.Thumbprint).cer`" -CertStoreLocation Cert:\LocalMachine\Root" -ForegroundColor White
}
