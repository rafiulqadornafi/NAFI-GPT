let currentAudio: HTMLAudioElement | null = null;

export async function speakText(
  text: string,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
    rate?: number;
    voiceGender?: 'female' | 'male';
    voiceName?: string;
  } = {}
): Promise<() => void> {
  const { onStart, onEnd, onError, rate = 1.0, voiceGender = 'female', voiceName } = options;

  // Stop any currently playing audio
  stopSpeech();

  // Try server-side high quality Gemini TTS first (Aoede / Kore for Female, Puck for Male)
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceGender,
        voiceName,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioData) {
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`;
        const audio = new Audio(audioSrc);
        audio.playbackRate = rate;
        currentAudio = audio;

        audio.onplay = () => {
          onStart?.();
        };

        audio.onended = () => {
          currentAudio = null;
          onEnd?.();
        };

        audio.onerror = (e) => {
          console.warn('Audio element error, falling back to Web Speech API:', e);
          fallbackWebSpeech(text, options);
        };

        await audio.play();
        return () => {
          audio.pause();
          audio.currentTime = 0;
          currentAudio = null;
        };
      }
    }
  } catch (err) {
    console.warn('Server TTS failed or offline, using fallback:', err);
  }

  // Fallback to browser SpeechSynthesis
  return fallbackWebSpeech(text, options);
}

export function stopSpeech(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}

function fallbackWebSpeech(
  text: string,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
    rate?: number;
    voiceGender?: 'female' | 'male';
  }
): () => void {
  const { onStart, onEnd, onError, rate = 1.0, voiceGender = 'female' } = options;

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onError?.(new Error('Speech synthesis not supported'));
    onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*#_~>]/g, '')
    .slice(0, 800);

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = rate;
  utterance.pitch = voiceGender === 'female' ? 1.2 : 0.95;

  const isBengali = /[\u0980-\u09FF]/.test(cleanText);
  utterance.lang = isBengali ? 'bn-BD' : 'en-US';

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(
    (v) => {
      const name = v.name.toLowerCase();
      const isFemaleName = name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('sabrina') || name.includes('heera') || name.includes('siri') || name.includes('google');
      if (isBengali) {
        return (v.lang.includes('bn') || name.includes('bangla') || name.includes('bengali')) && (voiceGender === 'female' ? isFemaleName || true : true);
      }
      return v.lang.includes('en') && (voiceGender === 'female' ? isFemaleName : true);
    }
  );
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => {
    onError?.(e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}
