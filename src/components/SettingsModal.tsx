import React, { useState } from 'react';
import {
  Settings,
  X,
  Download,
  Upload,
  Volume2,
  Globe,
  Sliders,
  Shield,
  Check,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { UserSettings } from '../types';
import { exportEntireDatabaseJSON, importEntireDatabaseJSON } from '../services/storage';
import { speakText, stopSpeech } from '../services/speech';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onDataImported: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onDataImported,
}) => {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'backup' | 'about'>('profile');
  const [importSuccess, setImportSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  if (!isOpen) return null;

  const handleTestVoice = async (voiceName: string = formData.femaleVoiceName || 'Aoede') => {
    if (isTestingVoice) {
      stopSpeech();
      setIsTestingVoice(false);
      return;
    }

    setIsTestingVoice(true);
    const testSample =
      formData.voiceGender === 'female'
        ? `হ্যালো ${formData.userName || 'নাফি ভাইয়া'}, কেমন আছেন? আমি আপনার মিষ্টি ও স্পষ্ট ব্যক্তিগত এআই।`
        : `হ্যালো ${formData.userName || 'নাফি'}, আমি আপনার ব্যক্তিগত এআই।`;

    await speakText(testSample, {
      voiceGender: formData.voiceGender,
      voiceName,
      rate: formData.voiceSpeed,
      onStart: () => setIsTestingVoice(true),
      onEnd: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    });
  };

  const handleSave = () => {
    stopSpeech();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleExport = () => {
    const json = exportEntireDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nafi-gpt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importEntireDatabaseJSON(content);
      if (success) {
        setImportSuccess(true);
        onDataImported();
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        alert('ফাইলটি সঠিক NAFI GPT ব্যাকআপ ফরম্যাটে নেই।');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1120] border border-slate-800 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">সেটিংস ও পছন্দসমূহ</h2>
              <p className="text-[10px] text-slate-400">Settings & Customization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/30 px-4 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 font-medium border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            প্রোফাইল ও ইনস্ট্রাকশন
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 px-3 font-medium border-b-2 transition ${
              activeTab === 'voice'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ভয়েস ও অডিও
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 font-medium border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ব্যাকআপ ও ডাটা ট্রান্সফার
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-3 font-medium border-b-2 transition ${
              activeTab === 'about'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            সম্পর্কে
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  আপনার নাম (Your Name)
                </label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  placeholder="যেমন: Nafi"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  নাফি জিপিটি আপনাকে এই নামে সম্বোধন করবে।
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  পছন্দের ভাষা (Preferred Language)
                </label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredLanguage: e.target.value as any })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="auto">স্বয়ংক্রিয় (Auto detect)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  কাস্টম সিস্টেম নির্দেশাবলী (Custom Instructions)
                </label>
                <textarea
                  rows={4}
                  value={formData.customInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, customInstructions: e.target.value })
                  }
                  placeholder="নাফি জিপিটিকে নির্দিষ্টভাবে কীভাবে কথা বলতে চান..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  এটি প্রতিটি উত্তরে স্বয়ংক্রিয়ভাবে প্রযোজ্য হবে।
                </p>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  ভয়েস চরিত্র ও জেন্ডার (Voice Gender & Persona)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, voiceGender: 'female' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      formData.voiceGender === 'female'
                        ? 'bg-pink-950/50 border-pink-500 text-pink-200 shadow-md shadow-pink-500/10'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl">👩</span>
                    <div>
                      <div className="font-semibold text-xs text-white">মিষ্টি মেয়ে কণ্ঠ</div>
                      <div className="text-[10px] text-pink-300/80">Female Voice (Aoede)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, voiceGender: 'male' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      formData.voiceGender === 'male'
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl">👨</span>
                    <div>
                      <div className="font-semibold text-xs text-white">পুরুষ কণ্ঠ</div>
                      <div className="text-[10px] text-cyan-300/80">Male Voice (Puck)</div>
                    </div>
                  </button>
                </div>
                {/* Specific Female Voice Character Options */}
                {formData.voiceGender === 'female' && (
                  <div className="mt-3 p-3 rounded-xl bg-pink-950/20 border border-pink-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-pink-300 text-xs">
                        মেয়ে কণ্ঠের ধরন ও মিষ্টতা (Voice Style)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTestVoice()}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          isTestingVoice
                            ? 'bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse'
                            : 'bg-pink-900/60 border-pink-500/50 text-pink-200 hover:bg-pink-800/80'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isTestingVoice ? 'থামুন' : 'কণ্ঠ শুনুন'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {[
                        {
                          id: 'Aoede' as const,
                          name: '🌸 মিষ্টি সুরময় কণ্ঠ (Aoede)',
                          desc: 'সবচেয়ে মিষ্টি, কোমল, সুরেলা ও আকর্ষণীয় নারী কণ্ঠ',
                        },
                        {
                          id: 'Kore' as const,
                          name: '✨ স্পষ্ট ও প্রাণবন্ত তরুণী (Kore)',
                          desc: 'উজ্জ্বল, ক্রিস্টাল-ক্লিয়ার ও বুদ্ধিদীপ্ত তরুণী কণ্ঠ',
                        },
                        {
                          id: 'Zephyr' as const,
                          name: '🍃 শান্ত ও স্নিগ্ধ কণ্ঠ (Zephyr)',
                          desc: 'ধীরস্থির, শান্ত ও অত্যন্ত মধুর স্নিগ্ধ কণ্ঠ',
                        },
                      ].map((v) => (
                        <label
                          key={v.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition text-left ${
                            (formData.femaleVoiceName || 'Aoede') === v.id
                              ? 'bg-pink-950/60 border-pink-500/80 text-pink-100'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="femaleVoice"
                            checked={(formData.femaleVoiceName || 'Aoede') === v.id}
                            onChange={() => {
                              setFormData({ ...formData, femaleVoiceName: v.id });
                              handleTestVoice(v.id);
                            }}
                            className="mt-0.5 accent-pink-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs text-white">{v.name}</div>
                            <div className="text-[10px] text-pink-300/70">{v.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>কথা বলার গতি (Voice Speed): {formData.voiceSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.1"
                  value={formData.voiceSpeed}
                  onChange={(e) =>
                    setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoSpeakResponse}
                    onChange={(e) =>
                      setFormData({ ...formData, autoSpeakResponse: e.target.checked })
                    }
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-slate-300">
                    প্রতিটি উত্তরের পর স্বয়ংক্রিয়ভাবে মুখে পড়ে শুনানো (Auto Read Aloud)
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-cyan-400" />
                  সম্পূর্ণ ডাটা এক্সপোর্ট / ব্যাকআপ
                </h3>
                <p className="text-slate-400 text-[11px]">
                  আপনার সকল কথোপকথন, ব্যক্তিগত মেমোরি এবং সেটিংস একটি ফাইলে সেভ করুন।
                </p>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition"
                >
                  ব্যাকআপ ফাইল ডাউনলোড করুন (Export JSON)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-purple-400" />
                  ফোন ও ল্যাপটপে ডাটা ট্রান্সফার / রিস্টোর
                </h3>
                <p className="text-slate-400 text-[11px]">
                  এক ডিভাইস থেকে ডাউনলোড করা ব্যাকআপ ফাইলটি অন্য ডিভাইসে আপলোড করে সম্পূর্ণ চ্যাট ও স্মৃতি চালু করুন।
                </p>
                <label className="inline-block px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer transition">
                  ফাইল সিলেক্ট করে রিস্টোর করুন
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
                {importSuccess && (
                  <p className="text-emerald-400 font-medium pt-1">
                    ✓ ডাটা সফলভাবে রিস্টোর করা হয়েছে!
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-3 p-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-cyan-500/20">
                  N
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">NAFI GPT (নাফি জিপিটি)</h3>
                  <p className="text-slate-400 text-xs">সংস্করণ: 2.5 Ultra Edition</p>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-300 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <p className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>আনলিমিটেড ব্যবহার:</strong> কোনো চ্যাট লিমিট বা মেসেজ ক্যাপ নেই।
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>কোনো সাবস্ক্রিপশন নেই:</strong> সম্পূর্ণ উন্মুক্ত ও পার্সোনাল।
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>পার্মানেন্ট মেমোরি:</strong> ফোন ও ল্যাপটপে সব ডাটা সেভ থাকে।
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>বহুভাষিক দক্ষতা:</strong> বাংলা, ইংরেজি সহ পৃথিবীর সব ভাষা জানে।
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-emerald-400 text-xs flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> সেটিংস সংরক্ষিত হয়েছে!
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">পরিবর্তন সেভ করতে সংরক্ষণ বাটনে চাপুন</span>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition text-xs"
            >
              বন্ধ করুন
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition shadow-md shadow-cyan-600/20"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
