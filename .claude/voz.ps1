# Capa de voz: lee en voz alta la respuesta final COMPLETA de Claude, como el modo voz de claude.ai.
# Lo invoca el hook Stop (.claude/settings.json). Antes de hablar limpia el markdown:
#   - bloques de codigo y tablas no se leen; se avisa que quedaron en pantalla.
#   - <!-- voz: ... --> se lee en su lugar (sirve para narrar una tabla o un bloque de codigo).
#   - enlaces, wikilinks, rutas, URLs, emojis y simbolos de formato se limpian.
#   - cola: cada respuesta se forma detras de la anterior; ninguna corta a otra (pedido 2026-10-16).
# Interruptor: si existe .claude/voz.off no habla (comando /voz). -Stop calla y vacia la cola.
param(
    [switch]$DryRun,   # imprime el texto limpio sin hablar
    [switch]$Worker,   # lector de la cola (lo lanza el propio script)
    [switch]$Stop,     # corta la lectura actual y vacia la cola
    [switch]$Skip      # corta solo la lectura actual y sigue con la siguiente (/callar)
)

$ErrorActionPreference = 'Stop'
$claudeDir = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $env:TEMP 'claude-voz.pid'
$queueDir = Join-Path $env:TEMP 'claude-voz-cola'

# Lee un archivo de texto en voz alta. Voz neuronal de Microsoft (edge-tts, en linea);
# sin internet o sin edge-tts cae a Sabina.
function Hablar([string]$archivo) {
    $voz = 'es-CO-SalomeNeural'   # elegida con Santiago (2026-10-16); alternativas: es-CO-GonzaloNeural, es-MX-DaliaNeural
    $mp3 = [IO.Path]::ChangeExtension($archivo, '.mp3')
    try {
        & python -m edge_tts --voice $voz --rate '+5%' --file $archivo --write-media $mp3 2>$null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $mp3)) { throw 'edge-tts fallo' }
        Add-Type -AssemblyName PresentationCore
        $player = New-Object System.Windows.Media.MediaPlayer
        $player.Open([uri]$mp3)
        $i = 0
        while (-not $player.NaturalDuration.HasTimeSpan -and $i -lt 50) { Start-Sleep -Milliseconds 100; $i++ }
        $player.Play()
        $fin = $player.NaturalDuration.TimeSpan
        while ($player.Position -lt $fin) { Start-Sleep -Milliseconds 200 }
        $player.Close()
        Remove-Item $mp3 -ErrorAction SilentlyContinue
        return
    } catch { Remove-Item $mp3 -ErrorAction SilentlyContinue }

    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try { $synth.SelectVoice('Microsoft Sabina Desktop') } catch {}
    $synth.Rate = 2   # -10 a 10; ajustado con Santiago (2026-10-14)
    $synth.Speak([IO.File]::ReadAllText($archivo, [Text.Encoding]::UTF8))
}

if ($Stop) {
    Remove-Item (Join-Path $queueDir '*') -ErrorAction SilentlyContinue
    $old = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($old) { Stop-Process -Id $old -Force -ErrorAction SilentlyContinue }
    exit 0
}

if ($Skip) {
    $old = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($old) { Stop-Process -Id $old -Force -ErrorAction SilentlyContinue }
    # Lo que sonaba es el archivo mas viejo de la cola: se descarta y el resto sigue.
    $actual = Get-ChildItem $queueDir -Filter *.txt -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -First 1
    if ($actual) { Remove-Item ([IO.Path]::ChangeExtension($actual.FullName, '*')) -ErrorAction SilentlyContinue }
    Start-Process powershell -WindowStyle Hidden -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Worker')
    exit 0
}

# Lector de la cola: un solo proceso a la vez (mutex con nombre); lee del mas viejo al mas nuevo.
if ($Worker) {
    $mutex = New-Object Threading.Mutex($false, 'Local\claude-voz-cola')
    while ($true) {
        try { if (-not $mutex.WaitOne(0)) { exit 0 } } catch [Threading.AbandonedMutexException] {}
        Set-Content -Path $pidFile -Value $PID
        while ($f = Get-ChildItem $queueDir -Filter *.txt -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -First 1) {
            try { Hablar $f.FullName } catch {}
            Remove-Item $f.FullName -ErrorAction SilentlyContinue
        }
        $mutex.ReleaseMutex()
        # Si entro algo justo al soltar el mutex, se vuelve a intentar; si no, se termina.
        if (-not (Get-ChildItem $queueDir -Filter *.txt -ErrorAction SilentlyContinue)) { exit 0 }
    }
}

