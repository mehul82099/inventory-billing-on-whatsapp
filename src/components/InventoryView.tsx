import React, { useState, useMemo } from 'react';
import { Product, Category, Supplier, UserProfile } from '@/types';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Check,
  Package,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  user: UserProfile;
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  suppliers,
  user,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [parsedCsvItems, setParsedCsvItems] = useState<any[]>([]);
  const [preserveStock, setPreserveStock] = useState(true);
  const [importing, setImporting] = useState(false);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.category_name === selectedCategory;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.compatible_models && p.compatible_models.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));

      const matchesStock =
        stockStatusFilter === 'all' ||
        (stockStatusFilter === 'out' && p.current_quantity <= 0) ||
        (stockStatusFilter === 'low' &&
          p.current_quantity > 0 &&
          p.current_quantity <= p.min_stock_level);

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [products, selectedCategory, searchQuery, stockStatusFilter]);

  const openAddModal = () => {
    setEditingProduct({
      name: '',
      brand: '',
      compatible_models: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: '',
      purchase_cost: 0,
      selling_price: 0,
      current_quantity: 0,
      min_stock_level: 5,
      category_name: categories[0]?.name || 'Accessories',
      category_id: categories[0]?.id,
      is_active: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct({ ...prod });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct.selling_price === undefined) {
      setFormError('Product name and selling price are required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/products', {
        method: editingProduct.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      setIsModalOpen(false);
      setEditingProduct(null);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // CSV Import Parsing
  const handleParseCsv = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const items: any[] = [];

    // Simple CSV parser supporting header
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 3 && cols[0]) {
        items.push({
          name: cols[0],
          brand: cols[1] || 'Generic',
          category_name: cols[2] || 'Accessories',
          compatible_models: cols[3] || '',
          selling_price: parseFloat(cols[4]) || 0,
          purchase_cost: parseFloat(cols[5]) || 0,
          current_quantity: parseInt(cols[6], 10) || 0,
          min_stock_level: parseInt(cols[7], 10) || 5,
        });
      }
    }
    setParsedCsvItems(items);
  };

  const handleExecuteImport = async () => {
    if (parsedCsvItems.length === 0) return;
    setImporting(true);

    try {
      for (const item of parsedCsvItems) {
        // Find existing match by name
        const existing = products.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
        const payload = {
          ...item,
          id: existing?.id,
          // If preserveStock is true and item exists, keep existing quantity
          current_quantity: preserveStock && existing ? existing.current_quantity : item.current_quantity,
        };

        await fetch('/api/products', {
          method: existing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setCsvModalOpen(false);
      setParsedCsvItems([]);
      setCsvText('');
      onRefresh();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="pb-28 max-w-7xl mx-auto px-3 py-3 space-y-3">
      {/* Top Bar with Add and Import */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <Package className="w-5 h-5 text-emerald-400" /> Catalog & Stock
          </h2>
          <p className="text-xs text-slate-400">{products.length} products total</p>
        </div>

        <div className="flex items-center gap-2">
          {user.role === 'owner' && (
            <button
              onClick={() => setCsvModalOpen(true)}
              className="flex items-center gap-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Import CSV"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search product, model, brand, SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
        />
      </div>

      {/* Category Chips & Stock Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition shrink-0 ${
                selectedCategory === c.name
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Stock Status Pills */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              stockStatusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              stockStatusFilter === 'low' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              stockStatusFilter === 'out' ? 'bg-red-950 text-red-300 border border-red-800' : 'text-slate-400 hover:text-red-300'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Product List Cards */}
      <div className="space-y-2">
        {filteredProducts.map((p) => {
          const isOut = p.current_quantity <= 0;
          const isLow = p.current_quantity > 0 && p.current_quantity <= p.min_stock_level;

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {p.brand}
                  </span>
                  <span className="text-[10px] text-slate-500">• {p.category_name}</span>
                </div>

                <h3 className="text-xs font-bold text-white truncate mt-0.5">{p.name}</h3>

                {p.compatible_models && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    📱 {p.compatible_models}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="font-extrabold text-emerald-400">
                    Selling: ₹{p.selling_price}
                  </span>
                  {user.role === 'owner' && (
                    <span className="text-slate-400 text-[11px]">
                      Cost: ₹{p.purchase_cost}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Stock Badge & Edit Button */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isOut
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : isLow
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {p.current_quantity} in stock
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                    title="Edit Product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {user.role === 'owner' && (
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition"
                      title="Deactivate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            No products match the selected filters.
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl my-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11D Tempered Glass iPhone 15"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. boAt, Spigen"
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={editingProduct.category_name || ''}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.name === e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        category_name: e.target.value,
                        category_id: cat?.id,
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Compatible Phone Models</label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 15, 15 Pro, Samsung S24"
                  value={editingProduct.compatible_models || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, compatible_models: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="199"
                    value={editingProduct.selling_price ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, selling_price: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="35"
                    disabled={user.role !== 'owner'}
                    value={editingProduct.purchase_cost ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, purchase_cost: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="25"
                    value={editingProduct.current_quantity ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, current_quantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="5"
                    value={editingProduct.min_stock_level ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, min_stock_level: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {formError && <p className="text-red-400 text-xs">{formError}</p>}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl my-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Import Products from CSV
              </h3>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Paste CSV data with columns: <br />
                <code className="text-emerald-400">
                  name,brand,category,models,selling_price,cost_price,quantity,min_stock
                </code>
              </p>

              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,brand,category,models,selling_price,cost_price,quantity,min_stock&#10;iPhone 15 Case,SlimFit,Mobile Covers,iPhone 15,299,90,15,5"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={preserveStock}
                    onChange={(e) => setPreserveStock(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span>Preserve existing stock quantities for existing items</span>
                </label>

                <button
                  type="button"
                  onClick={handleParseCsv}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  Preview ({parsedCsvItems.length})
                </button>
              </div>

              {parsedCsvItems.length > 0 && (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl p-2 bg-slate-950">
                  {parsedCsvItems.map((item, i) => (
                    <div key={i} className="py-1 text-[11px] flex justify-between">
                      <span className="text-slate-200 font-medium truncate max-w-[200px]">
                        {item.name}
                      </span>
                      <span className="text-emerald-400">₹{item.selling_price}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || parsedCsvItems.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${parsedCsvItems.length} Products`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
