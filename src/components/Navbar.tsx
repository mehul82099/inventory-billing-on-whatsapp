import React from 'react';
import { UserProfile, Shop } from '@/types';
import { Sparkles, LogOut, ShieldCheck, User, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  shop: Shop;
  onOpenAiBilling: () => void;
  onLogout: () => void;
  isOnline?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  shop,
  onOpenAiBilling,
  onLogout,
  isOnline = true,
}) => {
  return (
    <header className="sticky top-0 z-40 relative bg-slate-950/90 backdrop-blur border-b border-slate-800 px-3 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Shop Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-emerald-500/20 shrink-0">
            {shop.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate leading-tight">
              {shop.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="truncate">{shop.city}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
              {isOnline ? (
                <span className="flex items-center text-emerald-400 gap-0.5 text-[11px]">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center text-amber-400 gap-0.5 text-[11px]">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Billing Trigger Button */}
          <button
            onClick={onOpenAiBilling}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-violet-500/20 transition active:scale-95"
            title="AI Natural Language Billing"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">AI Bill</span>
          </button>

          {/* User Role Badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-xs">
            {user.role === 'owner' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="text-slate-200 font-medium hidden md:inline truncate max-w-[90px]">
              {user.full_name.split(' ')[0]}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-slate-700 text-slate-300">
              {user.role}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition active:scale-95"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="seam absolute bottom-0 left-0 right-0 opacity-70" />
    </header>
  );
};
