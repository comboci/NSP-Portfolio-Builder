# NSP Portfolio Builder - Research downloader (Windows PowerShell 5.1+)
# Run from its repository folder. No folder selection, no browser/CORS dependency.
# Only the HTTPS URLs in resources-manifest.json are contacted.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$destination = Join-Path $root 'NSP_Research_Resources'
$manifestPath = Join-Path $PSScriptRoot 'resources-manifest.json'
$reportPath = Join-Path $destination 'download-report.json'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'resources-manifest.json is missing.' }
$data = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$items = @($data.resources)
$results = New-Object System.Collections.Generic.List[object]
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(90)
$client.DefaultRequestHeaders.UserAgent.ParseAdd('NSP-Portfolio-Builder-Research/1.0')

function Test-NSPPdf([string] $path) {
    if (-not (Test-Path -LiteralPath $path)) { return $false }
    $fs = [IO.File]::OpenRead($path)
    try {
        if ($fs.Length -lt 8) { return $false }
        $head = New-Object byte[] 5
        if ($fs.Read($head,0,5) -ne 5 -or [Text.Encoding]::ASCII.GetString($head) -ne '%PDF-') { return $false }
        $tailLength = [int][Math]::Min(4096,$fs.Length)
        $tail = New-Object byte[] $tailLength
        [void]$fs.Seek(-$tailLength,[IO.SeekOrigin]::End)
        [void]$fs.Read($tail,0,$tailLength)
        return [Text.Encoding]::ASCII.GetString($tail).Contains('%%EOF')
    } finally { $fs.Dispose() }
}

try {
    $index = 0
    foreach ($item in $items) {
        $index++
        $state = 'failed'
        $attempts = 0
        $message = ''
        $bytes = 0
        $url = [string]$item.url
        $name = [string]$item.filename
        $target = Join-Path $destination $name
        Write-Host ('[{0}/{1}] {2} - {3}' -f $index,$items.Count,$item.company,$item.title) -ForegroundColor Cyan

        if (-not $item.direct) {
            $state = 'publisher_page'
            $message = 'Source is an HTML publisher page; no PDF was saved.'
            Write-Host ('  SKIPPED - Publisher page: {0}' -f $url) -ForegroundColor Yellow
        } elseif ($url -notmatch '^https://') {
            $message = 'Rejected: URL must be HTTPS.'
            Write-Host ('  FAILED - {0}' -f $message) -ForegroundColor Red
        } elseif (Test-NSPPdf $target) {
            $state = 'existing_valid_pdf'
            $bytes = (Get-Item -LiteralPath $target).Length
            $message = 'Existing local PDF passed validation.'
            Write-Host '  Valid PDF already exists.' -ForegroundColor Green
        } else {
            for ($attempt = 1; $attempt -le 3; $attempt++) {
                $attempts = $attempt
                $tmp = "$target.part"
                if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
                $response = $null
                $stream = $null
                $output = $null
                try {
                    Write-Host ('  Attempt {0}/3...' -f $attempt)
                    $response = $client.GetAsync($url,[System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
                    if (-not $response.IsSuccessStatusCode) { throw ('HTTP ' + [int]$response.StatusCode) }
                    $type = [string]$response.Content.Headers.ContentType
                    if ($type -match 'text/html') { throw 'Publisher returned HTML instead of a PDF.' }
                    $length = $response.Content.Headers.ContentLength
                    if ($length -and $length -gt 73400320) { throw 'File exceeds 70 MB safety limit.' }
                    $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
                    $output = [IO.File]::Open($tmp,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::None)
                    $buffer = New-Object byte[] 65536
                    $bytes = 0
                    while (($read = $stream.Read($buffer,0,$buffer.Length)) -gt 0) {
                        $output.Write($buffer,0,$read)
                        $bytes += $read
                        if ($bytes -gt 73400320) { throw 'File exceeds 70 MB safety limit.' }
                        if ($length -and $length -gt 0) {
                            $percent = [int][Math]::Min(99,100*$bytes/$length)
                            Write-Progress -Activity ('Downloading '+$item.company) -Status $item.title -PercentComplete $percent
                        }
                    }
                    $output.Dispose(); $output=$null
                    Write-Progress -Activity ('Downloading '+$item.company) -Completed
                    if (-not (Test-NSPPdf $tmp)) { throw 'Response is missing PDF signature or EOF; not saved.' }
                    Move-Item -LiteralPath $tmp -Destination $target -Force
                    $state = 'verified_saved'
                    $message = 'Verified PDF saved to project resources folder.'
                    Write-Host ('  SAVED: {0} ({1} bytes)' -f $name,$bytes) -ForegroundColor Green
                    break
                } catch {
                    $message = [string]$_.Exception.Message
                    Write-Host ('  FAILED attempt {0}: {1}' -f $attempt,$message) -ForegroundColor Yellow
                    if ($attempt -lt 3) { Start-Sleep -Seconds (2*$attempt) }
                } finally {
                    if ($output) { $output.Dispose() }
                    if ($stream) { $stream.Dispose() }
                    if ($response) { $response.Dispose() }
                    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
                    Write-Progress -Activity ('Downloading '+$item.company) -Completed
                }
            }
        }
        $results.Add([pscustomobject]@{
            company = $item.company; title = $item.title; url = $url
            filename = $name; status = $state; attempts = $attempts
            bytes = $bytes; message = $message
        })
    }
} finally {
    $client.Dispose()
    $summary = [pscustomobject]@{
        generatedAt = (Get-Date).ToString('o'); outputFolder = $destination
        resources = @($results.ToArray())
    }
    $summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8
}
Write-Host ('Finished. Verified files: {0}; Already existed: {1}; Failed: {2}; Publisher pages: {3}' -f
    @($results | Where-Object status -eq 'verified_saved').Count,
    @($results | Where-Object status -eq 'existing_valid_pdf').Count,
    @($results | Where-Object status -eq 'failed').Count,
    @($results | Where-Object status -eq 'publisher_page').Count)
Write-Host ('Resources folder: {0}' -f $destination)
Write-Host ('Report: {0}' -f $reportPath)
