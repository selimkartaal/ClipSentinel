# ============================================================
#  ClipSentinel UDP Listener - Chunked
#  Kullanim: .\listener.ps1 -Port 5600
# ============================================================
param(
    [int]$Port    = 5600,
    [int]$Timeout = 5      # chunk bekleme suresi (saniye)
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$udpClient      = New-Object System.Net.Sockets.UdpClient($Port)
$remoteEndpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)

# chunk buffer: @{ msgId = @{ total=N; chunks=@{0="...", 1="..."} ; lastSeen=datetime } }
$buffer  = @{}
$counter = 0

Write-Host ""
Write-Host "  ClipSentinel Listener" -ForegroundColor Cyan
Write-Host "  Port       : $Port"    -ForegroundColor Cyan
Write-Host "  Protokol   : UDP (Chunked)" -ForegroundColor Cyan
Write-Host "  Durdurmak icin Ctrl+C" -ForegroundColor DarkGray
Write-Host ""
Write-Host ("=" * 80) -ForegroundColor DarkGray

# ── Gelen mesaji isleyen fonksiyon ───────────────────────────────────────────
function Process-Message {
    param([string]$raw, [string]$src)

    $script:counter++
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Host ""
    Write-Host "[$ts]" -ForegroundColor DarkGray -NoNewline
    Write-Host " #$($script:counter)" -ForegroundColor Yellow -NoNewline
    Write-Host " | $src" -ForegroundColor Green -NoNewline
    Write-Host " | $($raw.Length) chars" -ForegroundColor DarkGray

    # ── RAW ─────────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "  [ RAW ]" -ForegroundColor DarkYellow
    Write-Host "  $raw" -ForegroundColor White
    Write-Host ""

    # ── PARSED ──────────────────────────────────────────────────────────────
    if ($raw.StartsWith("CEF:")) {
        Write-Host "  [ CEF - PARSED ]" -ForegroundColor Magenta

        $parts = $raw -split "\|", 8
        if ($parts.Count -ge 8) {
            Write-Host "  Version  : $($parts[0])"  -ForegroundColor Cyan
            Write-Host "  Vendor   : $($parts[1])"  -ForegroundColor Cyan
            Write-Host "  Product  : $($parts[2])"  -ForegroundColor Cyan
            Write-Host "  DevVer   : $($parts[3])"  -ForegroundColor Cyan
            Write-Host "  SigID    : $($parts[4])"  -ForegroundColor Cyan
            Write-Host "  Name     : $($parts[5])"  -ForegroundColor Cyan
            Write-Host "  Severity : $($parts[6])"  -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  [ CEF EXTENSION FIELDS ]" -ForegroundColor Magenta

            $ext     = $parts[7]
            $pattern = '(\w+)=((?:(?!\s\w+=).)*)'
            $matches = [regex]::Matches($ext, $pattern)
            foreach ($m in $matches) {
                $key = $m.Groups[1].Value.PadRight(12)
                $val = $m.Groups[2].Value.Trim()
                # CEF unescape
                $val = $val -replace "\\n", "`n                " -replace "\\t", "`t" -replace "\\\\", "\"
                $val = $val -replace "\\=", "=" -replace "\\\\\|", "|"
                Write-Host "    $key : $val" -ForegroundColor White
            }
        } else {
            Write-Host "  CEF parse edilemedi." -ForegroundColor Red
        }
    }
    elseif ($raw.StartsWith("{") -or $raw.StartsWith("[")) {
        Write-Host "  [ JSON - PARSED ]" -ForegroundColor Magenta
        try {
            $json   = $raw | ConvertFrom-Json
            $pretty = $json | ConvertTo-Json -Depth 10
            $pretty -split "`n" | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
        } catch {
            Write-Host "  JSON parse edilemedi: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  [ UNKNOWN FORMAT ]" -ForegroundColor DarkGray
        Write-Host "  $raw" -ForegroundColor White
    }

    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor DarkGray
}

# ── Eski yarim kalan chunk'lari temizle ──────────────────────────────────────
function Cleanup-Buffer {
    $now     = Get-Date
    $expired = @()
    foreach ($key in $script:buffer.Keys) {
        $age = ($now - $script:buffer[$key].lastSeen).TotalSeconds
        if ($age -gt $script:Timeout) {
            $expired += $key
            Write-Host "  [WARN] Eksik chunk zaman asimi: msgId=$key" -ForegroundColor DarkYellow
        }
    }
    foreach ($key in $expired) { $script:buffer.Remove($key) }
}

# ── Ana dongu ────────────────────────────────────────────────────────────────
try {
    while ($true) {

        # Zaman asimi icin non-blocking trick
        $udpClient.Client.ReceiveTimeout = 2000
        try {
            $bytes = $udpClient.Receive([ref]$remoteEndpoint)
        } catch [System.Net.Sockets.SocketException] {
            # Timeout — buffer temizle ve devam et
            Cleanup-Buffer
            continue
        }

        $src     = "$($remoteEndpoint.Address):$($remoteEndpoint.Port)"
        $decoded = [System.Text.Encoding]::UTF8.GetString($bytes)

        # ── Chunk mu normal paket mi? ────────────────────────────────────────
        if ($decoded -match '^CLIP\|([a-f0-9]{8})\|(\d+)/(\d+)\|(.*)$') {
            $msgId      = $Matches[1]
            $chunkIdx   = [int]$Matches[2]
            $totalChunks= [int]$Matches[3]
            $chunkData  = $Matches[4]

            # Buffer'a ekle
            if (-not $buffer.ContainsKey($msgId)) {
                $buffer[$msgId] = @{
                    total    = $totalChunks
                    chunks   = @{}
                    lastSeen = Get-Date
                    src      = $src
                }
            }
            $buffer[$msgId].chunks[$chunkIdx] = $chunkData
            $buffer[$msgId].lastSeen = Get-Date

            $received = $buffer[$msgId].chunks.Count
            Write-Host "  [CHUNK] $msgId | $($chunkIdx+1)/$totalChunks alindi" -ForegroundColor DarkGray

            # Tum chunk'lar geldi mi?
            if ($received -ge $totalChunks) {
                # Siralayip birlestir
                $full = ""
                for ($i = 0; $i -lt $totalChunks; $i++) {
                    $full += $buffer[$msgId].chunks[$i]
                }
                $srcAddr = $buffer[$msgId].src
                $buffer.Remove($msgId)
                Process-Message -raw $full -src $srcAddr
            }
        }
        else {
            # Chunk'siz normal paket (TCP fallback veya kucuk veri)
            $raw = $decoded.Trim()
            Process-Message -raw $raw -src $src
        }

        Cleanup-Buffer
    }
}
catch [System.Exception] {
    if ($_.Exception.Message -notmatch "thread abort|interrupted") {
        Write-Host "`nHata: $_" -ForegroundColor Red
    }
}
finally {
    $udpClient.Close()
    Write-Host "`nListener kapatildi. Toplam mesaj: $counter" -ForegroundColor Yellow
}