import React, { useState } from 'react';
import { Shop, UserProfile } from '@/types';
import {
  Settings,
  Shield,
  Save,
  Download,
  Upload,
  Building,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Lock,
} from 'lucide-react';

interface SettingsViewProps {
  shop: Shop;
  users: UserProfile[];
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  shop,
  users,
  currentUser,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<Shop>({ ...shop });
  const [savingShop, setSavingShop] = useState(false);
  const [shopSuccess, setShopSuccess] = useState(false);

  // Employee permissions state
  const employee = users.find((u) => u.role === 'employee');
  const [empPerms, setEmpPerms] = useState({
    can_receive_stock: employee?.can_receive_stock ?? true,
    can_apply_custom_discount: employee?.can_apply_custom_discount ?? false,
    can_cancel_bills: employee?.can_cancel_bills ?? false,
    can_view_purchase_cost: employee?.can_view_purchase_cost ?? false,
  });
  const [savingPerms, setSavingPerms] = useState(false);
  const [permsSuccess, setPermsSuccess] = useState(false);

  // Backup / Restore
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    setShopSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: formData }),
      });
      if (res.ok) {
        setShopSuccess(true);
        setTimeout(() => setShopSuccess(false), 3000);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingShop(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!employee) return;
    setSavingPerms(true);
    setPermsSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: employee.id,
          permissions: empPerms,
        }),
      });
      if (res.ok) {
        setPermsSuccess(true);
        setTimeout(() => setPermsSuccess(false), 3000);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        setRestoreMessage('Database successfully restored from backup file!');
        setTimeout(() => setRestoreMessage(null), 4000);
        onRefresh();
      } else {
        alert('Invalid backup file structure');
      }
    } catch (err) {
      alert('Failed to parse backup file');
    }
  };

  return (
    <div className="pb-28 max-w-2xl mx-auto px-3 py-3 space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <Settings className="w-5 h-5 text-emerald-400" /> Shop Settings & Administration
        </h2>
        <p className="text-xs text-slate-400">Branding, GST, UPI, employee access & data backup</p>
      </div>

      {/* Shop Profile Form */}
      <form onSubmit={handleShopSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-400" /> Shop Details & Invoicing Header
          </h3>
          {shopSuccess && (
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <CheckCircle className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Shop Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Tagline</label>
          <input
            type="text"
            value={formData.tagline || ''}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-400 mb-1">Contact Phone</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">City & State</label>
            <input
              type="text"
              value={`${formData.city}, ${formData.state}`}
              onChange={(e) => {
                const parts = e.target.value.split(',');
                setFormData({ ...formData, city: parts[0]?.trim() || '', state: parts[1]?.trim() || '' });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Full Shop Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-400 mb-1">GSTIN (Optional)</label>
            <input
              type="text"
              placeholder="33AAAAA0000A1Z5"
              value={formData.gstin || ''}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">UPI ID (For QR on Bills)</label>
            <input
              type="text"
              placeholder="shopname@okaxis"
              value={formData.upi_id || ''}
              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Terms & Return Policy (on Invoices)</label>
          <input
            type="text"
            value={formData.terms_and_conditions || ''}
            onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingShop}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition disabled:opacity-50"
          >
            {savingShop ? 'Saving...' : 'Save Shop Profile'}
          </button>
        </div>
      </form>

      {/* Employee Permissions Card (Owner Only) */}
      {currentUser.role === 'owner' && employee && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" /> Employee Permissions: {employee.full_name}
              </h3>
              <p className="text-[11px] text-slate-400">Login: {employee.email}</p>
            </div>
            {permsSuccess && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle className="w-3.5 h-3.5" /> Updated
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">Receive Stock & Enter Purchases</div>
                <div className="text-[10px] text-slate-400">Can record goods received from suppliers</div>
              </div>
              <input
                type="checkbox"
                checked={empPerms.can_receive_stock}
                onChange={(e) => setEmpPerms({ ...empPerms, can_receive_stock: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">Apply Custom Discounts</div>
                <div className="text-[10px] text-slate-400">Can give extra price cuts beyond catalog</div>
              </div>
              <input
                type="checkbox"
                checked={empPerms.can_apply_custom_discount}
                onChange={(e) =>
                  setEmpPerms({ ...empPerms, can_apply_custom_discount: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">Cancel & Void Finalized Bills</div>
                <div className="text-[10px] text-slate-400">Can restock and cancel saved customer bills</div>
              </div>
              <input
                type="checkbox"
                checked={empPerms.can_cancel_bills}
                onChange={(e) => setEmpPerms({ ...empPerms, can_cancel_bills: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">View Purchase Cost & Valuation</div>
                <div className="text-[10px] text-slate-400">Can see wholesale buy prices and margins</div>
              </div>
              <input
                type="checkbox"
                checked={empPerms.can_view_purchase_cost}
                onChange={(e) =>
                  setEmpPerms({ ...empPerms, can_view_purchase_cost: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={savingPerms}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-paper font-bold transition disabled:opacity-50"
            >
              {savingPerms ? 'Saving Permissions...' : 'Update Employee Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* Database Backup & Restore */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-800">
          <Download className="w-4 h-4 text-emerald-400" /> Data Backup & Offline Export
        </h3>

        {restoreMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300">
            {restoreMessage}
          </div>
        )}

        <p className="text-slate-400 leading-relaxed">
          Download a complete, offline JSON snapshot of all products, stock movements, purchases, invoices, and customer balances. You can restore this file anytime.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Backup</span>
          </button>

          <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition active:scale-95 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Restore Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
