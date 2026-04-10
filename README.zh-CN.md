# System Monitor — 系统监控

轻量级 VS Code / Cursor 扩展，实时监控系统资源。

## 功能

- **CPU** — 使用率、1/5/15 分钟负载均值
- **内存** — 已用 / 可用 / 总计
- **网络** — 上传下载速率，SSH 流量（远程连接时）
- **GPU** — NVIDIA GPU 利用率、显存、温度、功耗（多卡支持）
- **空闲 GPU 选择器** — 选取空闲卡并一键复制 `CUDA_VISIBLE_DEVICES`
- **进程管理器** — 按 CPU / 内存 / GPU 排序，支持搜索（可用 `GPU0`、`#0` 语法按卡筛选）
- **状态栏** — 可配置的固定指标，使用 codicon 图标
- **设置** — 本地 / 远程独立的状态栏配置
- **国际化** — 自动识别中文 / 英文

## 平台支持

| 功能 | Linux | macOS | Windows |
|------|-------|-------|---------|
| CPU 使用率 | ✅ `/proc/stat` | ✅ `os.cpus()` | ✅ `os.cpus()` |
| 内存 | ✅ `/proc/meminfo` | ✅ `os` 模块 | ✅ `os` 模块 |
| 网络速率 | ✅ `/proc/net/dev` | ✅ `netstat -ib` | ❌ 隐藏 |
| SSH 流量 | ✅ `ss` | ✅ `netstat` | ❌ 隐藏 |
| 进程 | ✅ 完整（`ps -eo`） | ✅ 完整（`ps -Aro`） | ⚠️ 有限（无 CPU%、无用户名） |
| GPU (NVIDIA) | ✅ `nvidia-smi` | ✅ `nvidia-smi` | ✅ `nvidia-smi` |

> **不支持的功能会自动隐藏或标注 N/A，不会显示虚假的零值。**

### 关于 SSH 远程连接

使用 VS Code Remote-SSH 时，扩展运行在**远程服务器**上。这意味着：

- 决定功能是否可用的是**远端服务器的操作系统**，而非本地电脑。
- 从 Windows 通过 SSH 连接到 Linux 服务器，即可享有**完整的 Linux 功能支持**。
- 网络速率、SSH 流量、进程数据均来自远端系统。

这也是最常见的使用场景——本扩展专为远程开发设计。

## 配置指南

### 仅在 SSH 远程时显示状态栏

将本地配置的状态栏关闭，远程配置保持开启：

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

也可以在侧边栏点击**设置**按钮，切换到**本地设置**，关闭**显示状态栏**开关。

> 侧边栏面板（性能 + 进程）不受此设置影响，始终可用。适合偶尔查看但不想占用状态栏的场景。

### 本地完全不激活（仅远程使用）

如果你只在 SSH 到服务器时使用，本地完全不想看到它：

1. 打开扩展侧边栏
2. 找到 **System Monitor**，右键
3. 选择 **禁用（工作区）**，或勾选仅在远程启用

这样扩展只在 SSH 连接服务器时加载——本地没有侧边栏图标、没有状态栏、零开销。

### 状态栏只显示指定 GPU

```jsonc
{
  "sysmonitor.statusBar.remote": {
    "gpu": { "mode": "specify", "cards": [0, 1, 3], "metric": "both" }
  }
}
```

### 状态栏隐藏空闲 GPU

```jsonc
{
  "sysmonitor.statusBar.remote": {
    "gpu": { "mode": "all", "skipIdle": true, "metric": "utilization" }
  }
}
```

## 依赖

- NVIDIA GPU 监控需要 `nvidia-smi` 在 PATH 中
- SSH 流量监控需要 `ss`（Linux）或 `netstat`（macOS）
- Linux 体验最佳；macOS 完整支持；Windows 本地监控有限
