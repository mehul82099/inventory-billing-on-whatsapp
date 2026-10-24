'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, Shop, Product, Category, Supplier, Customer, Invoice } from '@/types';
import { ParsedAiBill } from '@/lib/ai-parser';
import { Navbar } from '@/components/Navbar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { DashboardView } from '@/components/DashboardView';
import { BillingView } from '@/components/BillingView';
import { InventoryView } from '@/components/InventoryView';
import { StockInView } from '@/components/StockInView';
import { LedgerView } from '@/components/LedgerView';
import { CustomersView } from '@/components/CustomersView';
import { ReconciliationView } from '@/components/ReconciliationView';
import { SettingsView } from '@/components/SettingsView';
import { LoginView } from '@/components/LoginView';
import { AiBillingModal } from '@/components/AiBillingModal';
import { InvoiceModal } from '@/components/InvoiceModal';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { apiFetch } from '@/lib/api';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isOnline, setIsOnline] = useState(true);

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Monitor Network Status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Restore session: Supabase Auth in backend mode, localStorage in demo mode
    const supabaseClient = getSupabaseBrowser();
    if (supabaseClient) {
      supabaseClient.auth.getSession().then(async ({ data }) => {
        if (!data.session) return;
        try {
          let res = await apiFetch('/api/auth/session');
          if (res.status === 401) {
            // Stored token may be stale: force one refresh and retry once.
            await supabaseClient.auth.refreshSession();
            res = await apiFetch('/api/auth/session');
          }
          if (res.ok) {
            const d = await res.json();
            setUser(d.user);
            setShop(d.shop);
          } else if (res.status === 401) {
            // Refresh could not recover the session: clear it so the next
            // load starts from a clean sign-in.
            await supabaseClient.auth.signOut();
          }
        } catch (e) {
          console.error(e);
        }
      });
    } else {
      try {
        const savedUser = localStorage.getItem('mb_user');
        const savedShop = localStorage.getItem('mb_shop');
        if (savedUser && savedShop) {
          setUser(JSON.parse(savedUser));
          setShop(JSON.parse(savedShop));
        }
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch shop catalog & data
  const fetchData = async () => {
    try {
      const [prodRes, custRes, settingsRes] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/customers'),
        apiFetch('/api/settings'),
      ]);

      const prodData = await prodRes.json();
      const custData = await custRes.json();
      const settingsData = await settingsRes.json();

      if (prodRes.ok) {
        setProducts(prodData.products || []);
        setCategories(prodData.categories || []);
        setSuppliers(prodData.suppliers || []);
      }
      if (custRes.ok) {
        setCustomers(custData.customers || []);
      }
      if (settingsRes.ok) {
        if (settingsData.shop) setShop(settingsData.shop);
        if (settingsData.users) setUsers(settingsData.users);
      }
    } catch (e) {
      console.error('Error fetching core shop data:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser: UserProfile, currentShop: Shop) => {
    setUser(loggedInUser);
    setShop(currentShop);
    try {
      localStorage.setItem('mb_user', JSON.stringify(loggedInUser));
      localStorage.setItem('mb_shop', JSON.stringify(currentShop));
    } catch (e) {}
  };

  const handleLogout = () => {
    setUser(null);
    const supabaseClient = getSupabaseBrowser();
    if (supabaseClient) supabaseClient.auth.signOut();
    try {
      localStorage.removeItem('mb_user');
      localStorage.removeItem('mb_shop');
      // NB: pending_bill:* recovery records are intentionally kept - they are
      // scoped to user+shop and are the only way to recover an uncertain
      // outcome after signing back in. Cross-account replay is blocked by
      // the scope check in BillingView.
    } catch (e) {}
  };

  // If AI bill parsed, load into cart and switch to billing tab
  const handleApplyAiBill = (parsed: ParsedAiBill) => {
    setCurrentTab('billing');
  };

  const handleInvoiceCreated = (invoice: Invoice) => {
    setActiveInvoice(invoice);
    fetchData(); // Refresh current stocks
  };

  // Not logged in -> Show Login
  if (!user || !shop) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="bg-amber-500 text-slate-950 text-center text-[11px] font-bold py-1.5 px-3">
          DEMO MODE - data is temporary and resets automatically. Do not enter real business data.
        </div>
      )}

      {/* PWA Install Banner */}
      <PwaInstallPrompt />

      {/* Top Mobile Navbar */}
      <Navbar
        user={user}
        shop={shop}
        onOpenAiBilling={() => setAiModalOpen(true)}
        onLogout={handleLogout}
        isOnline={isOnline}
      />

      {/* Main Tab Screen Area */}
      <main className="flex-1 overflow-x-hidden">
        {currentTab === 'dashboard' && (
          <DashboardView
            user={user}
            shop={shop}
            onNavigateToBilling={() => setCurrentTab('billing')}
            onNavigateToStockIn={() => setCurrentTab('stock-in')}
            onNavigateToInventory={() => setCurrentTab('inventory')}
            onOpenInvoice={(inv) => setActiveInvoice(inv)}
            onOpenAiBilling={() => setAiModalOpen(true)}
          />
        )}

        {currentTab === 'billing' && (
          <BillingView
            products={products}
            customers={customers}
            user={user}
            shop={shop}
            onInvoiceCreated={handleInvoiceCreated}
            onOpenAiBilling={() => setAiModalOpen(true)}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            products={products}
            categories={categories}
            suppliers={suppliers}
            user={user}
            onRefresh={fetchData}
          />
        )}

        {currentTab === 'stock-in' && (
          <StockInView
            products={products}
            suppliers={suppliers}
            user={user}
            onStockReceived={fetchData}
          />
        )}

        {(currentTab === 'bills' || currentTab === 'customers') && (
          <CustomersView
            user={user}
            shop={shop}
            onOpenInvoice={(inv) => setActiveInvoice(inv)}
          />
        )}

        {currentTab === 'reports' && (
          <LedgerView user={user} shop={shop} />
        )}

        {currentTab === 'reconciliation' && (
          <ReconciliationView
            products={products}
            user={user}
            onRefresh={fetchData}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            shop={shop}
            users={users}
            currentUser={user}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Bottom Fixed Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        user={user}
        onOpenAiBilling={() => setAiModalOpen(true)}
      />

      {/* AI Voice & Text Prompt Billing Modal */}
      {aiModalOpen && (
        <AiBillingModal
          catalog={products}
          onClose={() => setAiModalOpen(false)}
          onApplyParsedBill={handleApplyAiBill}
        />
      )}

      {/* Invoice Preview & WhatsApp Share Modal */}
      {activeInvoice && (
        <InvoiceModal
          invoice={activeInvoice}
          shop={shop}
          onClose={() => setActiveInvoice(null)}
        />
      )}
    </div>
  );
}
