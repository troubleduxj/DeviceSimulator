# Simulation & Scenario Manual

This manual explains how to run simulations, manage scenarios, and interact with the 3D Digital Twin environment.

## 1. Digital Twin Visualization
The **Digital Twin** view provides a real-time 3D representation of your IoT environment.

### 1.1 Navigation Controls
- **Rotate**: Left-click and drag.
- **Pan**: Right-click and drag.
- **Zoom**: Mouse wheel scroll.
- **Select**: Click on a device in the 3D scene to view its realtime telemetry overlay.

### 1.2 Device Indicators
- Devices are color-coded based on status:
   - **Green**: Normal Operation.
   - **Red**: Error/Critical State.
   - **Gray**: Stopped/Offline.

## 2. Scenario Management
Scenarios define how a device behaves over time. Instead of random data, scenarios allow you to simulate specific conditions like "Overheating", "Vibration Spike", or "Battery Drain".

### 2.1 Applying Scenarios
1. Go to **Device Manager**.
2. Select a device.
3. In the **"Scenario"** dropdown, select a predefined scenario.
4. The device output will immediately reflect the logic defined in that scenario.

### 2.2 Creating Scenarios
1. Open the **Scenario Manager**.
2. Click **"New Scenario"**.
3. **Define Logic**:
   - Set target metrics.
   - Define functions (Linear Increase, Sine Wave, Random Walk, Step Change).
   - Set duration and loop settings.
4. **AI Generation**: You can ask the AI to "Create a scenario simulating a coolant leak", and it will generate the parameter curves automatically.

## 3. Playback Mode
The simulator supports replaying historical data.

1. Toggle the **"Playback"** switch in the top bar.
2. Select a **Time Range**.
3. Use the **Timeline Slider** to scrub through data.
4. The 3D scene and charts will update to reflect the state of the system at that specific timestamp.
