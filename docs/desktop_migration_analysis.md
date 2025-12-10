# IoT Digital Twin Simulator - Windows 桌面应用迁移可行性分析报告

**日期**: 2025-12-10  
**目标**: 分析将当前基于 Web (Next.js + Python/FastAPI) 的 IoT 仿真系统迁移为 Windows 桌面应用程序的可行性与技术方案。

---

## 1. 项目现状概述

当前系统采用典型的前后端分离 Web 架构：
- **前端**: Next.js (React), 通过浏览器访问。
- **后端**: Python (FastAPI), 提供 REST API 和 WebSocket 服务。
- **核心逻辑**: 依赖 Python 生态 (pandas, numpy, scipy) 进行数据生成与仿真。
- **数据存储**: SQLite (配置数据) + TDengine (时序数据)。
- **通信**: HTTP (REST) + MQTT/Modbus/OPC UA (仿真协议)。

## 2. 迁移目标与驱动力

将该系统迁移为 Windows 桌面应用的主要优势可能包括：
- **简化部署**: 用户无需配置 Python 环境、Node.js 环境或 Web 服务器，只需运行一个 `.exe` 安装包。
- **离线运行**: 在无网络环境下（内网工业环境）独立运行。
- **本地资源访问**: 更方便地访问本地串口 (COM ports) 用于 Modbus RTU 通信，或直接访问本地文件系统。
- **性能独享**: 独占本地计算资源，避免浏览器限制。

## 3. 推荐技术方案：Electron + Python Sidecar

鉴于项目已拥有成熟的 Next.js 前端和 Python 后端，**完全重写（如转向 C#/.NET 或 C++）成本过高且不必要**。最可行的方案是利用 **Electron** 框架作为容器，将前端 UI 和 Python 后端打包在一起。

### 3.1 架构设计
- **GUI 层**: Electron (Chromium 内核)，直接承载现有的 Next.js 应用（导出为静态文件或在 Electron 内部启动本地 Server）。
- **逻辑层**: 现有的 Python FastAPI 服务作为 "Sidecar" (伴生进程) 在后台运行。
- **通信层**: Electron 主进程启动 Python 子进程。前端页面继续通过 `http://localhost:port` 与 Python 后端通信，改动极小。

### 3.2 关键组件
1.  **Electron**: 负责窗口管理、应用生命周期、启动/关闭 Python 进程。
2.  **PyInstaller / Nuitka**: 用于将 Python 后端及其依赖（pandas, fastapi, uvicorn 等）打包为独立的 Windows 可执行文件 (`.exe`)，无需用户安装 Python。
3.  **electron-builder**: 用于最终打包整个应用（Electron + Python Exe）为安装程序 (`.msi` 或 `.exe`)。

## 4. 详细实施步骤

### 4.1 后端打包 (Python)
由于后端依赖较多科学计算库，打包体积较大。
- **工具**: PyInstaller。
- **配置**: 创建 `spec` 文件，包含所有隐式导入 (hidden imports)，特别是 `uvicorn`、`sqlalchemy` 等。
- **TDengine 驱动**: 需要将 TDengine 的 Windows 客户端驱动 (`taos.dll`) 打包进去，或者在安装程序中检测/提示用户安装 TDengine 客户端。鉴于目前使用 **REST API** 连接 TDengine，如果保持 REST 模式，则**无需**打包本地驱动库，大大简化了依赖。

### 4.2 前端集成 (Next.js + Electron)
- **模式 A (推荐 - 静态导出)**: 使用 `next export` (或 `output: 'export'`) 将前端生成为纯 HTML/JS/CSS，由 Electron 加载。需注意 Next.js 的 API Routes 功能在静态导出下不可用（但我们的 API 都在 Python 后端，所以没问题）。
- **模式 B (本地 Server)**: 在 Electron 内部启动一个微型 Node server 来托管 Next.js SSR 应用。增加了复杂度和体积，除非必须使用 SSR，否则不推荐。

### 4.3 进程管理
- Electron 主进程 (`main.js`) 启动时，使用 `child_process.spawn` 启动打包好的 Python `.exe`。
- 随机分配端口或通过 IPC 协商端口，将端口号传递给前端（通过 `preload.js` 注入 `window` 对象）。
- 应用退出时，Electron 必须确保杀死 Python 子进程，防止僵尸进程。

## 5. TDengine 适配性分析

这是迁移中最大的不确定因素。

- **连接模式**: 
    - **REST API (Port 6041)**: 当前项目已支持 REST 模式。这是**最适合桌面应用**的模式。它基于 HTTP，无需任何本地 DLL 依赖。只要目标机器能访问到 TDengine 服务器（无论是本地 localhost 还是远程服务器），即可工作。
    - **Native Connector (Port 6030)**: 需要 `taos.dll` 在系统路径中。如果桌面应用需要高性能写入，可能需要此模式，但这会增加分发难度（需包含 DLL 并处理 PATH 环境变量）。
- **建议**: 默认使用 **REST API** 模式。这使得应用是"绿色"的，无需复杂的驱动安装。

## 6. 风险与挑战

1.  **安装包体积**: Electron (~100MB) + Python 环境 (pandas/numpy 很大, ~200MB+) = 最终安装包可能超过 300MB。
    - *对策*: 使用 UPX 压缩，剔除无用的 Python 库文件。
2.  **启动速度**: 启动 Electron 后需要等待 Python 进程启动并加载模型。
    - *对策*: 在 Electron 显示启动画面 (Splash Screen)，通过轮询 API 健康检查接口，待 Python 服务就绪后再加载主界面。
3.  **本地环境差异**: 用户的 Windows 版本、防火墙、端口占用可能导致后端启动失败。
    - *对策*: 增加端口自动探测功能，将实际端口动态传给前端；增加日志记录功能，将 Python stdout 输出到日志文件以便排查。

## 7. 结论

**可行性**: **高**。

将 IoT Digital Twin Simulator 迁移为 Windows 桌面应用在技术上是完全可行的，且风险可控。

**推荐路径**:
1.  保持 **Python 后端 + Next.js 前端** 代码库不变。
2.  引入 **Electron** 作为壳。
3.  使用 **PyInstaller** 打包后端。
4.  优先使用 **TDengine REST API** 以减少对本地环境的依赖。

该方案能以最小的代码改动（主要是构建脚本和启动逻辑）实现桌面化目标，预计开发周期为 1-2 周（主要耗时在打包配置与环境兼容性测试）。
