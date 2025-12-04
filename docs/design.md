# DeviceSimulator 功能整合设计方案

本此设计方案基于对 [iot-sensor-data-simulator](https://github.com/antonsarg/iot-sensor-data-simulator), [ot-sim](https://github.com/patsec/ot-sim) 和 [Webots](https://en.wikipedia.org/wiki/Webots) 三个开源项目的深度分析，旨在将其核心优势功能整合到当前的 **DeviceSimulator** 项目中，提升仿真器的真实性、连接性和实用性。

## 1. 核心功能分析与吸纳

### 1.1 高级误差仿真模型 (Advanced Error Simulation) - *Source: iot-sensor-data-simulator*
目前本项目仅支持基础的正弦/随机波动。我们将引入基于概率的复杂故障模拟：
- **Anomaly (异常)**: 随机产生的正向或负向尖峰数据（Spikes）。
- **Drift (漂移)**: 随着时间推移，基准值发生线性偏移，模拟传感器老化或环境变化。
- **MCAR (丢包)**: Missing Completely At Random，随机丢失数据点（输出为 None 或跳过）。
- **Duplicate (重复)**: 模拟网络重传导致的重复数据包发送。

### 1.2 工业协议支持 (Industrial Protocol Support) - *Source: ot-sim*
为使仿真器具备 OT (Operational Technology) 特性，我们将增加对工业标准协议的支持。这将允许外部 SCADA 系统或 PLC 直接连接仿真器。
- **Modbus TCP Server**: 仿真设备将作为 Modbus TCP Server 运行，允许外部 Client 读取保持寄存器 (Holding Registers) 和输入寄存器 (Input Registers)。
- **实现方式**: 使用 `pymodbus` 库实现。

### 1.3 运行时逻辑引擎 (Runtime Logic Engine) - *Source: ot-sim*
引入动态逻辑处理能力，允许用户定义简单的规则来控制设备行为，而无需修改代码。
- **规则示例**: `if temperature > 80 then status = 'warning'`
- **实现方式**: 集成简单的表达式求值引擎（如 Python 的 `simpleeval`），在每一步仿真中评估用户定义的规则。

### 1.4 虚拟物理仿真 (Virtual Physics Simulation) - *Source: Webots*
借鉴 Webots 的物理仿真理念，增强设备状态的物理相关性。
- **碰撞/运动仿真**: 对于涉及位置/运动的设备（如 AGV），引入简单的物理约束（速度、加速度限制）。
- **传感器模型**: 模拟不同传感器的物理特性（如 Lidar 的距离噪声、Camera 的光照影响），而非单纯的随机数生成。
- **实现方式**: 在 `SimulationModel` 中增加物理属性配置（质量、最大速度等），并在仿真步进中应用简单的运动学公式。

### 1.5 MQTT 数据推送 (MQTT Transmission) - *Source: iot-sensor-data-simulator*
支持将仿真数据实时推送到外部 MQTT Broker。
- **实现方式**: 集成 `paho-mqtt` 客户端。
- **配置**: 在“系统设置”中增加 MQTT Broker 地址、端口、Topic 模板及认证信息。

### 1.6 数据导出 (Data Export) - *Source: iot-sensor-data-simulator*
支持将仿真过程中的历史数据导出为标准格式（CSV, JSON），便于离线分析。

---

## 2. 系统架构设计变更

### 2.1 后端架构 (Backend)
在 `backend/` 目录下新增或修改以下模块：

#### A. 仿真引擎增强 (`backend/services/simulation_engine.py`)
重构物理生成逻辑，支持插件式错误注入和规则评估。

```python
class SimulationStrategy:
    def generate(self, base_value, context): pass

class PhysicsEngine:
    def update_state(self, device_state, dt):
        # 应用简单的运动学公式: pos += vel * dt
        pass

class ErrorInjector:
    def apply(self, value, error_config):
        # 实现 Drift, Anomaly, MCAR, Duplicate 逻辑
        pass

class LogicEngine:
    def evaluate(self, context, rules):
        # 使用 simpleeval 评估规则
        # 比如: if context['temp'] > 100: context['status'] = 'alarm'
        pass
```

#### B. 协议适配层 (`backend/services/protocols/`)
新增协议服务模块，负责处理外部连接。
- `mqtt_service.py`: 管理 MQTT 发布。
- `modbus_service.py`: 启动 Modbus TCP Server，映射内部参数到寄存器地址。

### 2.2 前端架构 (Frontend)

#### A. 仿真模型配置页 (`components/SimulationModelManager.tsx`)
- **物理属性**: 新增面板配置质量、最大速度、加速度等物理参数。
- **错误注入**: 新增面板配置 Anomaly/Drift 等概率参数。
- **逻辑规则**: 新增简单的规则编辑器（表格形式：条件 -> 动作）。

#### B. 系统设置页 (`components/SystemManager.tsx`)
- **MQTT 配置**: Host, Port, Topic Pattern。
- **Modbus 配置**: 启用/禁用 Modbus Server，端口设置（默认 5020，避免冲突）。

#### C. 监控页 (`components/Monitor.tsx`)
- 增加“导出数据”按钮。

---

## 3. 详细功能规格

### 3.1 误差模型参数定义
在 `SimulationModel` 中增加 `errorConfig` 字段：

| 错误类型 | 参数 | 说明 |
| :--- | :--- | :--- |
| **Anomaly** | `probability` (0-1) | 发生概率 |
| | `multiplier` (float) | 异常值倍数 (如 1.5 倍) |
| **Drift** | `rate` (float/sec) | 每秒漂移量 |
| **MCAR** | `probability` (0-1) | 丢包概率 |

### 3.2 逻辑规则定义
在 `Device` 或 `SimulationModel` 中增加 `logicRules` 字段：

```json
[
  {
    "condition": "temperature > 100",
    "action": "status = 'alarm'",
    "priority": 1
  }
]
```

### 3.3 物理属性定义
在 `Device` 中增加 `physicsConfig` 字段：

```json
{
  "mass": 10.0,
  "maxVelocity": 5.0,
  "acceleration": 2.0
}
```

### 3.4 Modbus 映射规范
自动将数值型参数映射到 Modbus 寄存器：
- **Register 0-99**: 保留用于设备状态/控制。
- **Register 100+**: 依次映射 `parameters` 列表中的数值型参数。

---

## 4. 实施路线图 (Roadmap)

1.  **阶段一：基础重构 (Base Refactoring)**
    - [ ] 重构后端数据生成逻辑，独立出 `Generator` 类。
    - [ ] 实现 Drift 和 Anomaly 算法。
    - [ ] 引入 `simpleeval` 并实现基础逻辑引擎。
    - [ ] 引入基础物理计算模块 (PhysicsEngine)。

2.  **阶段二：连接性扩展 (Connectivity)**
    - [ ] 实现 MQTT Client (paho-mqtt)。
    - [ ] 实现 Modbus TCP Server (pymodbus)。
    - [ ] 前端增加 MQTT/Modbus 配置界面。

3.  **阶段三：数据与 UI 优化 (Data & UI)**
    - [ ] 前端实现 CSV 导出。
    - [ ] 完善错误注入、逻辑规则和物理属性配置的 UI。

## 5. 参考资料
- [iot-sensor-data-simulator](https://github.com/antonsarg/iot-sensor-data-simulator) (MIT License)
- [ot-sim](https://github.com/patsec/ot-sim) (MIT License)
- [Webots](https://en.wikipedia.org/wiki/Webots) (Apache 2 License)
