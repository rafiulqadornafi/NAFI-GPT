import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Plus,
  Headphones,
  Database,
  Download,
  Settings as SettingsIcon,
  Sparkles,
  Brain,
  Code2,
  Mic,
  MessageSquare,
  WifiOff,
} from 'lucide-react';
import { Conversation, ChatMessage as ChatMessageType, ChatAttachment, ChatMode } from './types';
import {
  getStoredConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  getStoredMemories,
  saveMemories,
  getStoredSettings,
  saveSettings,
} from './services/storage';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { VoiceModal } from './components/VoiceModal';
import { MemoryVaultModal } from './components/MemoryVaultModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { SettingsModal } from './components/SettingsModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { speakText } from './services/speech';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [memories, setMemories] = useState(getStoredMemories());
  const [settings, setSettings] = useState(getStoredSettings());

  const [currentMode, setCurrentMode] = useState<ChatMode>('standard');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Modals state
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  const { isInstallable, isInstalled } = usePWAInstall();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const loadedConversations = getStoredConversations();
    setConversations(loadedConversations);

    const savedActiveId = getActiveConversationId();
    if (savedActiveId && loadedConversations.some((c) => c.id === savedActiveId)) {
      setActiveId(savedActiveId);
    } else if (loadedConversations.length > 0) {
      setActiveId(loadedConversations[0].id);
    } else {
      // Create first empty chat
      const firstChat: Conversation = {
        id: `chat-${Date.now()}`,
        title: 'নতুন কথোপকথন',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode: 'standard',
      };
      setConversations([firstChat]);
      setActiveId(firstChat.id);
      saveConversations([firstChat]);
      setActiveConversationId(firstChat.id);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save active id changes
  useEffect(() => {
    if (activeId) {
      setActiveConversationId(activeId);
    }
  }, [activeId]);

  // Auto-scroll when messages change or stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isStreaming]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const handleCreateNewChat = () => {
    const newChat: Conversation = {
      id: `chat-${Date.now()}`,
      title: 'নতুন কথোপকথন',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      mode: currentMode,
    };
    const updated = [newChat, ...conversations];
    setConversations(updated);
    setActiveId(newChat.id);
    saveConversations(updated);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);
      if (activeId === id) {
        if (updated.length > 0) {
          setActiveId(updated[0].id);
        } else {
          setTimeout(() => handleCreateNewChat(), 0);
        }
      }
      return updated;
    });
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
      );
      saveConversations(updated);
      return updated;
    });
  };

  const handleTogglePin = (id: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned, updatedAt: Date.now() } : c
      );
      saveConversations(updated);
      return updated;
    });
  };

  const handleSaveMemories = (newMemories: typeof memories) => {
    setMemories(newMemories);
    saveMemories(newMemories);
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleDataImported = () => {
    setConversations(getStoredConversations());
    setMemories(getStoredMemories());
    setSettings(getStoredSettings());
  };

  // Stop streaming helper
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    // mark streaming flag as false on last message
    if (activeId) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const msgs = [...c.messages];
          if (msgs.length > 0 && msgs[msgs.length - 1].isStreaming) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], isStreaming: false };
          }
          return { ...c, messages: msgs };
        })
      );
    }
  };

  // Main Send Message Handler
  const handleSendMessage = async (
    text: string,
    attachments: ChatAttachment[] = [],
    isVoiceCall: boolean = false
  ): Promise<string | void> => {
    if (!text.trim() && attachments.length === 0) return;

    let targetConv = activeConversation;
    let currentConvId = activeId;
    let isBrandNewChat = false;

    if (!targetConv || !currentConvId) {
      isBrandNewChat = true;
      currentConvId = `chat-${Date.now()}`;
      targetConv = {
        id: currentConvId,
        title: text.slice(0, 30) || 'নতুন কথোপকথন',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode: currentMode,
      };
      setActiveId(currentConvId);
    }

    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
      attachments,
    };

    const aiMsgId = `msg-ai-${Date.now() + 1}`;
    const placeholderAiMsg: ChatMessageType = {
      id: aiMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const isFirstMessage = targetConv.messages.length === 0;

    // Update state with user message and placeholder AI message
    const updatedMessages = [...targetConv.messages, userMsg, placeholderAiMsg];

    setConversations((prev) => {
      let next: Conversation[];
      if (isBrandNewChat || !prev.some((c) => c.id === currentConvId)) {
        next = [{ ...targetConv!, messages: updatedMessages, updatedAt: Date.now() }, ...prev];
      } else {
        next = prev.map((c) =>
          c.id === currentConvId
            ? { ...c, messages: updatedMessages, updatedAt: Date.now() }
            : c
        );
      }
      saveConversations(next);
      return next;
    });

    // Auto-generate title if it's the first message
    if (isFirstMessage && text.trim()) {
      fetch('/api/summarize-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.title) {
            handleRenameConversation(currentConvId!, data.title);
          }
        })
        .catch(() => {});
    }

    // Auto memory detection: If user says something personal like "আমার নাম...", "আমার বয়স...", "আমি ঢাকায় থাকি"
    if (
      text.includes('আমার নাম') ||
      text.includes('আমার বাসা') ||
      text.includes('আমি থাকি') ||
      text.includes('আমার প্রিয়') ||
      text.includes('মনে রেখো') ||
      text.includes('মনে রাখবা')
    ) {
      const autoMem = {
        id: `mem-${Date.now()}`,
        category: 'personal' as const,
        content: text.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      handleSaveMemories([autoMem, ...memories]);
    }

    // Prepare API call
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    // Prepare memory payload
    const memoryString = memories.map((m) => `- ${m.content}`).join('\n');

    // Build payload messages with full attachments (PDFs, Word docs, images)
    const apiMessages = targetConv.messages
      .filter((m) => !m.error && (m.text?.trim() || (m.attachments && m.attachments.length > 0)))
      .concat(userMsg)
      .map((m) => ({
        role: m.role,
        text: m.text,
        attachments: m.attachments,
        images: m.attachments
          ?.filter((a) => a.mimeType.startsWith('image/'))
          .map((a) => ({ mimeType: a.mimeType, data: a.data })),
      }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemInstruction: settings.customInstructions,
          mode: currentMode,
          personalMemory: memoryString,
          userName: settings.userName,
          voiceGender: settings.voiceGender,
          isVoiceCall,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `সার্ভার এরর: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('রেসপন্স স্ট্রিম রিডার পাওয়া যায়নি');

      const decoder = new TextDecoder();
      let fullResponseText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep partial incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              fullResponseText += parsed.text;
              // Live update model message
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== currentConvId) return c;
                  const msgs = c.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, text: fullResponseText, isStreaming: true } : m
                  );
                  return { ...c, messages: msgs };
                })
              );
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (err: any) {
            if (err.message && !err.message.includes('JSON')) {
              console.warn('Stream chunk error:', err.message);
            }
          }
        }
      }

      // Finish streaming
      setIsStreaming(false);
      abortControllerRef.current = null;

      // Persist finalized messages
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== currentConvId) return c;
          const msgs = c.messages.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false, text: fullResponseText } : m
          );
          return { ...c, messages: msgs };
        });
        saveConversations(next);
        return next;
      });

      // Auto speak if enabled
      if (settings.autoSpeakResponse && fullResponseText) {
        speakText(fullResponseText.slice(0, 500), {
          rate: settings.voiceSpeed,
          voiceGender: settings.voiceGender,
          voiceName: settings.femaleVoiceName || 'Aoede',
        });
      }

      return fullResponseText;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('User stopped the stream');
      } else {
        console.error('Chat error:', error);
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== currentConvId) return c;
            const msgs = c.messages.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    error: `সমস্যা হয়েছে: ${error.message || 'দয়া করে আবার চেষ্টা করুন'}`,
                  }
                : m
            );
            return { ...c, messages: msgs };
          });
          saveConversations(next);
          return next;
        });
      }
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length < 2) return;
    const msgs = [...activeConversation.messages];
    // Find last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const userMsg = msgs[lastUserIndex];
    // Trim conversation up to that user message and re-send
    const sliced = msgs.slice(0, lastUserIndex);
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeId ? { ...c, messages: sliced } : c
      );
      saveConversations(updated);
      return updated;
    });

    handleSendMessage(userMsg.text, userMsg.attachments || []);
  };

  const starterPrompts = [
    {
      title: 'বড় PDF ও Word ফাইল বিশ্লেষণ',
      desc: 'যেকোনো বড় বই, রিপোর্ট বা ডকুমেন্টের সারাংশ ও প্রশ্ন-উত্তর',
      icon: Sparkles,
      color: 'from-rose-500 to-indigo-600',
      prompt: 'বড় বড় PDF এবং Microsoft Word ডকুমেন্ট বিশ্লেষণ করার ক্ষেত্রে তুমি কীভাবে সাহায্য করতে পারো?',
    },
    {
      title: 'মিষ্টি মেয়ে কণ্ঠে সরাসরি আড্ডা',
      desc: 'মানুষের মতো স্বাভাবিক ও মিষ্টি নারী কণ্ঠে লাইভ কথা বলুন',
      icon: Mic,
      color: 'from-pink-500 to-purple-600',
      action: () => setIsVoiceOpen(true),
    },
    {
      title: 'কোডিং ও সফটওয়্যার আর্কিটেকচার',
      desc: 'বাগ সমাধান, ফুলস্ট্যাক কোড, অ্যালগরিদম ও ডিজাইন',
      icon: Code2,
      color: 'from-indigo-500 to-blue-600',
      prompt: 'একটি আধুনিক ফুলস্ট্যাক অ্যাপ্লিকেশনে ক্যাশিং এবং স্টেট ম্যানেজমেন্টের সেরা কৌশলগুলো কী কী?',
    },
    {
      title: 'পার্সোনাল মেমোরি ও ডাটা সেভ',
      desc: 'আপনার ব্যক্তিগত তথ্য ও প্রজেক্ট চিরস্থায়ী মনে রাখা',
      icon: Database,
      color: 'from-cyan-500 to-teal-600',
      prompt: 'আমার নাম নাফি। আমার ব্যক্তিগত লক্ষ্য ও পছন্দের বিষয়গুলো তুমি কীভাবে চিরস্থায়ী মনে রাখো?',
    },
  ];

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => setActiveId(id)}
        onNewChat={handleCreateNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        onOpenMemoryVault={() => setIsMemoryOpen(true)}
        onOpenInstallModal={() => setIsInstallOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
        memoryCount={memories.length}
        userName={settings.userName}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#090d16] relative overflow-hidden">
        {/* Subtle Ambient Cosmic Mesh Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-[#090d16]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarMobileOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition"
              title="মেনু খুলুন"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {activeConversation?.title || 'নতুন কথোপকথন'}
              </h1>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                NAFI GPT Ultra
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Offline notification badge */}
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">অফলাইন</span>
              </div>
            )}

            {/* Install to Home Screen Button */}
            {!isInstalled && (
              <button
                onClick={() => setIsInstallOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/60 text-purple-300 text-xs font-medium shadow-sm transition active:scale-95"
                title="হোম স্ক্রিনে রাখুন"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ইন্সটল করুন</span>
              </button>
            )}

            {/* Female / Male Voice Selector in Header */}
            <button
              onClick={() => {
                const nextGender = settings.voiceGender === 'female' ? 'male' : 'female';
                handleSaveSettings({ ...settings, voiceGender: nextGender });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 shadow-sm ${
                settings.voiceGender === 'female'
                  ? 'bg-pink-950/70 border-pink-500/60 text-pink-300 shadow-pink-500/10'
                  : 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-cyan-500/10'
              }`}
              title="কণ্ঠ পরিবর্তন করুন (মেয়ে কণ্ঠ / পুরুষ কণ্ঠ)"
            >
              <span>{settings.voiceGender === 'female' ? '👩 মেয়ে কণ্ঠ' : '👨 পুরুষ কণ্ঠ'}</span>
            </button>

            {/* Memory Vault button */}
            <button
              onClick={() => setIsMemoryOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
              title="ব্যক্তিগত মেমোরি ভল্ট"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Voice Mode button */}
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
              title="লাইভ ভয়েস মোড"
            >
              <Headphones className="w-4 h-4" />
            </button>

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="সেটিংস"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* New chat icon */}
            <button
              onClick={handleCreateNewChat}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition sm:hidden"
              title="নতুন চ্যাট"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream or Welcome Greeting Screen */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {(!activeConversation || activeConversation.messages.length === 0) ? (
            <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center justify-center text-center">
              {/* Futuristic Glowing Brand Logo */}
              <div className="relative mb-6 group cursor-pointer">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition duration-500 animate-pulse" />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/40 ring-2 ring-cyan-400/50 bg-[#090d16] flex items-center justify-center">
                  <img
                    src="/icon.svg"
                    alt="NAFI GPT"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                স্বাগতম {settings.userName || 'নাফি'}!
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-6 leading-relaxed">
                আমি <strong className="text-cyan-400">NAFI GPT</strong> — আপনার ব্যক্তিগত,
                আনলিমিটেড ও সার্বক্ষণিক এআই সঙ্গী। মানুষের মতো অনুভূতি, পৃথিবীর সকল ভাষার দক্ষতা এবং আপনার নিজস্ব মেমোরি সহ প্রস্তুত।
              </p>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left mt-2">
                {starterPrompts.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (p.action) {
                          p.action();
                        } else if (p.prompt) {
                          handleSendMessage(p.prompt);
                        }
                      }}
                      className="group p-4 rounded-2xl bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 flex flex-col justify-between shadow-lg hover:shadow-cyan-500/5 active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-white shadow-md`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                          {p.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {p.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Install PWA Prompt Banner on Desktop/Mobile */}
              {!isInstalled && (
                <div className="mt-8 w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-purple-950/40 border border-cyan-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <Download className="w-6 h-6 text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        ফোন বা ল্যাপটপের হোম স্ক্রিনে রাখতে চান?
                      </p>
                      <p className="text-[11px] text-slate-400">
                        ইন্সটল করুন এবং যেকোনো সময় এক ক্লিকে NAFI GPT ওপেন করুন।
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInstallOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-cyan-500/20 whitespace-nowrap"
                  >
                    ইন্সটল গাইড দেখুন
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40 pb-6">
              {activeConversation.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRegenerate={handleRegenerate}
                  userName={settings.userName}
                  voiceGender={settings.voiceGender}
                  voiceName={settings.femaleVoiceName || 'Aoede'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Chat Input Form */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          onOpenVoiceMode={() => setIsVoiceOpen(true)}
          currentMode={currentMode}
          onChangeMode={(mode) => setCurrentMode(mode)}
          language={settings.preferredLanguage}
        />
      </main>

      {/* Voice Mode Modal */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSendMessage={async (voiceText) => {
          return await handleSendMessage(voiceText, [], true);
        }}
        language={settings.preferredLanguage}
        voiceSpeed={settings.voiceSpeed}
        voiceGender={settings.voiceGender}
        femaleVoiceName={settings.femaleVoiceName || 'Aoede'}
        onToggleVoiceGender={(g) => handleSaveSettings({ ...settings, voiceGender: g })}
      />

      {/* Memory Vault Modal */}
      <MemoryVaultModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onSaveMemories={handleSaveMemories}
        userName={settings.userName}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onDataImported={handleDataImported}
      />
    </div>
  );
}
