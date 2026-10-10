import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  User,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../types';
import { speakText, stopSpeech } from '../services/speech';

interface Props {
  message: ChatMessageType;
  onRegenerate?: () => void;
  onEdit?: (newText: string) => void;
  userName?: string;
  voiceGender?: 'female' | 'male';
  voiceName?: string;
}

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const ChatMessage: React.FC<Props> = ({
  message,
  onRegenerate,
  userName = 'Nafi',
  voiceGender = 'female',
  voiceName,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const isModel = message.role === 'model';

  // Sanitize and render markdown for AI message
  const htmlContent = useMemo(() => {
    if (!message.text) return '';
    try {
      const rawHtml = marked.parse(message.text) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (e) {
      return message.text;
    }
  }, [message.text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy message:', e);
    }
  };

  const handleSpeak = async () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      setIsLoadingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    await speakText(message.text, {
      voiceGender,
      voiceName,
      onStart: () => {
        setIsLoadingAudio(false);
        setIsPlayingAudio(true);
      },
      onEnd: () => {
        setIsLoadingAudio(false);
        setIsPlayingAudio(false);
      },
      onError: () => {
        setIsLoadingAudio(false);
        setIsPlayingAudio(false);
      },
    });
  };

  return (
    <div
      className={`py-5 px-4 md:px-6 transition-colors ${
        isModel
          ? 'bg-[#0f172a]/40 border-y border-slate-800/40'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isModel ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <span className="text-[11px] font-black tracking-tighter text-white">N</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs shadow-inner">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {isModel ? 'NAFI GPT' : userName}
              </span>
              {isModel && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-medium">
                  Ultra AI
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Attached Images/Files */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-1 pb-2">
              {message.attachments.map((att) => {
                const lowerName = (att.name || '').toLowerCase();
                const isPdf = att.mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
                const isWord =
                  att.mimeType.includes('word') ||
                  att.mimeType.includes('officedocument') ||
                  lowerName.endsWith('.docx') ||
                  lowerName.endsWith('.doc');

                return (
                  <div
                    key={att.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-750 bg-slate-800/90 max-w-xs shadow-md transition hover:border-cyan-500/50"
                  >
                    {att.mimeType.startsWith('image/') ? (
                      <img
                        src={att.data}
                        alt={att.name}
                        className="max-h-48 max-w-xs object-cover rounded-xl"
                      />
                    ) : isPdf ? (
                      <div className="p-3 flex items-center gap-3 bg-gradient-to-r from-rose-950/40 to-slate-900 border-l-4 border-rose-500 text-xs">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-200 truncate">{att.name}</p>
                          <p className="text-[10px] text-rose-300">পিডিএফ ডকুমেন্ট</p>
                        </div>
                      </div>
                    ) : isWord ? (
                      <div className="p-3 flex items-center gap-3 bg-gradient-to-r from-blue-950/40 to-slate-900 border-l-4 border-blue-500 text-xs">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                          DOC
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-200 truncate">{att.name}</p>
                          <p className="text-[10px] text-blue-300">ওয়ার্ড / অফিস ডকুমেন্ট</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 flex items-center gap-2.5 text-xs text-slate-300 bg-slate-800/80">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="truncate block font-medium max-w-[170px]">{att.name}</span>
                          <span className="text-[10px] text-slate-400">ডকুমেন্ট ফাইল</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error notice if present */}
          {message.error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{message.error}</span>
            </div>
          )}

          {/* Message Text Rendering */}
          {isModel ? (
            <div
              className="prose-nafi text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {message.text}
            </div>
          )}

          {/* Typing/Streaming indicator */}
          {message.isStreaming && (
            <div className="inline-flex items-center gap-1.5 pt-1 text-cyan-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-slate-400 text-xs">NAFI GPT লিখছে...</span>
            </div>
          )}

          {/* Bottom Action Toolbar */}
          {!message.isStreaming && (
            <div className="flex items-center gap-2 pt-2 text-slate-400">
              <button
                onClick={handleCopy}
                className="p-1 rounded-md hover:text-slate-200 hover:bg-slate-800/60 transition text-xs flex items-center gap-1"
                title="কপি করুন"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400">কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">কপি</span>
                  </>
                )}
              </button>

              {isModel && (
                <>
                  <button
                    onClick={handleSpeak}
                    className={`p-1 rounded-md hover:text-slate-200 hover:bg-slate-800/60 transition text-xs flex items-center gap-1 ${
                      isPlayingAudio ? 'text-cyan-400 font-semibold' : ''
                    }`}
                    title={isPlayingAudio ? 'থামুন' : 'শুনুন'}
                  >
                    {isLoadingAudio ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span className="text-[11px] text-cyan-400">ভয়েস লোড হচ্ছে...</span>
                      </>
                    ) : isPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span className="text-[11px]">থামুন</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">শুনুন (ভয়েস)</span>
                      </>
                    )}
                  </button>

                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="p-1 rounded-md hover:text-slate-200 hover:bg-slate-800/60 transition text-xs flex items-center gap-1"
                      title="পুনরায় তৈরি করুন"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[11px]">আবার লিখুন</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
