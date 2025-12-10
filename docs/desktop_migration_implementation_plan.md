# IoT Digital Twin Simulator - Windows 桌面版迁移实施方案

**日期**: 2025-12-10
**版本**: 1.0
**状态**: 拟定中

## 1. 引言

本通过细化《桌面应用迁移可行性分析报告》，制定详细的开发实施方案。
目标是将基于 **Vite + React** 前端和 **Python FastAPI** 后端的 Web 应用打包为 **Electron** 桌面应用，实现 Windows 环境下的“一键安装、开箱即用”。

## 2. 总体架构设计

采用 **Electron + Python Sidecar** 模式：

*   **Electron (主进程)**: 负责应用生命周期、窗口管理、启动/停止 Python 后端服务、自动更新。
*   **React (渲染进程)**: 负责用户界面，通过 HTTP/WebSocket 与本地 Python 服务通信。
*   **Python (后台服务)**: 提供 REST API、仿真逻辑、数据库交互 (SQLite/TDengine)。
*   **IPC 通信**: Electron 主进程与渲染进程通过 `preload.js` (ContextBridge) 交换信息（如后端端口号）。

```mermaid
graph TD
    User[用户] --> ElectronWin[Electron 窗口 (Chromium)]
    ElectronWin -- 1. 加载 UI --> ReactApp[React 前端 (File Protocol / Local Server)]
    ElectronWin -- 2. 获取端口 --> MainProcess[Electron 主进程 (Node.js)]
    MainProcess -- 3. 启动/管理 --> PythonProcess[Python 子进程 (FastAPI)]
    ReactApp -- 4. HTTP/WS 请求 (localhost:port) --> PythonProcess
    PythonProcess -- 5. 读写 --> SQLite[(SQLite 配置库)]
    PythonProcess -- 6. 读写 --> TDengine[(TDengine 时序库 - REST API)]
```

## 3. 详细实施步骤

### 阶段一：环境准备与依赖安装

1.  **Node.js 环境**: 确保安装 Node.js (v18+)。
2.  **Python 环境**: 确保安装 Python 3.10+ 及 `requirements.txt` 依赖。
3.  **安装 Electron 开发依赖**:
    ```bash
    npm install --save-dev electron electron-builder wait-on cross-env concurrently
    npm install electron-log # 用于日志记录
    ```
4.  **安装 Python 打包工具**:
    ```bash
    pip install pyinstaller
    ```

### 阶段二：后端适配与打包 (Python)

**目标**: 将 Python 后端打包为独立可执行文件 (`server.exe`)。

1.  **创建入口文件 `backend/run_dist.py`**:
    *   该文件作为 PyInstaller 的入口。
    *   功能：解析命令行参数（接收端口号）、配置日志路径（输出到 AppData）、启动 Uvicorn Server。
    *   *注意*: 不能使用 `reload=True`，需硬编码 `app` 导入。

2.  **处理静态资源路径**:
    *   修改代码中涉及文件读取（如 SQLite 路径、日志路径）的逻辑。
    *   检测是否在 PyInstaller `sys._MEIPASS` 环境下运行，动态调整资源基准路径。

3.  **配置 PyInstaller Spec (`backend.spec`)**:
    *   **Hidden Imports**: 包含 `uvicorn.logging`, `uvicorn.loops`, `uvicorn.loops.auto`, `uvicorn.protocols`, `uvicorn.protocols.http`, `uvicorn.protocols.http.auto`, `uvicorn.lifespan`, `uvicorn.lifespan.on`, `sqlalchemy.sql.default_comparator`, `engineio.async_drivers.asgi` 等。
    *   **Datas**: 包含 `alembic.ini` (如果有), `migrations/` (如有数据库迁移脚本), 默认配置文件。
    *   **打包命令**: `pyinstaller --noconfirm --clean backend.spec`

4.  **验证**:
    *   运行生成的 `.exe`，测试 API 是否可用。

### 阶段三：Electron 主进程开发

**目标**: 实现 Electron 启动逻辑和 Python 进程管理。

1.  **目录结构**:
    *   创建 `electron/` 目录。
    *   `electron/main.js`: 主进程逻辑。
    *   `electron/preload.js`: 预加载脚本。

