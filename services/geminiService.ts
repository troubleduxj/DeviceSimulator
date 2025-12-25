import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Device, SimulationResponse } from '../types';

// Helper to get config
const getConfig = () => {
    const provider = localStorage.getItem('llm_provider') || 'gemini';
    if (provider === 'deepseek') {
        return {
            provider: 'deepseek',
            apiKey: localStorage.getItem('deepseek_api_key') || '',
            model: localStorage.getItem('deepseek_model') || 'deepseek-chat',
            baseUrl: localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com'
        };
    }
    return {
        provider: 'gemini',
        apiKey: localStorage.getItem('gemini_api_key') || process.env.API_KEY || '',
        model: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
        proxyUrl: localStorage.getItem('llm_proxy_url') || '' // Add proxyUrl
    };
};

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    batch: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          metrics: {
            type: Type.OBJECT,
            description: "Key-value pair of metric IDs and their simulated float values",
            nullable: false,
          },
          logMessage: { type: Type.STRING },
          statusSeverity: { type: Type.STRING, enum: ["info", "warning", "error", "critical"] },
        },
        required: ["metrics", "logMessage", "statusSeverity"]
      },
    },
  },
  required: ["batch"],
};

const CATEGORY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    code: { type: Type.STRING },
    description: { type: Type.STRING },
    parameters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          type: { type: Type.STRING }, // Simplified enum handling for cross-provider
          unit: { type: Type.STRING },
          min_value: { type: Type.NUMBER },
          max_value: { type: Type.NUMBER },
          is_tag: { type: Type.BOOLEAN }
        },
        required: ["id", "name", "type", "is_tag"]
      }
    },
    physics_config: {
       type: Type.OBJECT,
       description: "Physical constants like mass_kg, max_rpm, thermal_conductivity, etc."
    },
    logic_rules: {
       type: Type.ARRAY,
       items: {
          type: Type.OBJECT,
          properties: {
             condition: { type: Type.STRING },
             action: { type: Type.STRING }
          },
          required: ["condition", "action"]
       }
    }
  },
  required: ["name", "code", "parameters"]
};

const VISUAL_MODEL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: { type: Type.STRING, description: "One of: Generator, Cutter, Generic, GLB, GLTF, OBJ, FBX" },
    description: { type: Type.STRING },
    parameters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          unit: { type: Type.STRING },
          min_value: { type: Type.NUMBER },
          max_value: { type: Type.NUMBER },
          is_tag: { type: Type.BOOLEAN }
        }
      }
    }
  },
  required: ["name", "type", "description"]
};

// Helper to clean JSON output
const cleanJson = (text: string) => {
    // First try to find JSON block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        return jsonMatch[1].trim();
    }
    
    // Fallback: extract from first { to last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return text.substring(start, end + 1);
    }
    
    return text.trim();
};

export const testLlmConnection = async (configOverride?: any) => {
    const config = configOverride ? {
        provider: configOverride.provider,
        apiKey: configOverride.provider === 'deepseek' ? configOverride.deepseek.apiKey : configOverride.gemini.apiKey,
        model: configOverride.provider === 'deepseek' ? configOverride.deepseek.model : configOverride.gemini.model,
        baseUrl: configOverride.provider === 'deepseek' ? configOverride.deepseek.baseUrl : undefined
    } : getConfig();
    
    try {
        if (!config.apiKey) throw new Error("API Key is missing");

        if (config.provider === 'deepseek') {
            const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: "user", content: "Test connection. Reply 'OK'." }],
                    max_tokens: 10
                })
            });
            
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`DeepSeek Error: ${response.status} - ${err}`);
            }
            return { success: true, message: "DeepSeek Connection Successful" };
        } else {
            // Gemini
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const result = await ai.models.generateContent({
                model: config.model,
                contents: [{ role: 'user', parts: [{ text: "Test connection. Reply 'OK'." }] }]
            });
            const response = result.response;
            const text = response.text();
            return { success: true, message: "Gemini Connection Successful" };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "Connection Failed" };
    }
};

