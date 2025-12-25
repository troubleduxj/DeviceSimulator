# DeviceSimulator 优化任务清单

本清单基于对 `iot-digital-twin-simulator` 项目的深度代码分析，旨在解决性能瓶颈、补全缺失功能并提升系统架构的健壮性。

## 📅 阶段一：核心性能与基础功能 (Core Performance & Basics)
*本阶段主要解决后端性能隐患，并提供最急需的数据导出功能。*

### 1. 后端性能重构 (`backend/services/data_writer.py`)
- [x] **引入设备缓存机制**: 
  - 在 `DataWriter` 中维护 `_device_cache`。
  - 设置缓存刷新间隔（如 5秒），替代每秒全量查询 SQLite。
- [x] **服务启动解耦**:
  - 将 `mqtt_service.start()`, `modbus_service.start()` 等从主循环移至服务初始化阶段。
  - 避免高频重复调用造成的 CPU 浪费。
- [x] **动态频率控制**:
  - 实现基于 `time.time()` 的动态休眠计算，确保高负载下仿真频率仍能维持在设定值（默认 1Hz）。

### 2. 数据导出 API (`backend/api/data.py`)
- [x] **新增导出接口**:
  - 实现 `GET /devices/{device_id}/export`。
  - 支持参数: `start_time`, `end_time`, `format=csv/json`。
- [x] **流式响应**:
  - 使用 `StreamingResponse` 和 `pandas` 直接生成 CSV 流，支持大数据量下载而不占用过多内存。

### 3. 数据库连接优化
- [x] **TDengine 连接检查**:
  - 优化连接检查逻辑，避免在每次写入循环中进行阻塞式网络探测。

---

## 🎨 阶段二：前端功能补全 (Frontend Functional Completeness)
*本阶段旨在将后端已有的强大仿真引擎能力暴露给前端用户。*

### 1. 物理仿真配置 (`components/DeviceManager.tsx` / `VisualModelManager.tsx`)
- [x] **UI 面板开发**:
  - 新增“物理属性”配置 Tab。
  - 表单字段: `Mass` (质量), `Max Velocity` (最大速度), `Acceleration` (加速度)。
- [x] **数据对接**:
  - 将前端配置的 JSON 字段正确映射到后端 `Device` 模型的 `physics_config` 字段。

### 2. 误差注入配置 (Error Injection)
- [x] **故障模拟 UI**:
  - 新增“故障模拟”配置区域。
  - 支持配置: 
    - **Drift**: 漂移速率 (`drift_rate`)。
    - **Anomaly**: 异常概率 (`anomaly_probability`) 及倍数 (`multiplier`)。
    - **Packet Loss**: 丢包概率 (`mcar_probability`)。

### 3. 逻辑规则编辑器 (Logic Rules)
- [x] **规则生成器**:
  - 实现简单的规则表格: `Condition` (如 `temp > 80`) -> `Action` (如 `status = 'warning'`)。
  - 自动校验规则语法的合法性。

### 4. 监控页增强 (`components/DeviceMonitorView.tsx`)
- [x] **导出按钮**:
  - 在图表工具栏添加“导出 CSV”按钮，调用阶段一实现的 API。

---

## 🏗️ 阶段三：架构升级与可观测性 (Architecture & Observability)
*本阶段关注系统的长期可维护性和生产环境准备。*

### 1. 日志系统升级
- [x] **引入 `logging` 模块**:
  - 替换所有的 `print()` 语句。
  - 配置 `RotatingFileHandler`，按大小或日期轮转日志文件。
  - 区分日志级别: `INFO` (正常操作), `ERROR` (异常), `DEBUG` (调试数据)。

### 2. 协议服务独立化
- [x] **服务解耦**:
  - 将 `ModbusService`, `MQTTService`, `OPCUAService` 从 `DataWriter` 中完全剥离。
  - 使用 FastAPI 的 `lifespan` 或独立线程管理其生命周期。
- [ ] **进程间通信**:
  - 如果协议服务运行在独立进程，需引入消息队列 (如 Redis/ZMQ) 进行数据同步。

### 3. 测试覆盖
- [ ] **单元测试**:
  - 补充 `DataGenerator` 的各类策略测试用例。
- [ ] **集成测试**:
  - 编写端到端的仿真流程测试（创建设备 -> 启动 -> 生成数据 -> 写入 DB -> 导出）。

---

## 📝 实施路线建议

1. **立即执行**: 完成阶段一的 **DataWriter 重构** 和 **导出 API**，这是目前性价比最高的优化。
2. **本周内**: 完成阶段二的 **导出按钮** 和 **物理/误差配置 UI**，提升演示效果。
3. **长期规划**: 随着设备数量增加，逐步实施阶段三的架构升级。
