param(
    [Parameter(Mandatory = $true)][string]$SimSrc,
    [string]$Proj = 'Blocks'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Native {
    param([scriptblock]$Cmd, [string]$What)
    & $Cmd
    if ($LASTEXITCODE -ne 0) { throw "$What failed with exit code $LASTEXITCODE" }
}

Remove-Item -Recurse -Force build/sim, build/signalling -EA SilentlyContinue
if ((Test-Path build/sim) -or (Test-Path build/signalling)) {
    throw 'could not clear build/sim or build/signalling (is the sim running?)'
}
New-Item -ItemType Directory -Force build/sim | Out-Null

if (Test-Path -PathType Container -LiteralPath $SimSrc) {
    Get-ChildItem -LiteralPath $SimSrc -Force | Copy-Item -Destination build/sim -Recurse -Force
} else {
    Invoke-Native { & "$env:SystemRoot\System32\tar.exe" -xf $SimSrc -C build/sim } 'tar'
}
if (-not (Test-Path "build/sim/$Proj")) { throw "no $Proj/ at the root of $SimSrc" }

$ws = "build/sim/$Proj/Samples/PixelStreaming/WebServers"
if (-not (Test-Path "$ws/SignallingWebServer")) {
    Push-Location $ws
    try { Invoke-Native { & .\get_ps_servers.bat } 'get_ps_servers.bat' } finally { Pop-Location }
}
Push-Location "$ws/SignallingWebServer"
try { Invoke-Native { & npm install --omit=dev } 'npm install' } finally { Pop-Location }

Move-Item "$ws/SignallingWebServer" build/signalling
if (-not (Test-Path build/signalling/Public/player.html)) { throw 'player.html missing' }

Remove-Item -Recurse -Force "build/sim/$Proj/Samples"
Get-ChildItem build/sim -Recurse -Include *.pdb, onnxruntime_providers_cuda.dll, onnxruntime_providers_tensorrt.dll |
    Remove-Item -Force

if (-not (Test-Path "build/sim/$Proj/Binaries/Win64/$Proj-Win64-Shipping.exe")) {
    throw 'shipping binary missing'
}
Write-Host 'staged: build/sim + build/signalling'