export const fetchAiSimulationBatch = async (
  device: Device,
  lastMetrics: Record<string, number> | null
): Promise<SimulationResponse> => {
  const config = getConfig();

  const prompt = `
    You are a high-fidelity Industrial IoT Physics Engine.
    Simulate the behavior of a device: "${device.name}" (Type: ${device.type}).
    Description: ${device.description}
    
    Current State: ${device.status.toUpperCase()}
    Active Scenario: "${device.currentScenario}"
    
    Defined Metrics (and limits):
    ${device.metrics.filter(m => !m.is_tag).map(m => `- ${m.id} (${m.name}): [${m.min} to ${m.max}] ${m.unit}${m.is_integer ? ' (INTEGER ONLY)' : ''}`).join('\n')}

    Last Known Metrics: ${JSON.stringify(lastMetrics || {})}

    Task:
    Generate a BATCH of 5 sequential time steps (representing 1 second each) of telemetry data.
    The data must follow physics laws (inertia, thermodynamics). 
    - If status is STOPPED, values should decay to minimums.
    - If RUNNING, values should reflect the "${device.currentScenario}".
    - Example: If "Coolant Leak", temp should rise over the 5 steps, pressure might drop.
    - Add realistic noise/fluctuation.
    - IMPORTANT: If a metric is marked (INTEGER ONLY), you MUST output an integer value.
    
    Output strictly in JSON format matching the schema.
  `;

  try {
    if (config.provider === 'deepseek') {
        // Use Backend Proxy for DeepSeek to avoid CORS/Extension issues
        const proxyUrl = `${API_BASE}/ai/proxy`; // Assuming API_BASE is globally available or imported
        
        // Fallback if API_BASE is relative
        const fullUrl = proxyUrl.startsWith('http') ? proxyUrl : `${window.location.origin}${proxyUrl}`;

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'deepseek',
                apiKey: config.apiKey,
                model: config.model,
                baseUrl: config.baseUrl,
                prompt: prompt
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek Proxy Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(cleanJson(content)) as SimulationResponse;

    } else {
        // Gemini
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
                temperature: 0.4,
            },
        });

        const text = response.response.text();
        if (!text) throw new Error("No text response from AI");

        return JSON.parse(cleanJson(text)) as SimulationResponse;
    }
  } catch (error) {
    console.error("AI Simulation Error:", error);
    throw error;
  }
};

