import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Headphones,
  X,
  Sparkles,
  BrainCircuit,
  Code2,
  Palette,
  MessageSquare,
} from 'lucide-react';
import { ChatAttachment, ChatMode } from '../types';

interface Props {
  onSendMessage: (text: string, attachments: ChatAttachment[]) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  onOpenVoiceMode: () => void;
  currentMode: ChatMode;
  onChangeMode: (mode: ChatMode) => void;
  language: 'bn' | 'en' | 'auto';
}

export const ChatInput: React.FC<Props> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  onOpenVoiceMode,
  currentMode,
  onChangeMode,
  language,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isRecordingDictation, setIsRecordingDictation] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dictationRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    if (!text.trim() && attachments.length === 0) return;

    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random()}`,
            name: file.name,
            mimeType: file.type || 'image/jpeg',
            data: base64,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Dictation directly to input text
  const toggleDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট নেই। Chrome ব্যবহার করুন।');
      return;
    }

    if (isRecordingDictation) {
      if (dictationRef.current) dictationRef.current.stop();
      setIsRecordingDictation(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'en' ? 'en-US' : 'bn-BD';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsRecordingDictation(false);
      };

      recognition.onend = () => {
        setIsRecordingDictation(false);
      };

      dictationRef.current = recognition;
      recognition.start();
      setIsRecordingDictation(true);
    } catch (e) {
      console.error(e);
      setIsRecordingDictation(false);
    }
  };

  const modes = [
    { id: 'standard', label: 'স্মার্ট চ্যাট', icon: Sparkles, desc: 'দ্রুত ও বুদ্ধিমত্তা' },
    { id: 'deep_thought', label: 'গভীর যুক্তি', icon: BrainCircuit, desc: 'বিশ্লেষণ ও গভীর চিন্তা' },
    { id: 'coder', label: 'কোডার মোড', icon: Code2, desc: 'সফটওয়্যার ও বাগ ফিক্স' },
    { id: 'creative', label: 'সৃজনশীল', icon: Palette, desc: 'গল্প ও ভাব প্রকাশ' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Mode Selector */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs">
        {modes.map((m) => {
          const Icon = m.icon;
          const isSelected = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChangeMode(m.id as ChatMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 font-medium shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Input Box */}
      <div className="relative rounded-2xl bg-[#0f172a] border border-slate-700/80 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-xl transition-all">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((att) => {
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
                  className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-md"
                >
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.data} alt={att.name} className="h-16 w-16 object-cover" />
                  ) : isPdf ? (
                    <div className="h-16 w-32 p-2 bg-gradient-to-br from-rose-950/60 to-slate-900 flex flex-col justify-center items-start text-[10px] text-slate-200 border-l-2 border-rose-500">
                      <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold text-[9px] mb-1">
                        PDF
                      </span>
                      <span className="truncate max-w-[105px] font-medium">{att.name}</span>
                    </div>
                  ) : isWord ? (
                    <div className="h-16 w-32 p-2 bg-gradient-to-br from-blue-950/60 to-slate-900 flex flex-col justify-center items-start text-[10px] text-slate-200 border-l-2 border-blue-500">
                      <span className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold text-[9px] mb-1">
                        DOCX
                      </span>
                      <span className="truncate max-w-[105px] font-medium">{att.name}</span>
                    </div>
                  ) : (
                    <div className="h-16 w-28 p-2 flex flex-col justify-center items-center text-[10px] text-slate-300">
                      <span className="truncate max-w-[90px] font-medium">{att.name}</span>
                      <span className="text-[9px] text-slate-400">ডকুমেন্ট</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white hover:bg-rose-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="যেকোনো প্রশ্ন করুন, বড় PDF বা Word ফাইল যুক্ত করে বুঝিয়ে নিন..."
          rows={1}
          className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-44"
        />

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left actions: Attachments & Dictation */}
          <div className="flex items-center gap-1 text-slate-400">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.xlsx,.ppt,.pptx"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 p-2 px-2.5 rounded-xl hover:text-cyan-400 hover:bg-slate-800 transition text-xs"
              title="পিডিএফ, ওয়ার্ড বা ছবি ফাইল যুক্ত করুন"
            >
              <Paperclip className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] text-slate-300 hidden sm:inline">PDF / Word / ফাইল</span>
            </button>

            <button
              onClick={toggleDictation}
              className={`p-2 rounded-xl transition ${
                isRecordingDictation
                  ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                  : 'hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="মুখে বলুন (ভয়েস টাইপিং)"
            >
              {isRecordingDictation ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4 hover:text-cyan-400 transition" />
              )}
            </button>

            <button
              onClick={onOpenVoiceMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs transition"
              title="লাইভ কথা বলুন (Voice Conversation)"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">লাইভ ভয়েস</span>
            </button>
          </div>

          {/* Right action: Send or Stop */}
          <div>
            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="থামান"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                className={`p-2.5 rounded-xl transition flex items-center justify-center ${
                  text.trim() || attachments.length > 0
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="পাঠান"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-center text-slate-400 mt-2">
        NAFI GPT • আনলিমিটেড লাইফটাইম পার্সোনাল এআই • কোনো রেট লিমিট বা সাবস্ক্রিপশন নেই
      </p>
    </div>
  );
};
