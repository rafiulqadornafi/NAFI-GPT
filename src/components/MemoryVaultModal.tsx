import React, { useState } from 'react';
import { Database, Plus, Trash2, Search, Sparkles, X, Edit3, Check, Brain, ShieldCheck } from 'lucide-react';
import { MemoryItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onSaveMemories: (newMemories: MemoryItem[]) => void;
  userName: string;
}

export const MemoryVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  memories,
  onSaveMemories,
  userName,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('personal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newContent.trim()) return;
    const item: MemoryItem = {
      id: `mem-${Date.now()}`,
      category: newCategory,
      content: newContent.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveMemories([item, ...memories]);
    setNewContent('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onSaveMemories(memories.filter((m) => m.id !== id));
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) return;
    onSaveMemories(
      memories.map((m) =>
        m.id === id ? { ...m, content: editContent.trim(), updatedAt: Date.now() } : m
      )
    );
    setEditingId(null);
  };

  const filtered = memories.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch = m.content.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryLabels: Record<string, string> = {
    all: 'সব মেমোরি',
    personal: 'ব্যক্তিগত তথ্য',
    preference: 'পছন্দ ও আচরণ',
    project: 'প্রজেক্ট ও কাজ',
    general: 'সাধারণ নোট',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1120] border border-cyan-500/20 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">নাফি জিপিটি মেমোরি ভল্ট</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Permanent Vault
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {userName || 'নাফি'} এর ব্যক্তিগত ডাটা ও স্মৃতি — যা এআই সারাজীবন মনে রাখবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / Privacy notice */}
        <div className="px-5 py-2.5 bg-cyan-950/30 border-b border-cyan-900/40 flex items-center gap-2 text-xs text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            আপনার সকল ডাটা সম্পূর্ণ ব্যক্তিগত এবং আপনার ব্রাউজারের নিজস্ব সুরক্ষিত ডাটাবেসে চিরস্থায়ী সংরক্ষিত।
          </span>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row gap-3 bg-slate-900/40">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="মেমোরি বা নোট খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            নতুন তথ্য যোগ করুন
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-4 py-2 border-b border-slate-800/60 overflow-x-auto text-xs">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                selectedCategory === key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Add Form */}
        {isAdding && (
          <div className="p-4 bg-slate-800/70 border-b border-slate-700 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> NAFI GPT কে নতুন কিছু মনে রাখতে বলুন:
              </span>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="personal">ব্যক্তিগত তথ্য (Personal)</option>
                <option value="preference">পছন্দ/অভ্যাস (Preference)</option>
                <option value="project">প্রজেক্ট/কাজ (Project)</option>
                <option value="general">সাধারণ নোট (General)</option>
              </select>
            </div>
            <textarea
              rows={3}
              placeholder="উদাহরণ: আমার প্রিয় প্রোগ্রামিং ভাষা পাইথন, আমি ঢাকায় থাকি, বা আমার লক্ষ্য এআই এক্সপার্ট হওয়া..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                বাতিল
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
              >
                মেমোরিতে সেভ করুন
              </button>
            </div>
          </div>
        )}

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
              কোনো মেমোরি পাওয়া যায়নি।
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="group p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-cyan-500/30 transition flex flex-col gap-2"
              >
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        বাতিল
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-3 py-1 rounded-md bg-cyan-600 text-white text-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> সংরক্ষণ
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditContent(item.content);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-700/60 transition"
                          title="সম্পাদনা করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-700/60">
                        {categoryLabels[item.category] || item.category}
                      </span>
                      <span>
                        সেভ করা হয়েছে: {new Date(item.createdAt).toLocaleDateString('bn-BD')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>মোট সংরক্ষিত তথ্য: {memories.length} টি</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
