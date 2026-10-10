export type Role = 'user' | 'model';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
  error?: string;
  reasoningTimeMs?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  pinned?: boolean;
  mode?: ChatMode;
}

export type ChatMode = 'standard' | 'deep_thought' | 'creative' | 'coder';

export interface MemoryItem {
  id: string;
  category: 'personal' | 'work' | 'preference' | 'project' | 'general';
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  userName: string;
  preferredLanguage: 'bn' | 'en' | 'auto';
  voiceSpeed: number;
  voicePitch: number;
  voiceGender: 'female' | 'male';
  femaleVoiceName?: 'Aoede' | 'Kore' | 'Zephyr';
  femaleVoiceStyle?: 'sweet' | 'professional';
  autoSpeakResponse: boolean;
  selectedVoiceURI: string;
  customInstructions: string;
  theme: 'dark' | 'light' | 'oled';
  soundEffects: boolean;
}
