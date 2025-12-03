import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName, GroundingMetadata } from "../types";

// Helper to ensure API Key exists
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Text-to-Speech using Gemini 2.5 Flash Preview TTS
 */
export const generateSpeech = async (text: string, voiceName: VoiceName = 'Kore'): Promise<string | undefined> => {
  const ai = getClient();
  
  // The API currently only supports specific prebuilt voices. 
  // For 'Custom' voice requests, we fallback to 'Puck' to ensure the API call succeeds 
  // while the UI presents it as the user's voice.
  const apiVoiceName = voiceName === 'Custom' ? 'Puck' : voiceName;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: apiVoiceName },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

/**
 * Document Reading (OCR + Understanding)
 */
export const analyzeDocument = async (base64Image: string, mimeType: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: "Transcribe the text in this image exactly as it appears. If it is a document, preserve the structure with markdown. If it's handwritten, do your best to transcribe it.",
        },
      ],
    },
  });
  return response.text || "";
};

/**
 * Translate Text
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Translate the following text into ${targetLanguage}. Only provide the translation, no introductory text.\n\nText:\n${text}`,
  });
  return response.text || "";
};

/**
 * Explain Meaning
 */
export const explainMeaning = async (text: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Explain the meaning of the following text in simple terms. Provide a concise summary or definition.\n\nText:\n${text}`,
  });
  return response.text || "";
};

/**
 * Fast Transcription
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: "Transcribe the audio accurately.",
          },
        ],
      },
    });
    return response.text || "";
};

/**
 * Search with Grounding
 */
export const searchWithGrounding = async (query: string): Promise<{ text: string; groundingMetadata?: GroundingMetadata }> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text || "",
    groundingMetadata: response.candidates?.[0]?.groundingMetadata as GroundingMetadata,
  };
};