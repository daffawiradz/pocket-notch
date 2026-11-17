$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime

Add-Type -TypeDefinition @"
using System;
using System.Collections.Concurrent;
using System.Threading;
public static class StdinPump {
  public static ConcurrentQueue<string> Q = new ConcurrentQueue<string>();
  public static void Start() {
    Thread t = new Thread(delegate() {
      string l;
      while ((l = Console.In.ReadLine()) != null) { Q.Enqueue(l); }
      Q.Enqueue("__EOF__");
    });
    t.IsBackground = true;
    t.Start();
  }
}
"@
[StdinPump]::Start()

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($op, $type) {
  $m = $asTaskGeneric.MakeGenericMethod($type)
  $t = $m.Invoke($null, @($op))
  if ($t.Wait(4000)) { return $t.Result }
  return $null
}

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

function Emit($obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 4
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

function Get-Thumb($props) {
  try {
    $ref = $props.Thumbnail
    if (-not $ref) { return $null }
    $stream = Await ($ref.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    if (-not $stream) { return $null }
    $ct = $stream.ContentType
    if (-not $ct) { $ct = 'image/jpeg' }
    $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
    $ms = New-Object System.IO.MemoryStream
    $net.CopyTo($ms)
    $net.Dispose()
    if ($ms.Length -lt 100 -or $ms.Length -gt 3000000) { return $null }
    return ('data:' + $ct + ';base64,' + [Convert]::ToBase64String($ms.ToArray()))
  } catch { return $null }
}

if (-not $mgr) { Emit @{ error = 'smtc-unavailable' }; exit 1 }

$lastKey = ''
$thumbTries = 0
$haveThumb = $false

while ($true) {
  # ---- perintah dari Electron ----
  $cmd = $null
  while ([StdinPump]::Q.TryDequeue([ref]$cmd)) {
    if ($cmd -eq '__EOF__') { exit }
    $cs = $mgr.GetCurrentSession()
    if ($cs) {
      if ($cmd -eq 'playpause') { $null = Await ($cs.TryTogglePlayPauseAsync()) ([bool]) }
      elseif ($cmd -eq 'play') { $null = Await ($cs.TryPlayAsync()) ([bool]) }
      elseif ($cmd -eq 'pause') { $null = Await ($cs.TryPauseAsync()) ([bool]) }
      elseif ($cmd -eq 'next') { $null = Await ($cs.TrySkipNextAsync()) ([bool]) }
      elseif ($cmd -eq 'prev') { $null = Await ($cs.TrySkipPreviousAsync()) ([bool]) }
      elseif ($cmd -match '^seek ([0-9]+(\.[0-9]+)?)$') {
        $ticks = [long]([double]$Matches[1] * 10000000)
        $null = Await ($cs.TryChangePlaybackPositionAsync($ticks)) ([bool])
      }
    }
    $cmd = $null
  }

  # ---- state ----
  $s = $mgr.GetCurrentSession()
  if (-not $s) {
    Emit @{ active = $false }
    $lastKey = ''
    Start-Sleep -Milliseconds 700
    continue
  }

  $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  if (-not $props) { Start-Sleep -Milliseconds 500; continue }

  $title = [string]$props.Title
  $artist = [string]$props.Artist
  $album = [string]$props.AlbumTitle
  $key = $title + '|' + $artist + '|' + $album

  $thumb = $null
  if ($key -ne $lastKey) {
    $lastKey = $key
    $thumbTries = 0
    $haveThumb = $false
  }
  if (-not $haveThumb -and $thumbTries -lt 6) {
    $thumbTries++
    $thumb = Get-Thumb $props
    if ($thumb) { $haveThumb = $true }
  }

  $pb = $s.GetPlaybackInfo()
  $tl = $s.GetTimelineProperties()
  $status = $pb.PlaybackStatus.ToString()
  $pos = [double]$tl.Position.TotalSeconds
  $dur = [double]($tl.EndTime.TotalSeconds - $tl.StartTime.TotalSeconds)

  if ($status -eq 'Playing') {
    $lu = $tl.LastUpdatedTime
    if ($lu.Year -gt 2000) {
      $delta = ([DateTimeOffset]::UtcNow - $lu).TotalSeconds
      if ($delta -gt 0 -and $delta -lt 3600) { $pos += $delta }
    }
  }
  if ($dur -gt 0 -and $pos -gt $dur) { $pos = $dur }
  if ($pos -lt 0) { $pos = 0 }

  Emit ([ordered]@{
    active = $true
    status = $status
    title  = $title
    artist = $artist
    album  = $album
    pos    = [math]::Round($pos, 2)
    dur    = [math]::Round($dur, 2)
    app    = [string]$s.SourceAppUserModelId
    thumb  = $thumb
  })

  Start-Sleep -Milliseconds 500
}
