export enum AppMode {
  DOCUMENT_READER = 'DOCUMENT_READER',
  LIVE_CONVERSATION = 'LIVE_CONVERSATION',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  groundingMetadata?: GroundingMetadata;
  audioData?: string; // base64 encoded audio
}

export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
}

export interface AudioVisualizationData {
  volume: number;
}

export interface VoiceOption {
  id: string;
  label: string;
  gender: string;
}

export const AVAILABLE_VOICES: readonly VoiceOption[] = [
  { id: 'Puck', label: 'Puck (Male)', gender: 'Male' },
  { id: 'Charon', label: 'Charon (Male)', gender: 'Male' },
  { id: 'Kore', label: 'Kore (Female)', gender: 'Female' },
  { id: 'Fenrir', label: 'Fenrir (Male)', gender: 'Male' },
  { id: 'Zephyr', label: 'Zephyr (Female)', gender: 'Female' },
] as const;

export type VoiceName = typeof AVAILABLE_VOICES[number]['id'] | 'Custom';

export const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'French', label: 'French' },
  { code: 'German', label: 'German' },
  { code: 'Italian', label: 'Italian' },
  { code: 'Portuguese', label: 'Portuguese' },
  { code: 'Hindi', label: 'Hindi' },
  { code: 'Chinese', label: 'Chinese' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Arabic', label: 'Arabic' },
  { code: 'Russian', label: 'Russian' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];