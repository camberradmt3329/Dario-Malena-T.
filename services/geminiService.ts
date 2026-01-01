
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function extractDataFromImage(base64Image: string): Promise<ExtractionResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: "Analiza esta tabla de regulación de frecuencia. Extrae el porcentaje de carga para las unidades G1, G2, G3, G4 y G5. También identifica el porcentaje de Regulación Primaria (RPF), el porcentaje de Regulación Secundaria (RSF) y la Disponibilidad Programada al OC (MW).",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            units: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  loadPercent: { type: Type.NUMBER },
                },
                required: ["name", "loadPercent"],
              },
            },
            globalRPF: { type: Type.NUMBER },
            globalRSF: { type: Type.NUMBER },
            programmedMW: { type: Type.NUMBER },
          },
          required: ["units", "globalRPF", "globalRSF", "programmedMW"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ExtractionResult;
  } catch (error) {
    console.error("Error extraction from image:", error);
    return null;
  }
}
