# System Configuration Manual

This manual covers the global configuration settings of the simulator.

## 1. General Settings
Access these settings via the **Gear Icon** -> **Parameter Settings** -> **General** tab.

### 1.1 Global Parameters
- **System Timezone**: Sets the timezone for data generation and display. Important for aligning simulation data with real-world time.
- **Default Sampling Rate**: The base frequency (in milliseconds) for data generation. Default is 1000ms (1 second).
- **Data Retention**: How long to keep historical data in TDengine before automatic cleanup.
- **Max Batch Size**: Limit for batch write operations to optimize database performance.

### 1.2 Advanced Features
- **Enable Physics Engine**: Toggles the physics calculation module. If disabled, data may be purely random or static.
- **Enable AI Generation**: Toggles the ability to use LLMs for creating devices/scenarios.

## 2. LLM Configuration
Configure the Large Language Model providers used for AI features.
Access via **Parameter Settings** -> **LLM Settings** tab.

### 2.1 Provider Selection
- **Gemini**: Google's generative AI model.
- **Deepseek**: Deepseek's chat model.

### 2.2 Configuration Fields
- **API Key**: Your secret key from the provider.
- **Model**: The specific model version (e.g., `gemini-1.5-pro`, `deepseek-chat`).
- **Base URL**: (Optional) For custom proxies or enterprise endpoints.
- **Proxy URL**: (Optional) For network environments requiring a proxy.

### 2.3 Connection Test
- Click **"Test Connection"** to verify that the simulator can communicate with the AI provider.

## 3. AI Prompt Management
For detailed instructions on customizing the AI prompts used by the system, please refer to the separate **[AI Prompt Management Operation Manual](./AI_Prompt_Management.md)**.
