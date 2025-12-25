# DeviceSimulator (设备运行模拟器平台)

DeviceSimulator 是一个基于 Web 的物联网设备运行模拟器平台，结合了 3D 数字孪生可视化、实时遥测监控和多模式仿真引擎。项目旨在提供一个灵活的 IoT 设备模拟环境，支持从简单的物理规则到复杂的 AI 行为模拟。

## 🌟 主要功能 (Features)

*   **3D 数字孪生可视化**: 使用 React Three Fiber 实现的交互式 3D 设备展示。
*   **多模式仿真引擎**:
    *   **🤖 AI Mode (Gemini)**: 利用 Google Gemini 大模型生成智能、动态的设备行为数据。
    *   **⚡ Local Mode (Physics)**: 基于前端物理引擎的低延迟仿真。
    *   **Backend Mode**: 基于 Python 后端的全功能仿真，支持复杂业务逻辑和数据持久化。
    *   **Desktop Mode**: 基于 Electron 的 Windows 桌面应用，一键安装，开箱即用。
*   **设备管理**: 支持设备分类、模型配置、参数模板继承。
*   **实时监控**: 集成 ECharts/Recharts 的实时遥测数据图表。
*   **数据存储**:
    *   SQLite: 用于存储设备元数据、配置信息。
    *   TDengine (可选): 集成高性能时序数据库，用于海量仿真数据的存储与回放。

## 🛠️ 技术栈 (Tech Stack)

### 前端 (Frontend)
*   **框架**: React 19, Vite
*   **样式**: TailwindCSS v4 (本地化配置)
*   **3D 引擎**: Three.js, @react-three/fiber, @react-three/drei
*   **桌面框架**: Electron, Electron Builder
*   **图表**: Recharts
*   **图标**: Lucide React

### 后端 (Backend)
*   **框架**: FastAPI (Python 3.10+)
*   **打包工具**: PyInstaller
*   **ORM**: SQLAlchemy
*   **数据库驱动**: Taospy (TDengine)
*   **工具**: Pandas, NumPy

## 🚀 快速开始 (Quick Start)

### 前置要求
*   Node.js (v18+)
*   Python (v3.10+)
*   (可选) TDengine 3.0+ (如果需要使用时序数据库功能)

### 1. 桌面版启动 (推荐)
开发环境下，可以同时启动前端和后端（封装在 Electron 中）：

```bash
# 安装依赖
npm install

# 启动 Electron 开发环境
npm run electron:dev
```
这将同时启动 React 开发服务器和 Python 后端服务，并打开 Electron 窗口。

### 2. Web 版启动

#### 前端启动
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
访问地址: `http://localhost:3000` (原 5173 端口已调整)

#### 后端启动
项目包含一个 Python 后端服务，用于处理复杂的仿真任务和数据管理。

**方式 A: 使用启动脚本 (推荐 Windows 用户)**
直接运行项目根目录下的批处理文件：
```bash
.\start_backend.bat
```
该脚本会自动创建虚拟环境、安装依赖并启动服务。

**方式 B: 手动启动**
```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境 (Windows)
.\venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```
后端 API 地址: `http://localhost:8000`

## 📦 打包构建

### 构建桌面应用
将应用打包为 Windows 可执行安装包 (.exe)：

```bash
npm run dist
```
构建产物位于 `dist_electron/` 目录下。

## 📂 项目结构

```
iot-digital-twin-simulator/
├── backend/                 # Python 后端服务 (FastAPI)
│   ├── api/                 # API 路由
│   ├── config/              # 配置文件
│   ├── models/              # 数据库模型
│   ├── services/            # 业务逻辑服务
│   ├── venv/                # Python 虚拟环境
│   ├── device_simulator.db  # SQLite 数据库文件
│   ├── main.py              # 后端开发入口
│   ├── run_dist.py          # 后端打包入口 (PyInstaller)
│   └── backend.spec         # PyInstaller 配置文件
├── electron/                # Electron 主进程代码
│   ├── main.cjs             # 主进程逻辑
│   └── preload.cjs          # 预加载脚本
├── components/              # React 组件
│   ├── DigitalTwin.tsx      # 3D 可视化组件
│   ├── DeviceManager.tsx    # 设备管理组件
│   └── ...
├── services/                # 前端服务
│   ├── backendService.ts    # 后端 API 通信服务
│   └── ...
├── public/                  # 静态资源
├── App.tsx                  # 主应用组件
└── start_backend.bat        # 后端启动脚本
```

## ⚙️ 配置说明

### 环境变量
在前端根目录创建 `.env.local` 文件配置 API Key (如使用 AI 模式)：
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 后端配置
后端配置文件位于 `backend/config/config.py`，可根据需要修改数据库路径或 TDengine 连接信息。

## 📝 注意事项
*   **3D 模型加载**: 确保网络环境可以访问相关 CDN 资源，或将 GLB/HDR 文件下载至 `public` 目录并在代码中修改引用。
*   **Tailwind CSS**: 本项目已配置为本地编译 Tailwind CSS，无需依赖外部 CDN。
