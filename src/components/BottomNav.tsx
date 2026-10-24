import React, { useState } from 'react';
import { UserProfile } from '@/types';
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  ArrowDownToLine,
  Menu,
  Receipt,
  Users,
  FileSpreadsheet,
  Scale,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'billing'
  | 'inventory'
  | 'stock-in'
  | 'bills'
  | 'customers'
  | 'reports'
  | 'reconciliation'
  | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: UserProfile;
  onOpenAiBilling: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenAiBilling,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabClick = (tab: TabType) => {
    onSelectTab(tab);
    setDrawerOpen(false);
  };

  const moreItems: Array<{ tab: TabType; label: string; icon: any; ownerOnly?: boolean; condition?: boolean }> = [
    { tab: 'bills', label: 'Bills & Invoices', icon: Receipt },
    { tab: 'customers', label: 'Customers', icon: Users },
    { tab: 'reports', label: 'Stock Ledger & Reports', icon: FileSpreadsheet },
    {
      tab: 'reconciliation',
      label: 'Stock Audit & Returns',
      icon: Scale,
      condition: user.role === 'owner',
    },
    {
      tab: 'settings',
      label: 'Shop Settings',
      icon: Settings,
      ownerOnly: true,
      condition: user.role === 'owner',
    },
  ];

  return (
    <>
      {/* More Drawer Sheet (Mobile Drawer) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div
            className="fixed inset-0"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-full bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl max-w-md mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-200">More Shop Modules</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              {/* Quick AI Bill */}
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenAiBilling();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-500/30 text-left hover:border-violet-400 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-violet-200">AI Bill Generator</div>
                  <div className="text-[10px] text-violet-400">Voice / Text Prompt</div>
                </div>
              </button>

              {moreItems
                .filter((item) => item.condition === undefined || item.condition === true)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleTabClick(item.tab)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-emerald-500 text-white' : 'bg-slate-700/60 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-medium">{item.label}</div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 relative bg-slate-950/95 backdrop-blur border-t border-slate-800 pb-safe">
      <div className="seam absolute top-0 left-0 right-0 opacity-60" />
        <div className="max-w-md mx-auto px-2 py-1 flex items-center justify-around">
          {/* Dashboard */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition active:scale-95 ${
              currentTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Home</span>
          </button>

          {/* Inventory */}
          <button
import { UserProfile } from '@/types';
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  ArrowDownToLine,
  Menu,
  Receipt,
  Users,
  FileSpreadsheet,
  Scale,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'billing'
  | 'inventory'
  | 'stock-in'
  | 'bills'
  | 'customers'
  | 'reports'
  | 'reconciliation'
  | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: UserProfile;
  onOpenAiBilling: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenAiBilling,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabClick = (tab: TabType) => {
    onSelectTab(tab);
    setDrawerOpen(false);
  };

  const moreItems: Array<{ tab: TabType; label: string; icon: any; ownerOnly?: boolean; condition?: boolean }> = [
    { tab: 'bills', label: 'Bills & Invoices', icon: Receipt },
    { tab: 'customers', label: 'Customers', icon: Users },
    { tab: 'reports', label: 'Stock Ledger & Reports', icon: FileSpreadsheet },
    {
      tab: 'reconciliation',
      label: 'Stock Audit & Returns',
      icon: Scale,
      condition: user.role === 'owner',
    },
    {
      tab: 'settings',
      label: 'Shop Settings',
      icon: Settings,
      ownerOnly: true,
      condition: user.role === 'owner',
    },
  ];

  return (
    <>
      {/* More Drawer Sheet (Mobile Drawer) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div
            className="fixed inset-0"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-full bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl max-w-md mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-200">More Shop Modules</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              {/* Quick AI Bill */}
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenAiBilling();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-500/30 text-left hover:border-violet-400 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-violet-200">AI Bill Generator</div>
                  <div className="text-[10px] text-violet-400">Voice / Text Prompt</div>
                </div>
              </button>

              {moreItems
                .filter((item) => item.condition === undefined || item.condition === true)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleTabClick(item.tab)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-emerald-500 text-white' : 'bg-slate-700/60 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-medium">{item.label}</div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 relative bg-slate-950/95 backdrop-blur border-t border-slate-800 pb-safe">
      <div className="seam absolute top-0 left-0 right-0 opacity-60" />
        <div className="max-w-md mx-auto px-2 py-1 flex items-center justify-around">
          {/* Dashboard */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition active:scale-95 ${
              currentTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Home</span>
          </button>

          {/* Inventory */}
          <button
            onClick={() => handleTabClick('inventory')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition active:scale-95 ${
              currentTab === 'inventory' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Stock</span>
          </button>

          {/* New Bill (Prominent Floating Button) */}
          <button
            onClick={() => handleTabClick('billing')}
            className="flex flex-col items-center -mt-5 group"
          >
            <div className="w-13 h-13 p-3 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/40 ring-4 ring-slate-900 flex items-center justify-center transition transform active:scale-90 group-hover:brightness-110">
              <PlusCircle className="w-7 h-7 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-1">New Bill</span>
          </button>

          {/* Stock In / Purchase */}
          {(user.role === 'owner' || user.can_receive_stock) && (
            <button
              onClick={() => handleTabClick('stock-in')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition active:scale-95 ${
                currentTab === 'stock-in' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">Stock In</span>
            </button>
          )}

          {/* More Menu */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition active:scale-95 ${
              drawerOpen || ['bills', 'customers', 'reports', 'reconciliation', 'settings'].includes(currentTab)
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
