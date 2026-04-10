# System Monitor

[中文说明](README.zh-CN.md)

A lightweight VS Code / Cursor extension for real-time system resource monitoring.

## Features

- **CPU** — Usage percentage, 1/5/15 min load averages
- **RAM** — Used / Available / Total
- **Network** — Upload & download speed, SSH traffic (remote)
- **GPU** — NVIDIA GPU utilization, VRAM, temperature, power (multi-GPU)
- **Free GPU Picker** — Select idle GPUs and copy `CUDA_VISIBLE_DEVICES`
- **Process Manager** — Sortable by CPU / RAM / GPU, searchable (supports `GPU0` / `#0` syntax)
- **Status Bar** — Configurable pinned metrics with codicon icons
- **Settings** — Per-profile (local / remote) status bar customization
- **i18n** — Chinese & English, auto-detected

## Platform Support

| Feature | Linux | macOS | Windows |
|---------|-------|-------|---------|
| CPU usage | ✅ `/proc/stat` | ✅ `os.cpus()` | ✅ `os.cpus()` |
| RAM | ✅ `/proc/meminfo` | ✅ `os` module | ✅ `os` module |
| Network speed | ✅ `/proc/net/dev` | ✅ `netstat -ib` | ❌ Hidden |
| SSH traffic | ✅ `ss` | ✅ `netstat` | ❌ Hidden |
| Processes | ✅ Full (`ps -eo`) | ✅ Full (`ps -Aro`) | ⚠️ Limited (no CPU%, no username) |
| GPU (NVIDIA) | ✅ `nvidia-smi` | ✅ `nvidia-smi` | ✅ `nvidia-smi` |

> **Unsupported features are hidden or marked N/A, never shown as fake zeros.**

### About SSH Remote Connections

When using VS Code Remote-SSH, the extension runs on the **remote machine**. This means:

- The platform that matters is the **remote server's OS**, not your local machine.
- If you SSH from Windows into a Linux server, you get **full Linux feature support**.
- Network, SSH traffic, and process data all come from the remote system.

This is the most common use case — the extension is designed with remote development in mind.

## Configuration Tips

### Only show status bar when connected via SSH

If you only want the monitoring status bar during remote sessions, set the **local** profile's status bar to disabled:

```jsonc
// settings.json
{
  "sysmonitor.statusBar.local": {
    "barEnabled": false
  },
  "sysmonitor.statusBar.remote": {
    "barEnabled": true,
    "cpu": true,
    "ram": true,
    "net": "both",
    "ssh": true,
    "gpu": { "summary": true, "mode": "all", "metric": "both" }
  }
}
```

Or use the built-in settings panel (click the **Settings** button in the sidebar) — switch to **Local Settings** tab and toggle **Show Status Bar** off.

> The sidebar panel (performance + processes) is always available regardless of this setting.
> This is useful if you want to occasionally check server stats without a permanent status bar.

### Completely disable locally (remote-only use)

If you don't want the extension active at all on your local machine, use VS Code's built-in mechanism:

1. Open the Extensions sidebar
2. Find **System Monitor**, right-click
3. Select **Disable (Workspace)** for local workspaces, or enable only for remote

This way the extension only loads when you SSH into a remote server — no sidebar icon, no status bar, zero overhead locally.

### Show GPU info for specific cards only

```jsonc
{
  "sysmonitor.statusBar.remote": {
    "gpu": { "mode": "specify", "cards": [0, 1, 3], "metric": "both" }
  }
}
```

### Hide idle GPUs from status bar

```jsonc
{
  "sysmonitor.statusBar.remote": {
    "gpu": { "mode": "all", "skipIdle": true, "metric": "utilization" }
  }
}
```

## Requirements

- NVIDIA GPU monitoring requires `nvidia-smi` in PATH
- SSH traffic monitoring requires `ss` (Linux) or `netstat` (macOS)
- Best experience on Linux; macOS fully supported; Windows has limited local monitoring
