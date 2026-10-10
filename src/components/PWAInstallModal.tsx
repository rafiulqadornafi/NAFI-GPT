import React from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, X, Share, PlusSquare, ArrowUpRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">হাতে বা ল্যাপটপে ইন্সটল করুন</h2>
              <p className="text-xs text-slate-400">Install NAFI GPT on Home Screen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/50 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">ইতোমধ্যে ইন্সটল করা আছে!</p>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  NAFI GPT আপনার ডিভাইসের হোম স্ক্রিনে একটি স্বাধীন অ্যাপ হিসেবে যুক্ত আছে।
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="text-center p-4 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-cyan-500/30">
              <p className="text-sm text-slate-200 mb-3">
                এক ক্লিকেই আপনার ফোন বা ল্যাপটপের হোম স্ক্রিনে NAFI GPT অ্যাপ হিসেবে ডাউনলোড করে রাখুন।
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                সরাসরি হোম স্ক্রিনে ইন্সটল করুন (Install App)
              </button>
            </div>
          ) : isIOS ? (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>iPhone / iPad এ যেভাবে রাখবেন:</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                <li>Safari ব্রাউজারের নিচের <span className="inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded text-white font-medium"><Share className="w-3 h-3" /> Share</span> বাটনে ট্যাপ করুন।</li>
                <li>নিচে স্ক্রল করে <span className="inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded text-white font-medium"><PlusSquare className="w-3 h-3" /> Add to Home Screen</span> অপশন চাপুন।</li>
                <li>উপরে ডানে <strong className="text-cyan-300">Add</strong> বাটনে চাপ দিন। ব্যস! ফোনের হোম স্ক্রিনে নাফি জিপিটি চলে আসবে।</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1.5">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>কম্পিউটার / ল্যাপটপ (Chrome/Edge):</span>
                </div>
                ব্রাউজারের অ্যাড্রেস বারের ডানে থাকা ছোট <span className="text-cyan-400 font-medium">Install icon (⊕)</span> এ ক্লিক করুন অথবা মেনু (⋮) &gt; <strong className="text-white">Save and share &gt; Install NAFI GPT</strong> সিলেক্ট করুন।
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>অ্যান্ড্রয়েড ফোন (Chrome):</span>
                </div>
                ব্রাউজারের উপরে ডানে থাকা ৩-ডট মেনু (⋮) তে চাপুন এবং <strong className="text-white">Install App</strong> অথবা <strong className="text-white">Add to Home screen</strong> চাপুন।
              </div>
            </div>
          )}

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              অফলাইনেও ইন্টারফেস রেডি
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              কোনো সাবস্ক্রিপশন ফি নেই
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ডাটা চিরকাল আপনার ফোনে সেভ
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              চ্যাট ও উত্তরের কোনো লিমিট নেই
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            বুঝেছি / বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
