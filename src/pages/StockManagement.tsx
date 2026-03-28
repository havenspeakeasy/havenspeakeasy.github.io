import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStockItems, addStockItem, updateStockItem, deleteStockItem,
  seedDefaultStock, STOCK_CATEGORIES, type StockItem,
} from "@/lib/stockStore";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import {
  Package, Plus, X, AlertTriangle, CheckCircle2,
  Minus, Search, Edit2, Trash2, RefreshCw,
} from "lucide-react";

type FilterCat = "All" | typeof STOCK_CATEGORIES[number];

interface FormState {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  notes: string;
}

function emptyForm(): FormState {
  return { name: "", category: "Beer", quantity: "0", unit: "bottles", lowStockThreshold: "5", notes: "" };
}

export default function StockManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["stock-items"],
    queryFn: getStockItems,
  });

  const [filterCat, setFilterCat] = useState<FilterCat>("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [seeding, setSeeding] = useState(false);

  const filtered = items
    .filter(i => filterCat === "All" || i.category === filterCat)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const lowStock = items.filter(i => i.quantity <= i.lowStockThreshold);
  const totalItems = items.length;
  const okItems = items.filter(i => i.quantity > i.lowStockThreshold).length;

  const openAdd = () => { setForm(emptyForm()); setEditing(null); setModal("add"); };
  const openEdit = (item: StockItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      lowStockThreshold: String(item.lowStockThreshold),
      notes: item.notes,
    });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error("Name and category are required.");
      return;
    }
    const qty = parseInt(form.quantity, 10);
    const threshold = parseInt(form.lowStockThreshold, 10);
    if (isNaN(qty) || isNaN(threshold)) {
      toast.error("Quantity and threshold must be numbers.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantity: Math.max(0, qty),
      unit: form.unit.trim() || "bottles",
      lowStockThreshold: Math.max(0, threshold),
      lastUpdatedBy: user?.name ?? "Manager",
      notes: form.notes.trim(),
    };
    if (modal === "edit" && editing) {
      await updateStockItem(editing.id, payload, user?.name ?? "Manager");
      toast.success("Item updated.");
    } else {
      await addStockItem(payload);
      toast.success("Item added to inventory.");
    }
    qc.invalidateQueries({ queryKey: ["stock-items"] });
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    await deleteStockItem(id);
    toast.success("Item removed.");
    qc.invalidateQueries({ queryKey: ["stock-items"] });
  };

  const handleAdjust = async (item: StockItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    await updateStockItem(item.id, { quantity: newQty }, user?.name ?? "Manager");
    qc.invalidateQueries({ queryKey: ["stock-items"] });
    setAdjustId(null);
  };

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    await seedDefaultStock(user.name);
    qc.invalidateQueries({ queryKey: ["stock-items"] });
    toast.success("Default inventory loaded.");
    setSeeding(false);
  };

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Stock Management</h1>
            <p className="page-subtitle">Monitor and update bar inventory levels</p>
          </div>
          <div className="flex items-center gap-2">
            {items.length === 0 && (
              <button className="haven-btn-ghost" onClick={handleSeed} disabled={seeding}>
                <RefreshCw size={15} /> {seeding ? "Loading..." : "Load Default Stock"}
              </button>
            )}
            <button className="haven-btn-primary" onClick={openAdd}>
              <Plus size={15} /> Add Item
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mini-stats-row mb-6">
          <div className="mini-stat">
            <Package size={16} className="mini-stat-icon blue" />
            <div>
              <p className="mini-stat-label">Total Items</p>
              <p className="mini-stat-val">{totalItems}</p>
            </div>
          </div>
          <div className="mini-stat">
            <CheckCircle2 size={16} className="mini-stat-icon green" />
            <div>
              <p className="mini-stat-label">Well Stocked</p>
              <p className="mini-stat-val">{okItems}</p>
            </div>
          </div>
          <div className="mini-stat">
            <AlertTriangle size={16} className="mini-stat-icon amber" />
            <div>
              <p className="mini-stat-label">Low Stock</p>
              <p className="mini-stat-val">{lowStock.length}</p>
            </div>
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div className="stock-alert-banner">
            <AlertTriangle size={15} />
            <span>
              <strong>{lowStock.length} item{lowStock.length !== 1 ? "s" : ""}</strong> running low:{" "}
              {lowStock.slice(0, 4).map(i => i.name).join(", ")}
              {lowStock.length > 4 ? ` +${lowStock.length - 4} more` : ""}
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="filters-row mb-4">
          <div className="filter-tabs">
            {(["All", ...STOCK_CATEGORIES] as FilterCat[]).map(cat => (
              <button
                key={cat}
                className={`filter-tab ${filterCat === cat ? "filter-tab-active" : ""}`}
                onClick={() => setFilterCat(cat)}
              >
                {cat}
                {cat !== "All" && (
                  <span className="filter-badge-neutral">
                    {items.filter(i => i.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="stock-search-wrap">
            <Search size={14} className="stock-search-icon" />
            <input
              className="stock-search-input"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Inventory Grid */}
        {isLoading ? (
          <div className="loading-state">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="stock-empty">
            <Package size={36} style={{ color: "var(--cream-muted)", opacity: 0.3 }} />
            <p>No items found.</p>
            {items.length === 0 && (
              <p className="stock-empty-sub">Click "Load Default Stock" to seed the bar inventory, or add items manually.</p>
            )}
          </div>
        ) : (
          <div className="stock-grid">
            {filtered.map(item => {
              const isLow = item.quantity <= item.lowStockThreshold;
              const isAdjusting = adjustId === item.id;
              return (
                <div key={item.id} className={`stock-card ${isLow ? "stock-card-low" : ""}`}>
                  <div className="stock-card-header">
                    <div>
                      <p className="stock-item-name">{item.name}</p>
                      <span className="stock-cat-badge">{item.category}</span>
                    </div>
                    <div className="stock-card-actions">
                      <button className="icon-btn-sm" onClick={() => openEdit(item)} title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button className="icon-btn-sm icon-btn-danger" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="stock-qty-row">
                    <div className="stock-qty-display">
                      <span className={`stock-qty-number ${isLow ? "stock-qty-low" : ""}`}>
                        {item.quantity}
                      </span>
                      <span className="stock-qty-unit">{item.unit}</span>
                      {isLow && <AlertTriangle size={13} className="stock-low-icon" />}
                    </div>
                    <div className="stock-adjust-btns">
                      <button className="stock-adj-btn" onClick={() => handleAdjust(item, -1)} title="Remove 1">
                        <Minus size={12} />
                      </button>
                      {isAdjusting ? (
                        <input
                          className="stock-adj-input"
                          type="number"
                          value={adjustDelta}
                          onChange={e => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                          onBlur={() => { handleAdjust(item, adjustDelta); setAdjustDelta(0); }}
                          autoFocus
                        />
                      ) : (
                        <button className="stock-adj-custom" onClick={() => { setAdjustId(item.id); setAdjustDelta(0); }} title="Set custom amount">
                          ±
                        </button>
                      )}
                      <button className="stock-adj-btn stock-adj-add" onClick={() => handleAdjust(item, 1)} title="Add 1">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="stock-progress-wrap">
                    <div
                      className="stock-progress-bar"
                      style={{
                        width: `${Math.min(100, (item.quantity / Math.max(item.lowStockThreshold * 3, 1)) * 100)}%`,
                        background: isLow ? "var(--amber)" : "var(--gold)",
                      }}
                    />
                  </div>

                  {item.notes && <p className="stock-notes">{item.notes}</p>}
                  <p className="stock-updated">
                    Updated by {item.lastUpdatedBy || "—"} ·{" "}
                    {new Date(item.lastUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modal === "add" ? "Add Stock Item" : "Edit Stock Item"}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Item Name *</label>
                <input
                  className="haven-input-sm"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hendrick's Gin"
                  autoFocus
                />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Category *</label>
                  <select className="haven-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {STOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Unit</label>
                  <input
                    className="haven-input-sm"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="bottles / cans / kegs"
                  />
                </div>
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Quantity</label>
                  <input
                    className="haven-input-sm"
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Low Stock Alert At</label>
                  <input
                    className="haven-input-sm"
                    type="number"
                    min={0}
                    value={form.lowStockThreshold}
                    onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="haven-input-sm"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. House favourite"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="haven-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="haven-btn-primary" onClick={handleSave}>
                {modal === "add" ? "Add Item" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
