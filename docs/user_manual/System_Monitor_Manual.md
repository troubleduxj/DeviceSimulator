# System Monitor & Data Manual

This manual guides you through monitoring the simulator's health and analyzing the generated data.

## 1. System Monitor
The **System Monitor** dashboard provides an overview of the server's performance and status.

### 1.1 Resource Usage
- **CPU & Memory**: Real-time charts showing the resource consumption of the simulator backend.
- **Disk Usage**: Available storage space.

### 1.2 Service Status
- Checks the connectivity of key components:
   - **Backend API**
   - **TDengine Database**
   - **MQTT Broker** (if enabled)
   - **Modbus Service** (if enabled)

## 2. TDengine Data Viewer
The **TDengine Viewer** allows you to inspect the raw data stored in the time-series database.

1. **Select Table**: Choose the supertable (category) or specific subtable (device).
2. **Time Range**: Filter data by time.
3. **Data Grid**: View the timestamped metrics in a tabular format.
4. **Refresh**: Manually fetch the latest records.

## 3. System Logs & AI Analysis
The **Log Viewer** displays operational logs from the simulation engine.

### 3.1 Viewing Logs
- Logs are color-coded by severity:
   - **Info**: General events (blue).
   - **Warning**: Potential issues (yellow).
   - **Error**: Critical failures (red).
- **Filter**: Use the search bar to find specific events.

### 3.2 AI Intelligent Analysis
The simulator integrates with Gemini AI to analyze log patterns.
1. Click the **"AI Analysis"** button (Sparkles icon).
2. The AI will read the recent logs and generate a report including:
   - **Summary**: What happened recently.
   - **Root Cause Analysis**: Why errors occurred (e.g., "Device 01 reported overheating due to scenario 'Coolant Leak'").
   - **Recommendations**: Suggested actions.
3. The result is displayed in a formatted Markdown view and can be copied to the clipboard.
