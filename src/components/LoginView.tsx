import React, { useState } from 'react';
import { UserProfile, Shop } from '@/types';
import { ShieldCheck, User, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, shop: Shop) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;

    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onLoginSuccess(data.user, data.shop);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const loginDemoOwner = () => {
    setEmail('owner@shop.com');
    setPassword('Owner@123');
    handleSubmit(undefined, 'owner@shop.com', 'Owner@123');
  };

  const loginDemoCashier = () => {
    setEmail('cashier@shop.com');
    setPassword('Cashier@123');
    handleSubmit(undefined, 'cashier@shop.com', 'Cashier@123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 mx-auto flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl shadow-emerald-500/20">
          SB
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Sri Balaji Mobile & Accessories
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-Powered Mobile Billing & Real-Time Stock Management
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-200">Sign in to Shop Account</span>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3" /> Secure Access
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                placeholder="owner@shop.com or cashier@shop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Tap Quick Testing Credentials */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block text-center">
            Quick 1-Tap Test Accounts:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={loginDemoOwner}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left transition flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white truncate">Owner Login</div>
                <div className="text-[9px] text-slate-400 truncate">Full Access</div>
              </div>
            </button>

            <button
              type="button"
              onClick={loginDemoCashier}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left transition flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white truncate">Cashier Login</div>
                <div className="text-[9px] text-slate-400 truncate">Billing Only</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
