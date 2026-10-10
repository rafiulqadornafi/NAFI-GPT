import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Pin,
  Edit2,
  Check,
  Search,
  Database,
  Download,
  Settings,
  X,
  Sparkles,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onOpenMemoryVault: () => void;
  onOpenInstallModal: () => void;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  memoryCount: number;
  userName: string;
}

export const Sidebar: React.FC<Props> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onOpenMemoryVault,
  onOpenInstallModal,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
  memoryCount,
  userName = 'Nafi',
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  // Group by time
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const today = unpinned.filter((c) => now - c.updatedAt < oneDay);
  const yesterday = unpinned.filter(
    (c) => now - c.updatedAt >= oneDay && now - c.updatedAt < 2 * oneDay
  );
  const older = unpinned.filter((c) => now - c.updatedAt >= 2 * oneDay);

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderChatItem = (c: Conversation) => {
    const isActive = c.id === activeId;
    const isEditing = c.id === editingId;

    return (
      <div
        key={c.id}
        onClick={() => {
          onSelectConversation(c.id);
          onCloseMobile();
        }}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition ${
          isActive
            ? 'bg-slate-800 text-cyan-300 font-medium shadow-sm'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <MessageSquare
          className={`w-3.5 h-3.5 shrink-0 ${
            isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
          }`}
        />

        {isEditing ? (
          <form
            onSubmit={(e) => handleSaveRename(c.id, e)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center gap-1"
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className="w-full bg-slate-900 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="p-1 text-emerald-400 hover:bg-slate-700 rounded"
            >
              <Check className="w-3 h-3" />
            </button>
          </form>
        ) : (
          <span className="truncate flex-1">{c.title || 'নতুন কথোপকথন'}</span>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-1 shrink-0 opacity-80 hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(c.id);
              }}
              className={`p-1 rounded hover:bg-slate-700 transition ${
                c.pinned ? 'text-cyan-400' : 'text-slate-400'
              }`}
              title={c.pinned ? 'আনপিন করুন' : 'পিন করুন'}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleStartRename(c, e)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="শিরোনাম পরিবর্তন"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(c.id);
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
              title="মুছে ফেলুন"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40 bg-[#090d16] shrink-0">
              <img src="/icon.svg" alt="NAFI GPT" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wide text-white">
                  NAFI GPT
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-semibold">
                  Ultra
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">নাফি জিপিটি এআই</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>নতুন কথোপকথন (New Chat)</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="চ্যাট খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
          {pinned.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-2.5 h-2.5 text-cyan-400" /> পিন করা চ্যাট
              </div>
              <div className="space-y-0.5">{pinned.map(renderChatItem)}</div>
            </div>
          )}

          {today.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                আজকের চ্যাট
              </div>
              <div className="space-y-0.5">{today.map(renderChatItem)}</div>
            </div>
          )}

          {yesterday.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                গতকাল
              </div>
              <div className="space-y-0.5">{yesterday.map(renderChatItem)}</div>
            </div>
          )}

          {older.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                পূর্বের কথোপকথন
              </div>
              <div className="space-y-0.5">{older.map(renderChatItem)}</div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              কোনো কথোপকথন নেই। উপরে নতুন চ্যাট শুরু করুন।
            </div>
          )}
        </div>

        {/* Feature Navigation Bottom Section */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5 bg-[#090d16]">
          {/* Memory Vault button */}
          <button
            onClick={() => {
              onOpenMemoryVault();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>মেমোরি ভল্ট (সব ডাটা সেভ)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {memoryCount}
            </span>
          </button>

          {/* Install to Home Screen button */}
          <button
            onClick={() => {
              onOpenInstallModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              <span>হোম স্ক্রিনে রাখুন (ইন্সটল)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
              PWA
            </span>
          </button>

          {/* Settings & Backup */}
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>সেটিংস ও ব্যাকআপ</span>
            </div>
          </button>

          {/* User Profile Footer */}
          <div className="pt-2 mt-1 border-t border-slate-800/60 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-700">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
                {userName} (মালিক)
              </span>
            </div>
            <span className="text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              সক্রিয়
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