export const generateCategorySchema = async (userDescription: string, lang: string = 'zh'): Promise<any> => {
    const config = getConfig();
    const prompt = `
      You are an IoT System Architect.
      Create a detailed Device Category Schema based on this description: "${userDescription}".
      
      Requirements:
      1. 'code' should be snake_case (e.g., diesel_generator).
      2. 'parameters' should include both Tags (metadata, is_tag=true) and Columns (time-series, is_tag=false).
      3. Parameter types must be one of: INT, FLOAT, BOOL, STRING, TIMESTAMP.
      4. Include reasonable min/max values for numeric metrics.
      5. DO NOT include 'ts' (timestamp) or 'device_code' as they are system auto-generated fields.
      6. Include 'physics_config' with relevant physical constants (e.g., mass_kg, max_velocity, thermal_capacity).
      7. Include 'logic_rules' for basic monitoring (e.g., "temp > 100" -> "status = 'error'").
      8. The 'name' and 'description' fields in the output should be in ${lang === 'zh' ? 'Chinese' : 'English'}.
      
      Output strictly JSON matching this format example:
      {
        "name": "Diesel Generator",
        "code": "diesel_gen",
        "description": "...",
        "parameters": [
          { "id": "model_id", "name": "Model ID", "type": "STRING", "is_tag": true },
          { "id": "rpm", "name": "RPM", "type": "INT", "unit": "rpm", "min_value": 0, "max_value": 3000, "is_tag": false }
        ],
        "physics_config": {
           "mass_kg": 500,
           "max_rpm": 3000
        },
        "logic_rules": [
           { "condition": "rpm > 2800", "action": "status = 'warning'" }
        ]
      }
    `;

    try {
        if (config.provider === 'deepseek') {
             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
             
             try {
                 const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
                 const response = await fetch(url, {
                     method: 'POST',
                     headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${config.apiKey}`
                     },
                     body: JSON.stringify({
                         model: config.model,
                         messages: [
                             { role: "system", content: "You are a JSON generator. Output strictly JSON." },
                             { role: "user", content: prompt }
                         ],
                         // response_format: { type: "json_object" } // Removed to avoid compatibility issues with some DeepSeek models
                     }),
                     signal: controller.signal
                 });
                 
                 if (!response.ok) throw new Error("DeepSeek API Error: " + response.statusText + " (" + response.status + ")");
                 const data = await response.json();
                 console.log("DeepSeek Raw Response:", data); // Debug log
                 const content = data.choices[0].message.content;
                 return JSON.parse(cleanJson(content));
             } finally {
                 clearTimeout(timeoutId);
             }
        } else {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
             const response = await ai.models.generateContent({
                 model: config.model,
                 contents: [{ role: 'user', parts: [{ text: prompt }] }],
                 config: {
                     responseMimeType: "application/json",
                     responseSchema: CATEGORY_SCHEMA,
                 },
             });
             const text = response.response.text();
             return JSON.parse(cleanJson(text));
        }
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};

export const generateSystemReport = async (devices: Device[], stats: any, lang: string = 'zh'): Promise<string> => {
    const config = getConfig();
    
    // Prepare concise data for context (limit size)
    const deviceSummary = devices.map(d => ({
        name: d.name,
        type: d.type,
        status: d.status,
        scenario: d.currentScenario,
        metrics_count: d.metrics?.length
    }));

    const prompt = `
      You are an IoT System Administrator.
      Analyze the following system state and generate a concise health report (in ${lang === 'zh' ? 'Chinese' : 'English'}).
      
      System Stats: ${JSON.stringify(stats)}
      Active Devices: ${JSON.stringify(deviceSummary)}
      
      Requirements:
      1. Summarize overall health.
      2. Highlight any devices in 'running' state and their scenarios.
      3. Point out potential risks based on scenarios (e.g. "High Load", "Failure").
      4. Keep it professional and under 100 words.
    `;

    try {
        if (config.provider === 'deepseek') {
             const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
             const response = await fetch(url, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${config.apiKey}`
                 },
                 body: JSON.stringify({
                     model: config.model,
                     messages: [
                         { role: "system", content: "You are a helpful assistant." },
                         { role: "user", content: prompt }
                     ]
                 })
             });
             
             if (!response.ok) throw new Error("DeepSeek API Error");
             const data = await response.json();
             return data.choices[0].message.content;
        } else {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
             const result = await ai.models.generateContent({
                 model: config.model,
                 contents: [{ role: 'user', parts: [{ text: prompt }] }]
             });
             return result.response.text();
        }
    } catch (error) {
        console.error("AI Report Error:", error);
        throw error;
    }
};

