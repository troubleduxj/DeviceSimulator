import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Device, SimulationResponse } from '../types';
import { backendService } from './backendService';

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

// Helper to fetch and interpolate prompt
const getPromptText = async (key: string, variables: Record<string, any>) => {
    try {
        const promptData = await backendService.getPrompt(key);
        let text = promptData.template;
        for (const [k, v] of Object.entries(variables)) {
            // Replace {{key}} with value
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
        return text;
    } catch (error) {
        console.error(`Failed to fetch prompt '${key}':`, error);
        throw new Error(`Failed to load prompt template for ${key}`);
    }
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

  const metricsInfo = device.metrics.filter(m => !m.is_tag).map(m => `- ${m.id} (${m.name}): [${m.min} to ${m.max}] ${m.unit}${m.is_integer ? ' (INTEGER ONLY)' : ''}`).join('\n');
  const lastMetricsStr = JSON.stringify(lastMetrics || {});

  const prompt = await getPromptText('simulation_batch', {
      device_name: device.name,
      device_type: device.type,
      device_description: device.description,
      device_status: device.status.toUpperCase(),
      active_scenario: device.currentScenario,
      metrics_info: metricsInfo,
      last_metrics: lastMetricsStr
  });

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
    const prompt = await getPromptText('category_schema', {
        user_description: userDescription,
        lang_name: lang === 'zh' ? 'Chinese' : 'English'
    });

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

    const prompt = await getPromptText('system_report', {
        stats: JSON.stringify(stats),
        device_summary: JSON.stringify(deviceSummary),
        lang_name: lang === 'zh' ? 'Chinese' : 'English'
    });

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
    const prompt = await getPromptText('batch_devices', {
        user_description: userDescription,
        lang_name: lang === 'zh' ? 'Chinese' : 'English'
    });

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
    const prompt = await getPromptText('visual_model', {
        description: description
    });

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

    const prompt = await getPromptText('log_analysis', {
        recent_logs: recentLogs,
        lang_name: lang === 'zh' ? 'Chinese' : 'English'
    });

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
    const prompt = await getPromptText('scenario_config', {
        user_description: userDescription,
        device_name: deviceName,
        available_params: JSON.stringify(availableParams),
        lang_name: lang === 'zh' ? 'Chinese' : 'English'
    });

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
