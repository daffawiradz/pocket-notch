$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Windows.Forms

Add-Type -TypeDefinition @"
using System;
using System.Collections.Concurrent;
using System.Globalization;
using System.Runtime.InteropServices;
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

[ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
  int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
  int OpenPropertyStore(int stgmAccess, out IntPtr props);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
}
[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
  int f();
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] public class MMDeviceEnumeratorComObject { }

public static class Audio {
  public static string Err = "";
  // flow: 0 = output (render), 1 = input (capture). Hasil: "id|volume|mute" atau "" bila tidak ada perangkat (alasan di Err).
  public static string Snap(int flow) {
    Err = "";
    try {
      IMMDeviceEnumerator en = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
      IMMDevice dev = null;
      int hr = en.GetDefaultAudioEndpoint(flow, 1, out dev);
      if (hr != 0 || dev == null) { Err = "GetDefaultAudioEndpoint hr=0x" + hr.ToString("X"); return ""; }
      string id; dev.GetId(out id);
      IAudioEndpointVolume ep = null;
      Guid g = typeof(IAudioEndpointVolume).GUID;
      hr = dev.Activate(ref g, 23, 0, out ep);
      if (hr != 0 || ep == null) { Err = "Activate hr=0x" + hr.ToString("X"); return ""; }
      float v = 0; bool m = false;
      ep.GetMasterVolumeLevelScalar(out v);
      ep.GetMute(out m);
      return id + "|" + v.ToString("0.000", CultureInfo.InvariantCulture) + "|" + (m ? "1" : "0");
    } catch (Exception e) { Err = e.GetType().Name + ": " + e.Message; return ""; }
  }
}

public static class Fs {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public int dwFlags; }
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, System.Text.StringBuilder sb, int n);
  [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int s);

  // Hasil: "" (tidak ada fullscreen) atau "L,T,R,B" = kotak monitor (piksel fisik) tempat aplikasi fullscreen.
  public static string Check() {
    try {
      IntPtr h = GetForegroundWindow();
      if (h == IntPtr.Zero) return "";
      System.Text.StringBuilder sb = new System.Text.StringBuilder(64);
      GetClassName(h, sb, 64);
      string cls = sb.ToString();
      if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd") return "";
      IntPtr mon = MonitorFromWindow(h, 2);
      MONITORINFO mi = new MONITORINFO(); mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
      if (mon == IntPtr.Zero || !GetMonitorInfo(mon, ref mi)) return "";
      RECT r; if (!GetWindowRect(h, out r)) return "";
      bool covers = r.L <= mi.rcMonitor.L && r.T <= mi.rcMonitor.T && r.R >= mi.rcMonitor.R && r.B >= mi.rcMonitor.B;
      int style = GetWindowLong(h, -16);
      bool caption = (style & 0x00C00000) == 0x00C00000;
      int qs = 0; SHQueryUserNotificationState(out qs);
      bool shellSays = (qs == 2 || qs == 3 || qs == 4); // busy / D3D fullscreen / presentation
      if ((covers && !caption) || (covers && shellSays)) {
        return mi.rcMonitor.L + "," + mi.rcMonitor.T + "," + mi.rcMonitor.R + "," + mi.rcMonitor.B;
      }
      return "";
    } catch (Exception) { return ""; }
  }
}

public static class Keys {
  [DllImport("user32.dll")] public static extern short GetKeyState(int k);
}
"@
[StdinPump]::Start()

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await($op, $type) {
  $m = $asTaskGeneric.MakeGenericMethod($type)
  $t = $m.Invoke($null, @($op))
  if ($t.Wait(5000)) { return $t.Result }
  return $null
}

