import React, { useState, useEffect } from 'react';
import { UserProfile, Shop } from '@/types';
import { ShieldCheck, User, Lock, Mail, ArrowRight, AlertCircle, Store } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { apiFetch } from '@/lib/api';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, shop: Shop) => void;
}

type Mode = 'signin' | 'register' | 'setup' | 'confirm-email';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const supabase = getSupabaseBrowser();
  const isBackend = Boolean(supabase);
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If a verified session exists but shop setup is incomplete, resume setup.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setMode('setup');
    });
  }, []);

  const finishWithSession = async () => {
    const res = await apiFetch('/api/auth/session');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load your account');
    onLoginSuccess(data.user, data.shop);
  };

  const handleBackendSignIn = async () => {
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message);
    await finishWithSession();
  };

  const handleBackendRegister = async () => {
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password });
    if (error) throw new Error(error.message);
    if (!data.session) {
      // Email confirmation required by the project settings.
      setMode('confirm-email');
      return;
    }
    await completeSetup();
  };

  const completeSetup = async () => {
    if (!shopName.trim() || !fullName.trim()) throw new Error('Shop name and your name are required');
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName: shopName.trim(), fullName: fullName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    onLoginSuccess(data.user, data.shop);
  };

  const handleDemoLogin = async (loginEmail: string, loginPassword: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    onLoginSuccess(data.user, data.shop);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email && mode !== 'setup') return;
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!isBackend) {
        await handleDemoLogin(email, password);
      } else if (mode === 'signin') {
        await handleBackendSignIn();
      } else if (mode === 'register') {
        await handleBackendRegister();
      } else if (mode === 'setup') {
        await completeSetup();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 mx-auto flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl shadow-emerald-500/20">
          {isBackend ? <Store className="w-7 h-7" /> : 'SB'}
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {isBackend ? 'Inventory & Billing' : 'Sri Balaji Mobile & Accessories'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isBackend ? 'Your shop, your account. Billing & stock on WhatsApp.' : 'AI-Powered Mobile Billing & Real-Time Stock Management'}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-200">
            {!isBackend && 'Sign in to Demo'}
            {isBackend && mode === 'signin' && 'Sign in to your shop'}
            {isBackend && mode === 'register' && 'Create your account'}
            {isBackend && mode === 'setup' && 'Set up your shop'}
            {isBackend && mode === 'confirm-email' && 'Confirm your email'}
          </span>
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

        {mode === 'confirm-email' ? (
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              We sent a confirmation link to <span className="font-bold text-white">{email}</span>. Open it to
              verify your email, then come back and sign in.
            </p>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2"
            >
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode !== 'setup' && (
              <>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder={isBackend ? 'you@example.com' : 'owner@shop.com or cashier@shop.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
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
                      placeholder={isBackend && mode === 'register' ? 'At least 6 characters' : '••••••••'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            )}

            {isBackend && (mode === 'register' || mode === 'setup') && (
              <>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Shop Name</label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma Mobile Gallery"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                {mode === 'register' && (
                  <p className="text-[10px] text-slate-500">
                    Your shop starts empty - add your own products, categories and suppliers after signing in.
                  </p>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : !isBackend
                  ? 'Sign In'
                  : mode === 'signin'
                    ? 'Sign In'
                    : mode === 'register'
                      ? 'Create Account'
                      : 'Save & Open My Shop'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {isBackend && mode !== 'confirm-email' && mode !== 'setup' && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode(mode === 'signin' ? 'register' : 'signin');
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              {mode === 'signin' ? "New here? Register your shop" : 'Already have an account? Sign in'}
            </button>
          </div>
        )}

        {/* 1-Tap demo credentials, only where demo mode is enabled */}
        {!isBackend && demoEnabled && (
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block text-center">
              Quick 1-Tap Test Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('owner@shop.com', 'Owner@123')}
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
                onClick={() => handleDemoLogin('cashier@shop.com', 'Cashier@123')}
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
        )}
      </div>
    </div>
  );
};