2.  **主进程逻辑 (`main.js`)**:
    *   **寻找空闲端口**: 启动前查找一个可用端口 (e.g., get-port)。
    *   **启动 Python**: 使用 `child_process.spawn` 启动 `server.exe` (生产环境) 或 `python main.py` (开发环境)。
        *   传入参数: `--port <PORT>`。
    *   **日志重定向**: 将 Python 的 `stdout/stderr` 输出到 Electron 的日志文件 (`electron-log`)。
    *   **健康检查**: 循环请求 `http://localhost:<PORT>/api/health`，直到后端就绪再创建主窗口（或先显示 Loading 页）。
    *   **生命周期**: App 退出 (`window-all-closed`, `before-quit`) 时，务必 `kill` Python 子进程树。

3.  **预加载脚本 (`preload.js`)**:
    *   使用 `contextBridge.exposeInMainWorld` 暴露 `window.electronAPI`。
    *   提供 `getServerConfig()` 方法，返回 `{ port: <PORT>, baseUrl: 'http://127.0.0.1:<PORT>' }`。

### 阶段四：前端适配 (React/Vite)

**目标**: 让前端能连接到动态端口的后端，并支持文件协议加载。

1.  **修改 `vite.config.ts`**:
    *   设置 `base: './'` (确保构建后的 HTML 引用资源使用相对路径)。

2.  **路由模式调整**:
    *   从 `BrowserRouter` 切换为 `HashRouter` (推荐) 或配置 Electron 支持 History 路由。由于是文件协议加载，`HashRouter` 最稳妥。

3.  **API Client 改造**:
    *   修改 `services/backendService.ts` (及其他 API 调用处)。
    *   **移除硬编码**: 不再使用默认的 `/api` 相对路径。
    *   **动态 Base URL**: 应用启动时，先调用 `window.electronAPI.getServerConfig()` 获取 Base URL，再初始化 Axios/Fetch 实例。
    *   *开发环境兼容*: 在浏览器开发时，仍使用 `/api` (配合 Vite Proxy)。

### 阶段五：打包与构建配置

1.  **配置 `package.json`**:
    *   `main`: 指向 `electron/main.js`。
    *   `build`: `electron-builder` 配置。
        *   `appId`: `com.iot.simulator`
        *   `productName`: "IoT Digital Twin Simulator"
        *   `directories`: { `output`: "dist_electron" }
        *   `files`: ["dist/**/*", "electron/**/*"]
        *   `extraResources`: [
            {
                "from": "backend/dist/server.exe",
                "to": "backend/server.exe"
            }
        ]
        *   `win`: { "target": ["nsis"] }

2.  **构建脚本 (`scripts`)**:
    *   `build:backend`: `cd backend && pyinstaller backend.spec`
    *   `build:frontend`: `vite build`
    *   `dist`: `npm run build:backend && npm run build:frontend && electron-builder`

## 4. 风险与应对

| 风险点 | 描述 | 应对方案 |
| :--- | :--- | :--- |
| **端口冲突** | 固定端口可能被占用 | Electron 启动时动态查找空闲端口，并通过 IPC 传给前端。 |
| **僵尸进程** | App 关闭后 Python 进程未退出 | 主进程监听 `will-quit` 事件，显式调用 `tree-kill` 杀掉 Python 进程。 |
| **数据库路径** | 打包后只读或路径错误 | Python 启动时检测 `APPDATA` 目录，将 SQLite 数据库文件复制到用户数据目录运行。 |
| **依赖缺失** | PyInstaller 漏打某些隐式依赖 | 仔细检查 Spec 文件，使用 `--debug` 模式排查，手动添加 `hidden-imports`。 |

## 5. 开发计划 (预计 5 天)

*   **Day 1**: 环境搭建，PyInstaller 打包后端验证。
*   **Day 2**: Electron 主进程开发 (启动/停止 Python)。
*   **Day 3**: 前端适配 (动态 API URL, HashRouter)。
*   **Day 4**: 联调与集成测试，electron-builder 打包配置。
*   **Day 5**: 安装包测试，修复路径/权限问题，文档编写。

