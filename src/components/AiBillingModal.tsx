import React, { useState } from 'react';
import { Product } from '@/types';
import { ParsedAiBill, ParsedBillItem } from '@/lib/ai-parser';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface AiBillingModalProps {
  catalog: Product[];
  onClose: () => void;
  onApplyParsedBill: (parsed: ParsedAiBill) => void;
}

const SAMPLE_PROMPTS = [
  'Create a bill for Rahul 9876543210: two Type-C cables at ₹120 each, one phone cover at ₹250, and one tempered glass at ₹150. Apply a ₹50 discount. Payment by UPI.',
  'Bill for Priya: 1 Airdopes 141 earbuds at 1199 and 1 fast charger 25W. Cash payment.',
  'OnePlus Z2 neckband 1 piece and 2 screen guards for Redmi Note 13. Discount 100. GPay payment.',
];

export const AiBillingModal: React.FC<AiBillingModalProps> = ({
  catalog,
  onClose,
  onApplyParsedBill,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedAiBill | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Web Speech API for voice dictation on Android phone
  const toggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please type your prompt.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setPrompt((prev) => (prev ? `${prev} ${text}` : text));
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse AI bill');
      setParsedResult(data.parsedBill);
    } catch (err: any) {
      setError(err.message || 'Error parsing bill');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onApplyParsedBill(parsedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-violet-600/20 text-violet-400">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Bill Assistant</h2>
              <p className="text-xs text-slate-400">Speak or type your bill in plain words</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Prompt Input Box */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a bill for Rahul: 2 Type-C boAt cables at 140, 1 iPhone 15 tempered glass. 50 discount, UPI payment."
              rows={3}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 pr-20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
            <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-red-500 text-paper animate-bounce'
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Voice Input (Speech to text)"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={loading || !prompt.trim()}
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-paper transition disabled:opacity-50 active:scale-95 shadow-md shadow-violet-600/30"
                title="Process with AI"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          {!parsedResult && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Try Sample Prompts:
              </span>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(sample);
                    }}
                    className="text-left text-xs text-slate-300 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="space-y-3 pt-2 border-t border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> AI Extracted Bill Structure
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/50">
                  {parsedResult.parsingMethod}
                </span>
              </div>

              {/* Customer & Payment Meta */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer:</span>
                  <span className="font-semibold text-slate-200">
                    {parsedResult.customerName || 'Walk-in'} {parsedResult.customerPhone ? `(${parsedResult.customerPhone})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Mode:</span>
                  <span className="font-bold text-emerald-400">{parsedResult.paymentMethod}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-300">Line Items Matched:</span>
                {parsedResult.items.map((item, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs ${
                      !item.matchedProduct
                        ? 'bg-amber-950/20 border-amber-800/60'
                        : item.stockAvailable < item.quantity
                        ? 'bg-red-950/20 border-red-800/60'
                        : 'bg-slate-800/40 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate">
                          {item.matchedProduct ? item.matchedProduct.name : item.rawText}
                        </div>
                        {item.matchedProduct && (
                          <div className="text-[11px] text-slate-400">
                            {item.matchedProduct.brand} • Available: {item.stockAvailable} units
                          </div>
                        )}
                        {item.isAmbiguous && (
                          <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                            <HelpCircle className="w-3 h-3" /> Similar models exist in catalog
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-100">
                          {item.quantity} × ₹{item.extractedPrice || item.catalogPrice}
                        </span>
                        <div className="text-xs font-extrabold text-emerald-400">
                          ₹{item.lineTotal}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Deterministic Totals */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>₹{parsedResult.subtotal}</span>
                </div>
                {parsedResult.discountAmount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount:</span>
                    <span>- ₹{parsedResult.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">₹{parsedResult.grandTotal}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {parsedResult && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <button
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95"
            >
              <span>Load into Cart & Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