export const generateBatchDevices = async (userDescription: string, lang: string = 'zh'): Promise<Device[]> => {
    const config = getConfig();
    const prompt = `
      You are an IoT System Architect.
      Generate a batch of IoT Devices based on this request: "${userDescription}".
      
      Requirements:
      1. Output a JSON Array of Device objects.
      2. 'id' should be unique (e.g., dev_timestamp_index).
      3. 'name' should be sequential if multiple (e.g., "Temp Sensor 01", "Temp Sensor 02") and in ${lang === 'zh' ? 'Chinese' : 'English'} if appropriate.
      4. 'type' should be consistent.
      5. 'metrics' should be appropriate for the device type.
      6. 'status' should default to 'stopped'.
      
      Output strictly JSON matching this structure:
      [
        {
          "id": "dev_123_1",
          "name": "Sensor 01",
          "type": "Sensor",
          "description": "...",
          "status": "stopped",
          "currentScenario": "Normal",
          "scenarios": ["Normal", "High"],
          "metrics": [
             {"id": "temp", "name": "Temperature", "unit": "C", "min": 0, "max": 100}
          ]
        }
      ]
    `;

    try {
        if (config.provider === 'deepseek') {
             const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
             const response = await fetch(url, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${config.apiKey}`
                 },
                 body: JSON.stringify({
                     model: config.model,
                     messages: [
                         { role: "system", content: "You are a JSON generator. Output strictly JSON." },
                         { role: "user", content: prompt }
                     ],
                     response_format: { type: "json_object" }
                 })
             });
             
             if (!response.ok) throw new Error("DeepSeek API Error");
             const data = await response.json();
             const content = data.choices[0].message.content;
             // DeepSeek might return { "devices": [...] } or just [...]
             const json = JSON.parse(cleanJson(content));
             return Array.isArray(json) ? json : (json.devices || []);
        } else {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
             const result = await ai.models.generateContent({
                 model: config.model,
                 contents: [{ role: 'user', parts: [{ text: prompt }] }],
                 config: { responseMimeType: "application/json" }
             });
             const text = result.response.text();
             const json = JSON.parse(cleanJson(text));
             return Array.isArray(json) ? json : (json.devices || []);
        }
    } catch (error) {
        console.error("AI Batch Generation Error:", error);
        throw error;
    }
};

export const generateVisualModel = async (description: string, lang: string = 'zh'): Promise<any> => {
    const config = getConfig();
    const prompt = `
      You are an IoT 3D Model Expert.
      Create a Visual Model configuration based on this description: "${description}".
      
      Requirements:
      1. 'name': A technical name for the model (e.g., "6-Axis Robot Arm").
      2. 'type': Choose the most appropriate type from [Generator, Cutter, Custom, GLB, GLTF, OBJ, FBX]. 
         - If the description matches a standard industrial generator, use 'Generator'.
         - If it matches a plasma cutter or CNC machine, use 'Cutter'.
         - If you are generating a custom 'visual_config' (Requirement #5), use 'Custom'.
         - Otherwise, if it implies a specific 3D file format, use that. 
         - Default to 'Generic' if unsure.
      3. 'description': A concise description of the model's appearance and function.
      4. 'parameters': Suggest relevant parameters (metrics) that this model would display or be controlled by (e.g., joint angles, RPM, temperature).
         - 'type' should be one of [NUMBER, BOOLEAN, STRING].
      5. 'visual_config': Generate a JSON structure defining a 3D visual representation using simple primitives (Box, Cylinder, Sphere, Cone).
         - Format: { "components": [ { "type": "box"|"cylinder"|"sphere"|"cone", "position": [x,y,z], "size": [x,y,z], "color": "hex", "rotation": [x,y,z] } ] }
         - ALWAYS generate this for 'Custom' type.
         - Try to approximate the shape of the described device using 2-6 primitives.
         - Be creative! Use combinations to make it look like the description.
      
      Output strictly JSON matching this schema:
      {
        "name": string,
        "type": string,
        "description": string,
        "parameters": [ { "id": string, "name": string, "type": string, "unit": string, "min_value": number, "max_value": number, "is_tag": boolean } ],
        "visual_config": { "components": [ ... ] }
      }
    `;

    try {
         // Use Backend Proxy for all requests to avoid CORS and hide keys
         // Note: initApiBase() sets API_BASE in backendService, but here we might need to know the backend URL.
         // Assuming backend is at /api relative to frontend or we can use the same logic.
         // For now, let's assume /api/ai/proxy is reachable via relative path if proxied, or we need the full URL.
         
         // Get API Base from backendService logic or window config
         let apiBase = '/api';
         if (window.electronAPI) {
             const config = await window.electronAPI.getServerConfig();
             apiBase = `${config.baseUrl}/api`;
         } else {
             // If running in dev mode (React on 5173, Python on 8000), we need to point to 8000
             // But usually proxy in vite.config handles /api.
             // If direct, use localhost:8000
             if (window.location.hostname === 'localhost' && window.location.port === '5173') {
                 apiBase = 'http://localhost:8000/api';
             }
         }

         const response = await fetch(`${apiBase}/ai/proxy`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 provider: config.provider,
                 apiKey: config.apiKey,
                 model: config.model,
                 baseUrl: config.baseUrl,
                 prompt: prompt,
                 proxyUrl: config.proxyUrl // Pass proxyUrl
             })
         });

         if (!response.ok) {
             const err = await response.json();
             throw new Error(err.detail || "AI Proxy Error");
         }

         const data = await response.json();
         
         // Parse Response
         if (config.provider === 'deepseek') {
             return JSON.parse(cleanJson(data.choices[0].message.content));
         } else {
             // Gemini Raw Response Structure
             // { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
             if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                 return JSON.parse(cleanJson(data.candidates[0].content.parts[0].text));
             } else {
                 console.error("Unexpected Gemini Response:", data);
                 throw new Error("Invalid Gemini Response Format");
             }
         }
     } catch (error) {
         console.error("AI Visual Model Generation Error:", error);
         throw error;
     }
 };

export const generateLogAnalysis = async (logs: any[], lang: string = 'zh'): Promise<string> => {
    const config = getConfig();
    
    // Prepare log data (limit to last 50 entries to avoid token limits)
    const recentLogs = logs.slice(-50).map(l => 
        `[${l.statusSeverity.toUpperCase()}] ${l.logMessage} (Metrics: ${JSON.stringify(l.metrics || {})})`
    ).join('\n');

    const prompt = `
      You are an IoT System Expert.
      Analyze the following simulation logs and provide a Root Cause Analysis (in ${lang === 'zh' ? 'Chinese' : 'English'}).
      
      Logs:
      ${recentLogs}
      
      Requirements:
      1. Identify any critical errors or warnings.
      2. Detect patterns (e.g., repeated timeouts, metric spikes).
      3. Suggest potential root causes (e.g., "Network congestion", "Sensor malfunction").
      4. Provide actionable recommendations.
      5. If no errors, confirm system stability.
      6. Output format: Markdown (bullet points).
    `;

    try {
        if (config.provider === 'deepseek') {
             const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
             const response = await fetch(url, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${config.apiKey}`
                 },
                 body: JSON.stringify({
                     model: config.model,
                     messages: [
                         { role: "system", content: "You are a helpful assistant." },
                         { role: "user", content: prompt }
                     ]
                 })
             });
             
             if (!response.ok) throw new Error("DeepSeek API Error");
             const data = await response.json();
             return data.choices[0].message.content;
        } else {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
             const result = await ai.models.generateContent({
                 model: config.model,
                 contents: [{ role: 'user', parts: [{ text: prompt }] }]
             });
             return result.response.text();
        }
    } catch (error) {
        console.error("AI Log Analysis Error:", error);
        throw error;
    }
};