if (-not $DryRun -and (Test-Path (Join-Path $claudeDir 'voz.off'))) { exit 0 }

# Claude Code manda UTF-8; PowerShell 5.1 leeria stdin con la pagina OEM y dañaria tildes y eñes.
$stdin = New-Object IO.StreamReader([Console]::OpenStandardInput(), (New-Object Text.UTF8Encoding $false))
$inputJson = $stdin.ReadToEnd() | ConvertFrom-Json

# Texto de la respuesta final: del payload si viene, si no del transcript (solo el turno actual).
$text = $inputJson.last_assistant_message
if (-not $text -and $inputJson.transcript_path -and (Test-Path $inputJson.transcript_path)) {
    $lines = Get-Content -LiteralPath $inputJson.transcript_path -Encoding UTF8 -Tail 400
    $parts = @()
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        try { $entry = $lines[$i] | ConvertFrom-Json } catch { continue }
        $content = $entry.message.content
        if ($entry.type -eq 'user') {
            # Un prompt real del usuario marca el inicio del turno; los tool_result no.
            if ($content -is [string] -or ($content | Where-Object { $_.type -ne 'tool_result' })) { break }
            continue
        }
        if ($entry.type -eq 'assistant') {
            $parts = @($content | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }) + $parts
        }
    }
    $text = $parts -join "`n"
}
if (-not $text) { exit 0 }

# --- De markdown a texto hablado ---
$t = $text -replace "`r", ''

# Bloques de codigo y tablas: no se leen.
$t = [regex]::Replace($t, '(?s)```.*?(```|$)', "`nTe dejé código en pantalla.`n")
$t = [regex]::Replace($t, '(?m)(^[ \t]*\|.*\n?)+', "`nTe dejé una tabla en pantalla.`n")

# Comentarios: los de voz se leen tal cual, el resto se descarta.
$t = [regex]::Replace($t, '<!--\s*voz:\s*([\s\S]*?)\s*-->', { param($m) "`n" + $m.Groups[1].Value + "`n" })
$t = [regex]::Replace($t, '(?s)<!--.*?-->', '')

# Enlaces e imagenes.
$t = [regex]::Replace($t, '!\[[^\]]*\]\([^)]*\)', '')
$t = [regex]::Replace($t, '!?\[\[([^\]|]+\|)?([^\]]+)\]\]', '$2')
$t = [regex]::Replace($t, '\[([^\]]+)\]\([^)]*\)', '$1')
$t = [regex]::Replace($t, 'https?://\S+', '')

# Codigo en linea: una ruta se reduce a su ultimo tramo; lo demas pierde las comillas.
$t = [regex]::Replace($t, '`([^`\n]+)`', {
    param($m)
    $v = $m.Groups[1].Value
    if ($v -match '[\\/]') { $v = ($v.TrimEnd('/', '\') -split '[\\/]')[-1] }
    $v
})

# Simbolos frecuentes.
$t = $t -replace '→|->|=>', ', ' -replace '←|<-', ' desde ' -replace '≤', ' hasta ' -replace '≥', ' al menos ' -replace '~(?=\d)', 'unos '
$t = $t -replace '[\uD800-\uDFFF]', '' -replace '[←-⇿⌀-⯿☀-➿️‍]', ''

# Formato por linea: encabezados, vinetas, citas, separadores, negritas.
$out = foreach ($line in $t -split "`n") {
    $l = $line -replace '^\s*#{1,6}\s*', '' -replace '^\s*>\s?', '' -replace '^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s*)?', ''
    if ($l -match '^\s*([-*_=]\s*){3,}$') { continue }
    $l = $l -replace '(\*\*|__|\*|~~)', '' -replace '(?<=\s|^)_(?=\S)|(?<=\S)_(?=\s|$)', ''
    $l = $l.Trim()
    if (-not $l) { continue }
    # Cada linea cierra con signo, para que Sabina haga la pausa.
    if ($l -notmatch '[.!?:;,]$') { $l += '.' }
    $l
}
$frase = ($out -join ' ') -replace '\s{2,}', ' '
$frase = $frase.Trim()
if (-not $frase) { exit 0 }
if ($DryRun) { $frase; exit 0 }

# A la cola, detras de lo que ya este sonando; el nombre por ticks mantiene el orden.
New-Item -ItemType Directory -Force $queueDir | Out-Null
$tmp = Join-Path $queueDir ("{0}.txt" -f [DateTime]::Now.Ticks)
[IO.File]::WriteAllText($tmp, $frase, (New-Object Text.UTF8Encoding $false))
# Si ya hay un lector, el nuevo sale solo al no conseguir el mutex.
Start-Process powershell -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Worker')
exit 0
