import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Languages, MessageSquare, Loader2 } from 'lucide-react';
import { speakText, stopSpeech } from '../services/speech';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<string | void>;
  language: 'bn' | 'en' | 'auto';
  voiceSpeed: number;
  voiceGender?: 'female' | 'male';
  femaleVoiceName?: string;
  onToggleVoiceGender?: (gender: 'female' | 'male') => void;
}

export const VoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSendMessage,
  language = 'bn',
  voiceSpeed = 1.0,
  voiceGender = 'female',
  femaleVoiceName = 'Aoede',
  onToggleVoiceGender,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiSpeechText, setAiSpeechText] = useState('');
  const [activeLang, setActiveLang] = useState<'bn-BD' | 'en-US'>('bn-BD');
  const [currentGender, setCurrentGender] = useState<'female' | 'male'>(voiceGender);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const stopSpeechCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setCurrentGender(voiceGender);
  }, [voiceGender]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopAll();
      return;
    }

    // Auto-detect voice language preference
    setActiveLang(language === 'en' ? 'en-US' : 'bn-BD');
    startListening();

    return () => {
      stopAll();
    };
  }, [isOpen]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopAll = () => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    stopSpeech();
    if (stopSpeechCallbackRef.current) {
      try {
        stopSpeechCallbackRef.current();
      } catch (e) {
        // ignore
      }
      stopSpeechCallbackRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    isProcessingRef.current = false;
  };

  const startListening = () => {
    stopAll();
    setErrorMsg(null);
    latestTranscriptRef.current = '';
    setTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('আপনার ব্রাউজারে ভয়েস রিকগনিশন সাপোর্ট নেই। Chrome বা Edge ব্যবহার করুন।');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = activeLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        const trimmed = currentTranscript.trim();
        if (trimmed) {
          latestTranscriptRef.current = trimmed;
          setTranscript(trimmed);

          // Fast 1.2-second silence detector: user paused speaking -> auto-send!
          clearSilenceTimer();
          silenceTimerRef.current = setTimeout(() => {
            if (latestTranscriptRef.current && !isProcessingRef.current) {
              handleSendVoiceMessage(latestTranscriptRef.current);
            }
          }, 1200);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition warning:', event.error);
        }
      };

      recognition.onend = () => {
        // If not processing and not speaking, restart continuous listening
        if (!isProcessingRef.current && !stopSpeechCallbackRef.current && isOpen) {
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setErrorMsg('মাইক্রোফোন চালু করা যায়নি। মাইক্রোফোনের অনুমতি দিন।');
    }
  };

  const handleSendVoiceMessage = async (textToSend: string) => {
    if (!textToSend || isProcessingRef.current) return;
    clearSilenceTimer();

    // Stop recognition while waiting for AI response
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setIsListening(false);
    setErrorMsg(null);

    try {
      const response = await onSendMessage(textToSend);
      isProcessingRef.current = false;
      setIsProcessing(false);

      if (response && typeof response === 'string') {
        speakResponse(response);
      } else {
        // Resume listening
        startListening();
      }
    } catch (err: any) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setErrorMsg('উত্তর পেতে সমস্যা হয়েছে, আবার বলুন।');
      setTimeout(() => startListening(), 1000);
    }
  };

  const speakResponse = async (text: string) => {
    // Clean text for sweet, spoken conversation
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 400);

    setAiSpeechText(cleanText);
    setIsSpeaking(true);

    const cancelFn = await speakText(cleanText, {
      rate: voiceSpeed,
      voiceGender: currentGender,
      voiceName: currentGender === 'female' ? femaleVoiceName : 'Puck',
      onStart: () => {
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setAiSpeechText('');
        stopSpeechCallbackRef.current = null;
        // Natural continuous call loop: resume listening immediately
        startListening();
      },
      onError: () => {
        setIsSpeaking(false);
        stopSpeechCallbackRef.current = null;
        startListening();
      },
    });

    stopSpeechCallbackRef.current = cancelFn;
  };

  const toggleLanguage = () => {
    stopAll();
    const nextLang = activeLang === 'bn-BD' ? 'en-US' : 'bn-BD';
    setActiveLang(nextLang);
    setTimeout(() => startListening(), 150);
  };

  const toggleVoiceGender = () => {
    const nextGender = currentGender === 'female' ? 'male' : 'female';
    setCurrentGender(nextGender);
    onToggleVoiceGender?.(nextGender);
  };

  const handleOrbClick = () => {
    if (isSpeaking) {
      // User interrupts AI
      stopSpeech();
      setIsSpeaking(false);
      startListening();
    } else if (isListening && transcript.trim()) {
      // User wants instant reply without waiting
      handleSendVoiceMessage(transcript.trim());
    } else if (isListening) {
      stopAll();
    } else {
      startListening();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md h-[550px] flex flex-col justify-between items-center rounded-3xl bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#020617] border border-cyan-500/30 shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold text-cyan-300 tracking-wider">
              NAFI GPT LIVE
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Female / Male Voice Selector */}
            <button
              onClick={toggleVoiceGender}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition ${
                currentGender === 'female'
                  ? 'bg-pink-950/70 border-pink-500/60 text-pink-300 shadow-sm shadow-pink-500/20'
                  : 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
              }`}
              title="কণ্ঠ পরিবর্তন করুন (মেয়ে / পুরুষ)"
            >
              <span>{currentGender === 'female' ? '👩 মেয়ে কণ্ঠ' : '👨 পুরুষ কণ্ঠ'}</span>
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 hover:text-white transition"
              title="ভাষা পরিবর্তন করুন"
            >
              <Languages className="w-3 h-3 text-cyan-400" />
              <span>{activeLang === 'bn-BD' ? 'বাং' : 'EN'}</span>
            </button>
            <button
              onClick={() => {
                stopAll();
                onClose();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Animated Orb / Sound Wave */}
        <div className="relative flex flex-col items-center justify-center my-auto">
          {/* Luminous Pulsing Rings */}
          <div
            className={`absolute w-44 h-44 rounded-full transition-all duration-700 ${
              isSpeaking
                ? 'bg-gradient-to-tr from-purple-500/30 to-pink-500/30 scale-125 blur-xl animate-pulse'
                : isListening
                ? 'bg-gradient-to-tr from-cyan-500/30 to-blue-500/30 scale-110 blur-xl animate-pulse'
                : isProcessing
                ? 'bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 scale-100 blur-lg animate-spin'
                : 'bg-slate-800/20 blur-md'
            }`}
          />

          <div
            onClick={handleOrbClick}
            className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer active:scale-95 ${
              isSpeaking
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 shadow-purple-500/40 ring-4 ring-purple-400/30 scale-105'
                : isListening
                ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-cyan-500/40 ring-4 ring-cyan-400/40 scale-110 animate-pulse'
                : isProcessing
                ? 'bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-amber-500/30 ring-2 ring-amber-400/30'
                : 'bg-slate-800 border border-slate-700'
            }`}
            title={
              isSpeaking
                ? 'থামাতে চাপুন'
                : isListening && transcript
                ? 'এখনই উত্তর শুনতে চাপুন'
                : 'কথা বলতে চাপুন'
            }
          >
            {isSpeaking ? (
              <Volume2 className="w-12 h-12 text-white animate-bounce" />
            ) : isListening ? (
              <Mic className="w-12 h-12 text-white" />
            ) : isProcessing ? (
              <Sparkles className="w-10 h-10 text-white animate-spin" />
            ) : (
              <MicOff className="w-10 h-10 text-slate-400" />
            )}
          </div>

          {/* Status Label */}
          <div className="mt-6 text-center">
            <h3 className="text-base font-semibold text-white">
              {isSpeaking
                ? 'নাফি জিপিটি মিষ্টি কণ্ঠে বলছে...'
                : isListening
                ? transcript ? 'শুনছি... (থামলেই সাথে সাথে উত্তর পাবেন)' : 'শুনছি... কথা বলুন'
                : isProcessing
                ? 'তাত্ক্ষণিকভাবে উত্তর প্রস্তুত হচ্ছে...'
                : 'কথা বলতে প্রস্তুত'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {isListening
                ? activeLang === 'bn-BD'
                  ? 'কথা বলা শেষ হলে ১ সেকেন্ডের মধ্যে উত্তর আসবে'
                  : 'Speak naturally, instant reply follows'
                : isSpeaking
                ? 'শুনুন অথবা নতুন কথা বলতে ওর্বে চাপুন'
                : 'কথা বলা শুরু করতে নিচের মাইক চাপুন'}
            </p>
          </div>
        </div>

        {/* Live Subtitle Transcript Display & Instant Action */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="w-full min-h-[65px] max-h-[100px] overflow-y-auto px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center flex items-center justify-center">
            {errorMsg ? (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            ) : isListening && transcript ? (
              <p className="text-xs text-cyan-200 font-medium">"{transcript}"</p>
            ) : isSpeaking && aiSpeechText ? (
              <p className="text-xs text-pink-200 line-clamp-3 font-medium">{aiSpeechText}</p>
            ) : (
              <p className="text-[11px] text-slate-400">
                {isListening ? 'কথা বলুন, থামলেই সাথে সাথে স্পষ্ট ও মিষ্টি কণ্ঠে উত্তর পাবেন' : 'লাইভ রিয়েল-টাইম ভয়েস কল'}
              </p>
            )}
          </div>

          {/* Instant Reply button if user has spoken */}
          {isListening && transcript && (
            <button
              onClick={() => handleSendVoiceMessage(transcript)}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/30 transition active:scale-95 animate-pulse flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>এখনই উত্তর শুনুন</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => {
              if (isListening) {
                stopAll();
              } else {
                startListening();
              }
            }}
            className={`p-4 rounded-full text-white shadow-lg transition active:scale-95 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
            }`}
            title={isListening ? 'থামুন' : 'শুরু করুন'}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
