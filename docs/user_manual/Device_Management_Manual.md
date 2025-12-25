# Device & Category Management Manual

This manual covers the management of Device Categories and individual IoT Devices in the simulator.

## 1. Category Management
The **Category Manager** allows you to define templates for devices. A category defines the common metrics (parameters), physics properties, and visual defaults for a type of device (e.g., "Diesel Generator", "Temperature Sensor").

### 1.1 Accessing Category Manager
- Navigate to the **Category Management** tab in the main sidebar.

### 1.2 Creating a Category
1. Click **"Create Category"**.
2. **Basic Info**: Enter Name and Code (unique identifier).
3. **Parameters**: Define the metrics the device will report.
   - **Tag**: Static metadata (e.g., Serial Number).
   - **Metric**: Time-series data (e.g., Temperature, RPM).
   - Set Data Type (Int, Float, String, Boolean) and Units.
4. **Physics Config**: Set physical constants (e.g., Mass, Max RPM).
5. **Visual Config**: Select a default 3D model type.

### 1.3 AI Generation
- Click **"AI Generate"** to let the LLM create a category schema based on a description (e.g., "A 6-axis industrial robot arm").

## 2. Device Management
The **Device Manager** is the central hub for controlling simulated devices.

### 2.1 Device List
- View all devices, their status (Running/Stopped), and current scenario.
- **Filter**: Use the search bar or status filter to find specific devices.
- **Bulk Actions**: Select multiple devices to Start, Stop, or Delete them.

### 2.2 Adding Devices
1. Click **"Add Device"**.
2. **Manual Mode**:
   - Select a Category.
   - Fill in device details (ID, Name).
   - Override default parameters if needed.
3. **AI Batch Generation**:
   - Describe the devices you want (e.g., "10 temperature sensors for a warehouse").
   - The system will generate them automatically.

### 2.3 Visual Model Configuration
- In the Device List, click the **"Visual"** (Cube) icon.
- Configure the 3D representation:
   - **Type**: Box, Cylinder, Sphere, or Custom GLB/GLTF model.
   - **Color/Size**: Customize appearance.
   - **Mappings**: Bind visual properties (like rotation or color) to device metrics for real-time visualization.