export const generateScenarioConfig = async (userDescription: string, deviceName: string, availableParams: {id: string, name: string}[], lang: string = 'zh'): Promise<any> => {
    const config = getConfig();
    const prompt = `
      You are an IoT Simulation Expert.
      Create a detailed Simulation Scenario Configuration based on this description: "${userDescription}".
      Target Device: ${deviceName}
      Available Parameters: ${JSON.stringify(availableParams)}

      Requirements:
      1. 'name': Short, descriptive name (e.g., "Coolant Leak").
      2. 'description': A detailed narrative description for an AI Simulator to follow. It should describe how metrics change over time.
      3. 'parameter_updates': Array of parameter modifications for a physics-based engine.
         - Match 'param_id' to Available Parameters.
         - 'update_type': One of 'set' (fixed value), 'offset' (add value), 'drift' (gradual change), 'noise' (random fluctuation).
         - 'drift_rate': Rate of change per second (positive or negative).
         - 'noise_std_dev': Standard deviation for noise.
         - 'anomaly_probability': Chance of spikes (0-1).
         - If user describes a complex behavior like "exponential rise", approximate it with a high 'drift_rate'.
      4. The 'name' and 'description' fields in the output should be in ${lang === 'zh' ? 'Chinese' : 'English'}.
      
      Output strictly JSON matching this structure:
      {
        "name": "Coolant Leak",
        "description": "The coolant pressure drops linearly...",
        "parameter_updates": [
           { "param_id": "pressure", "update_type": "drift", "drift_rate": -0.5 },
           { "param_id": "temp", "update_type": "drift", "drift_rate": 0.2, "noise_std_dev": 1.0 }
        ]
      }
    `;

    try {
        if (config.provider === 'deepseek') {
             // Use Backend Proxy
             const proxyUrl = `/api/ai/proxy`;
             
             const response = await fetch(proxyUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     provider: 'deepseek',
                     apiKey: config.apiKey,
                     model: config.model,
                     baseUrl: config.baseUrl,
                     prompt: prompt
                 })
             });

             if (!response.ok) {
                 const errText = await response.text();
                 throw new Error(`DeepSeek Proxy Error: ${response.status} - ${errText}`);
             }
             
             const data = await response.json();
             console.log("DeepSeek Raw Response (Scenario):", data);
             const content = data.choices[0].message.content;
             return JSON.parse(cleanJson(content));
        } else {
             const ai = new GoogleGenAI({ apiKey: config.apiKey });
             const result = await ai.models.generateContent({
                 model: config.model,
                 contents: [{ role: 'user', parts: [{ text: prompt }] }],
                 config: { responseMimeType: "application/json" }
             });
             const text = result.response.text();
             return JSON.parse(cleanJson(text));
        }
    } catch (error) {
        console.error("AI Scenario Generation Error:", error);
        throw error;
    }
};
