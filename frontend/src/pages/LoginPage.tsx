import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Shield, User, Lock, Mail, ChevronRight } from 'lucide-react';

// Snack display items in the vending machine glass
const VENDING_ITEMS = [
  { slot: 'A1', emoji: '🥜', label: 'Mixed Nuts' },
  { slot: 'A2', emoji: '🍫', label: 'Choco Bar' },
  { slot: 'A3', emoji: '🥤', label: 'Coconut Water' },
  { slot: 'B1', emoji: '🧆', label: 'Bhujia' },
  { slot: 'B2', emoji: '🍘', label: 'Makhana' },
  { slot: 'B3', emoji: '🫙', label: 'Trail Mix' },
  { slot: 'C1', emoji: '🍵', label: 'Chai Latte' },
  { slot: 'C2', emoji: '🥛', label: 'Protein Bar' },
  { slot: 'C3', emoji: '🍪', label: 'Millet Cookie' },
];

type LoginMode = 'idle' | 'keypad' | 'dispensing';

export const LoginPage: React.FC = () => {
  const { login, quickDemoLogin } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('idle');
  const [displayText, setDisplayText] = useState('INSERT CREDENTIALS');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [dispensingRole, setDispensingRole] = useState<'ADMIN' | 'MEMBER' | null>(null);
  const [blink, setBlink] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const timer = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(timer);
  }, []);

  // Cycling idle display messages
  useEffect(() => {
    if (mode !== 'idle') return;
    const msgs = [
      'WELCOME TO SNACK OVERFLOW',
      'INSERT CREDENTIALS TO ACCESS',
      'SELECT QUICK DEMO BELOW',
      '🇮🇳 INDIAN PANTRY VENDING',
    ];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % msgs.length;
      setDisplayText(msgs[i]);
    }, 2500);
    return () => clearInterval(timer);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please enter email and password', 'warning');
      return;
    }
    setMode('dispensing');
    setDisplayText('AUTHENTICATING...');
    setLoading(true);
    try {
      await login(email.trim(), password);
      setDisplayText('ACCESS GRANTED ✓');
      showToast('Welcome to Snack Overflow! 🎉', 'success');
    } catch (err: any) {
      setDisplayText('ACCESS DENIED ✗');
      showToast(err.message || 'Login failed', 'error');
      setTimeout(() => {
        setMode('keypad');
        setDisplayText('TRY AGAIN');
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'ADMIN' | 'MEMBER', slot: string) => {
    setSelectedSlot(slot);
    setDispensingRole(role);
    setMode('dispensing');
    setDisplayText(`SLOT ${slot} SELECTED`);
    setLoading(true);
    setTimeout(() => setDisplayText('DISPENSING... ▼▼▼'), 600);
    try {
      await quickDemoLogin(role);
      setDisplayText(`ENJOY YOUR ACCESS! ★`);
      showToast(`${role === 'ADMIN' ? '🛡️ Admin' : '👤 Member'} access granted!`, 'success');
    } catch (err: any) {
      setDisplayText('ERROR — TRY AGAIN');
      showToast(err.message || 'Quick login failed', 'error');
      setTimeout(() => { setMode('idle'); setSelectedSlot(''); }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background ambient grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main Vending Machine */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Machine Top Cap */}
        <div className="h-5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 rounded-t-3xl border-t-4 border-x-4 border-amber-400/60 shadow-lg" />

        {/* Machine Body */}
        <div className="bg-gradient-to-b from-stone-800 to-stone-900 border-x-4 border-amber-600/60 shadow-2xl px-4 pb-4 space-y-3">

          {/* Brand Header on Machine */}
          <div className="text-center pt-3 pb-1">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-400/80">
              BIPOLAR FACTORY
            </div>
            <div className="text-xl font-black text-amber-400 tracking-tight mt-0.5">
              Snack<span className="text-white">Overflow</span>
            </div>
            <div className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
              Office Pantry Vending System v1.0
            </div>
          </div>

          {/* LED Display Screen */}
          <div
            className="rounded-xl border-2 border-amber-500/40 bg-stone-950 px-4 py-3 font-mono shadow-inner"
            style={{ boxShadow: 'inset 0 0 20px rgba(16,185,129,0.08), 0 0 10px rgba(251,191,36,0.1)' }}
          >
            <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
              ► DISPLAY
            </div>
            <div className="text-emerald-400 text-xs font-black tracking-wider leading-5 min-h-[20px] transition-all duration-300">
              {displayText}
              <span className={`ml-0.5 ${blink ? 'opacity-100' : 'opacity-0'} transition-opacity`}>█</span>
            </div>
            {selectedSlot && (
              <div className="text-[10px] text-emerald-600 mt-1 font-mono">
                SLOT: {selectedSlot} | USER: {dispensingRole}
              </div>
            )}
          </div>

          {/* Glass Snack Display */}
          <div
            className="rounded-xl border-2 border-stone-600/80 bg-gradient-to-b from-stone-700/40 to-stone-900/80 p-3 relative overflow-hidden"
            style={{ boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.6), inset 0 0 40px rgba(251,191,36,0.03)' }}
          >
            {/* Glass shine effect */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white/10 to-transparent rounded-t-xl pointer-events-none" />
            <div className="absolute top-0 left-3 bottom-0 w-3 bg-gradient-to-r from-white/8 to-transparent pointer-events-none" />

            <div className="grid grid-cols-3 gap-2">
              {VENDING_ITEMS.map((item) => (
                <div
                  key={item.slot}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                    selectedSlot === item.slot
                      ? 'bg-amber-500/30 border border-amber-500/70 scale-95'
                      : 'bg-stone-800/60 border border-stone-700/50'
                  }`}
                >
                  <div className="text-xl leading-none">{item.emoji}</div>
                  <div className="text-[8px] font-bold text-stone-400 mt-1 text-center leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[7px] text-amber-600/70 font-mono font-black mt-0.5">
                    {item.slot}
                  </div>
                </div>
              ))}
            </div>

            {/* Dispense tray slot at bottom */}
            <div className="mt-3 h-1.5 bg-stone-900 rounded-full border border-stone-600/60 shadow-inner" />
          </div>

          {/* Quick Access Panel — the "keypad" for demo roles */}
          <div className="rounded-xl border border-stone-600/70 bg-stone-800/60 p-3 space-y-2">
            <div className="text-[9px] font-black text-stone-500 uppercase tracking-widest text-center">
              ◈ QUICK ACCESS PANEL ◈
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Admin Access */}
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN', 'A1')}
                disabled={loading}
                className="group flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-900 border-2 border-purple-500/50 hover:border-purple-400 hover:bg-purple-950/40 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div className="font-mono text-[9px] font-black text-purple-400 uppercase tracking-widest">
                  [A1] ADMIN
                </div>
                <div className="text-[8px] text-stone-500">Pantry Manager</div>
              </button>

              {/* Member Access */}
              <button
                type="button"
                onClick={() => handleQuickDemo('MEMBER', 'B2')}
                disabled={loading}
                className="group flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-900 border-2 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/40 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-900/60 border border-amber-500/50 flex items-center justify-center">
                  <User className="w-4 h-4 text-amber-400" />
                </div>
                <div className="font-mono text-[9px] font-black text-amber-400 uppercase tracking-widest">
                  [B2] MEMBER
                </div>
                <div className="text-[8px] text-stone-500">Grab & Vote</div>
              </button>
            </div>
          </div>

          {/* Divider with OR */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-stone-700" />
            <span className="text-[9px] font-bold text-stone-600 uppercase tracking-widest px-1">
              or enter credentials
            </span>
            <div className="flex-1 h-px bg-stone-700" />
          </div>

          {/* Card-reader style login form */}
          <div
            className="rounded-xl border border-stone-600/70 bg-stone-800/60 p-3 space-y-2.5 cursor-text"
            onClick={() => { if (mode === 'idle') setMode('keypad'); }}
          >
            <div className="text-[9px] font-black text-stone-500 uppercase tracking-widest text-center">
              ▤ CARD READER / KEYPAD INPUT ▤
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onClick={() => setMode('keypad')}
                  placeholder="user@company.local"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-stone-950 border border-stone-600/60 text-emerald-400 text-xs font-mono placeholder:text-stone-700 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-stone-950 border border-stone-600/60 text-emerald-400 text-xs font-mono placeholder:text-stone-700 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-xs font-black text-white uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/40"
              >
                {loading ? (
                  <span className="animate-pulse">PROCESSING...</span>
                ) : (
                  <>
                    <span>CONFIRM & ENTER</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Machine Bottom */}
        <div className="h-4 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 rounded-b-3xl border-b-4 border-x-4 border-amber-400/60 shadow-lg" />

        {/* Floor shadow */}
        <div className="mx-6 h-3 bg-black/50 rounded-full blur-md mt-1" />

        {/* Footer credits */}
        <p className="text-center text-[9px] font-mono text-stone-600 mt-3 tracking-widest uppercase">
          Snack Overflow © 2026 &bull; React + Express + PostgreSQL
        </p>
      </div>
    </div>
  );
};
