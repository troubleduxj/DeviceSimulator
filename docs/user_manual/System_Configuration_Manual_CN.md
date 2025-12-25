# 系统配置手册

本手册涵盖了模拟器的全局配置设置。

## 1. 通用设置 (General Settings)
通过 **齿轮图标** -> **参数设置** -> **通用 (General)** 标签页访问这些设置。

### 1.1 全局参数
- **系统时区 (System Timezone)**: 设置数据生成和显示的时区。对于将模拟数据与真实世界时间对齐非常重要。
- **默认采样率 (Default Sampling Rate)**: 数据生成的基础频率（毫秒）。默认为 1000ms（1秒）。
- **数据保留 (Data Retention)**: 历史数据在 TDengine 中自动清理前的保留时间。
- **最大批处理大小 (Max Batch Size)**: 批量写入操作的限制，用于优化数据库性能。

### 1.2 高级功能
- **启用物理引擎 (Enable Physics Engine)**: 切换物理计算模块。如果禁用，数据可能纯粹是随机的或静态的。
- **启用 AI 生成 (Enable AI Generation)**: 切换使用大模型创建设备/场景的功能。

## 2. LLM 配置 (LLM Configuration)
配置用于 AI 功能的大语言模型提供商。
通过 **参数设置** -> **LLM 设置** 标签页访问。

### 2.1 提供商选择
- **Gemini**: Google 的生成式 AI 模型。
- **Deepseek**: Deepseek 的对话模型。

### 2.2 配置字段
- **API Key**: 您从提供商处获取的密钥。
- **Model**: 特定的模型版本（例如 `gemini-1.5-pro`, `deepseek-chat`）。
- **Base URL**: (可选) 用于自定义代理或企业端点。
- **Proxy URL**: (可选) 用于需要代理的网络环境。

### 2.3 连接测试
- 点击 **"测试连接"** 按钮以验证模拟器是否可以与 AI 提供商通信。

## 3. AI 提示词管理
关于自定义系统使用的 AI 提示词的详细说明，请参阅单独的 **[AI 提示词管理操作手册](./AI_Prompt_Management_CN.md)**。
