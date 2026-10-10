import { Conversation, MemoryItem, UserSettings } from '../types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'nafigpt_conversations',
  ACTIVE_ID: 'nafigpt_active_conversation_id',
  MEMORIES: 'nafigpt_personal_memories',
  SETTINGS: 'nafigpt_user_settings',
};

export const defaultSettings: UserSettings = {
  userName: 'Nafi',
  preferredLanguage: 'auto',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  voiceGender: 'female',
  femaleVoiceName: 'Aoede',
  femaleVoiceStyle: 'sweet',
  autoSpeakResponse: false,
  selectedVoiceURI: '',
  customInstructions: 'আমার নাম নাফি। আমার সাথে সবসময় আন্তরিক ও সহজবোধ্য ভাষায় কথা বলবে। সকল প্রশ্নের সঠিক, বিস্তারিত ও বুদ্ধিমত্তাপূর্ণ উত্তর দিবে।',
  theme: 'dark',
  soundEffects: true,
};

export const defaultMemories: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'personal',
    content: 'ব্যবহারকারীর নাম নাফি (Nafi)। তিনি এই এআই এর একমাত্র এবং প্রধান মালিক।',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'mem-2',
    category: 'preference',
    content: 'নাফি বাংলায় কথা বলতে স্বাচ্ছন্দ্যবোধ করেন। তিনি স্পষ্ট, গভীর ও বন্ধুত্বপূর্ণ উত্তর পছন্দ করেন।',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function getStoredConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load conversations from storage:', e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

export function getActiveConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    }
  } catch (e) {
    console.error('Failed to set active conversation:', e);
  }
}

export function getStoredMemories(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(defaultMemories));
      return defaultMemories;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load memories:', e);
    return defaultMemories;
  }
}

export function saveMemories(memories: MemoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to save memories:', e);
  }
}

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return defaultSettings;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// Backup & Export / Import
export function exportEntireDatabaseJSON(): string {
  const data = {
    appName: 'NAFI GPT',
    version: '2.5 Ultra',
    exportDate: new Date().toISOString(),
    conversations: getStoredConversations(),
    memories: getStoredMemories(),
    settings: getStoredSettings(),
  };
  return JSON.stringify(data, null, 2);
}

export function importEntireDatabaseJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed.conversations)) {
      saveConversations(parsed.conversations);
    }
    if (Array.isArray(parsed.memories)) {
      saveMemories(parsed.memories);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveSettings({ ...defaultSettings, ...parsed.settings });
    }
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}
