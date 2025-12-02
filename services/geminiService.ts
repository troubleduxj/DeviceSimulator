import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Device, SimulationResponse } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const fetchAiSimulationBatch = async (
  device: Device,
  lastMetrics: Record<string, number> | null
): Promise<SimulationResponse> => {
  const ai = getClient();
  const model = "gemini-2.5-flash";

  const prompt = `
    You are a high-fidelity Industrial IoT Physics Engine.
    Simulate the behavior of a device: "${device.name}" (Type: ${device.type}).
    Description: ${device.description}
    
    Current State: ${device.status.toUpperCase()}
    Active Scenario: "${device.currentScenario}"
    
    Defined Metrics (and limits):
    ${device.metrics.map(m => `- ${m.id} (${m.name}): [${m.min} to ${m.max}] ${m.unit}`).join('\n')}

    Last Known Metrics: ${JSON.stringify(lastMetrics || {})}

    Task:
    Generate a BATCH of 5 sequential time steps (representing 1 second each) of telemetry data.
    The data must follow physics laws (inertia, thermodynamics). 
    - If status is STOPPED, values should decay to minimums.
    - If RUNNING, values should reflect the "${device.currentScenario}".
    - Example: If "Coolant Leak", temp should rise over the 5 steps, pressure might drop.
    - Add realistic noise/fluctuation.
    
    Output strictly in JSON format matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4, // Keep it grounded in physics
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text response from AI");

    return JSON.parse(text) as SimulationResponse;
  } catch (error) {
    console.error("Gemini Simulation Error:", error);
    throw error;
  }
};