$null = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]
$null = [Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
$null = [Windows.Devices.Bluetooth.BluetoothLEDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
$null = [Windows.Devices.Bluetooth.BluetoothConnectionStatus,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
$null = [Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime]
$null = [Windows.Devices.Enumeration.DeviceInformationCollection,Windows.Devices.Enumeration,ContentType=WindowsRuntime]

function Emit($obj) {
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 4))
  [Console]::Out.Flush()
}

$diagSent = @{}
function Diag($group, $msg) {
  $k = "$group|$msg"
  if ($diagSent[$k]) { return }
  $diagSent[$k] = $true
  Emit @{ ev = 'diag'; group = $group; msg = [string]$msg }
}

function Audio-Name($id) {
  try {
    if ($id -match '\}\.(\{[0-9a-fA-F-]+\})$') {
      $guid = $Matches[1]
      foreach ($kind in 'Render', 'Capture') {
        $p = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\$kind\$guid\Properties"
        if (Test-Path $p) {
          $props = Get-ItemProperty -Path $p
          $desc = $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
          $adapter = $props.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
          if ($desc -and $adapter) { return "$desc ($adapter)" }
          if ($desc) { return [string]$desc }
        }
      }
    }
  } catch {}
  return 'Output audio'
}

function Get-Net {
  try {
    $p = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
    $limited = $false
    if (-not $p) {
      foreach ($c in [Windows.Networking.Connectivity.NetworkInformation]::GetConnectionProfiles()) {
        $lvl = $c.GetNetworkConnectivityLevel().ToString()
        if ($lvl -ne 'None' -and $c.NetworkAdapter) { $p = $c; $limited = $true; break }
      }
    }
    if (-not $p) { return @{ state = 'disconnected' } }
    $type = $p.NetworkAdapter.IanaInterfaceType
    $kind = 'other'
    if ($type -eq 71) { $kind = 'wifi' } elseif ($type -eq 6) { $kind = 'ethernet' }
    return @{ state = 'connected'; kind = $kind; name = [string]$p.ProfileName; limited = $limited }
  } catch { return $null }
}

function Get-Bt {
  $names = @{}
  try {
    $sels = @(
      [Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelectorFromConnectionStatus([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected),
      [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelectorFromConnectionStatus([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected)
    )
    foreach ($sel in $sels) {
      $col = Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($sel)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
      if ($col) { foreach ($d in $col) { if ($d.Name) { $names[[string]$d.Name] = $true } } }
    }
  } catch { return $null }
  return $names
}

$enabled = @{ fs = $true; audio = $true; brightness = $true; net = $true; bt = $true; power = $true; drive = $true; caps = $true }
$seen = @{}          # grup yang sudah punya pembacaan pertama (init)
$last = @{}
$tick = 0
$briFail = 0
$briRetryAt = 0

while ($true) {
  # ---- perintah: "on <grup>" / "off <grup>" ----
  $cmd = $null
  while ([StdinPump]::Q.TryDequeue([ref]$cmd)) {
    if ($cmd -eq '__EOF__') { exit }
    if ($cmd -match '^(on|off) (\w+)$') {
      $enabled[$Matches[2]] = ($Matches[1] -eq 'on')
      if ($Matches[1] -eq 'on') { $seen.Remove($Matches[2]) }   # baca ulang sebagai init agar tidak memicu popup
    }
    $cmd = $null
  }

  # ---- audio: volume, mic, output (tiap 500ms) ----
  if ($enabled.audio) {
    try {
      $init = -not $seen.audio
      $out = [Audio]::Snap(0)
      if ($out) {
        $parts = $out.Split('|')
        $id = $parts[0]
        $vol = [double]::Parse($parts[1], [Globalization.CultureInfo]::InvariantCulture)
        $mute = ($parts[2] -eq '1')
        if ($id -ne $last.outId) {
          $oi = $init
          if (-not $last.outId) { $oi = $true }
          Emit @{ ev = 'audioout'; name = (Audio-Name $id); init = $oi }
          $last.outId = $id
        }
        $changed = $init
        if ($null -eq $last.vol) { $changed = $true }
        elseif ([math]::Abs($vol - $last.vol) -ge 0.005) { $changed = $true }
        elseif ($mute -ne $last.mute) { $changed = $true }
        if ($changed) {
          Emit @{ ev = 'volume'; v = [math]::Round($vol, 3); muted = $mute; init = $init }
          $last.vol = $vol; $last.mute = $mute
        }
      } else { Diag 'volume' ("render: " + [Audio]::Err) }
      $mic = [Audio]::Snap(1)
      if ($mic) {
        $mm = ($mic.Split('|')[2] -eq '1')
        if ($init -or ($null -eq $last.micMute) -or ($mm -ne $last.micMute)) {
          Emit @{ ev = 'mic'; muted = $mm; init = $init }
          $last.micMute = $mm
        }
      } else { Diag 'mic' ("capture: " + [Audio]::Err) }
      $seen.audio = $true
    } catch { Diag 'audio' $_.Exception.Message }
  }

  # ---- aplikasi fullscreen (tiap ~1 dtk) ----
  if ($enabled.fs -and ($tick % 2 -eq 0)) {
    try {
      $f = [Fs]::Check()
      if ($f -ne $last.fs) {
        $last.fs = $f
        if ($f) { $q = $f.Split(','); Emit @{ ev = 'fullscreen'; on = $true; l = [int]$q[0]; t = [int]$q[1]; r = [int]$q[2]; b = [int]$q[3] } }
        else { Emit @{ ev = 'fullscreen'; on = $false } }
      }
    } catch { Diag 'fullscreen' $_.Exception.Message }
  }

  # ---- caps lock ----
  if ($enabled.caps) {
    $init = -not $seen.caps
    $on = (([Keys]::GetKeyState(0x14) -band 1) -eq 1)
    if ($init -or $on -ne $last.caps) {
      Emit @{ ev = 'caps'; on = $on; init = $init }
      $last.caps = $on
    }
    $seen.caps = $true
  }

  # ---- brightness (tiap ~1.5s, hanya laptop) ----
  if ($enabled.brightness -and ($tick % 3 -eq 0) -and ($tick -ge $briRetryAt)) {
    try {
      $init = -not $seen.brightness
      $b = $null
      $m = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop)
      if ($m.Count -gt 0) { $b = $m[0].CurrentBrightness }
      if ($null -eq $b) {
        $m2 = @(Get-WmiObject -Namespace root\wmi -Class WmiMonitorBrightness -ErrorAction Stop)
        if ($m2.Count -gt 0) { $b = $m2[0].CurrentBrightness }
      }
      if ($null -eq $b) {
        $briFail++
        if ($briFail -ge 3) { Diag 'brightness' 'WmiMonitorBrightness tidak tersedia (monitor eksternal/desktop?)'; $briRetryAt = $tick + 120; $briFail = 0 }
      } else {
        $briFail = 0
        if ($init -or $b -ne $last.bri) {
          Emit @{ ev = 'brightness'; v = [int]$b; init = $init }
          $last.bri = $b
        }
        $seen.brightness = $true
      }
    } catch {
      $briFail++
      if ($briFail -ge 3) { Diag 'brightness' $_.Exception.Message; $briRetryAt = $tick + 120; $briFail = 0 }
    }
  }

  # ---- jaringan, baterai, drive (tiap ~3s) ----
  if ($tick % 6 -eq 2) {
    if ($enabled.net) {
      $init = -not $seen.net
      $n = Get-Net
      if ($n) {
        $key = "$($n.state)|$($n.kind)|$($n.name)|$($n.limited)"
        if ($key -ne $last.net) {
          $n.ev = 'net'; $n.init = $init
          Emit $n
          $last.net = $key
        }
        $seen.net = $true
      }
    }
    if ($enabled.power) {
      $init = -not $seen.power
      $ps = [System.Windows.Forms.SystemInformation]::PowerStatus
      if ($ps.BatteryChargeStatus.ToString() -notmatch 'NoSystemBattery') {
        $pct = [int][math]::Round($ps.BatteryLifePercent * 100)
        $ac = ($ps.PowerLineStatus.ToString() -eq 'Online')
        $key = "$pct|$ac"
        if ($key -ne $last.power) {
          Emit @{ ev = 'power'; pct = $pct; ac = $ac; init = $init }
          $last.power = $key
        }
      }
      $seen.power = $true
    }
    if ($enabled.drive) {
      $init = -not $seen.drive
      $cur = @{}
      foreach ($d in [System.IO.DriveInfo]::GetDrives()) {
        if ($d.DriveType -eq 'Removable' -and $d.IsReady) { $cur[$d.Name] = [string]$d.VolumeLabel }
      }
      if ($last.drives -eq $null) { $last.drives = @{} }
      foreach ($k in $cur.Keys) { if (-not $last.drives.ContainsKey($k)) { Emit @{ ev = 'drive'; state = 'connected'; letter = $k; label = $cur[$k]; init = $init } } }
      foreach ($k in @($last.drives.Keys)) { if (-not $cur.ContainsKey($k)) { Emit @{ ev = 'drive'; state = 'disconnected'; letter = $k; label = $last.drives[$k]; init = $false } } }
      $last.drives = $cur
      $seen.drive = $true
    }
  }

  # ---- bluetooth (tiap ~4s) ----
  if ($enabled.bt -and ($tick % 8 -eq 5)) {
    $init = -not $seen.bt
    $now = Get-Bt
    if ($now -ne $null) {
      if ($last.bt -eq $null) { $last.bt = @{} }
      foreach ($k in $now.Keys) { if (-not $last.bt.ContainsKey($k)) { Emit @{ ev = 'bt'; state = 'connected'; name = $k; init = $init } } }
      foreach ($k in @($last.bt.Keys)) { if (-not $now.ContainsKey($k)) { Emit @{ ev = 'bt'; state = 'disconnected'; name = $k; init = $false } } }
      $last.bt = $now
      $seen.bt = $true
    }
  }

  $tick++
  Start-Sleep -Milliseconds 500
}
