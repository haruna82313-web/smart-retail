import { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
import SystemToast from "../components/SystemToast";
import AppModal from "../components/AppModal";
import PricingTierEditor from "../components/PricingTierEditor";
const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces / Individual Items" },
  { value: "pair", label: "Pairs" },
  { value: "set", label: "Sets" },
  { value: "doz", label: "Dozens (12 pcs)" },
  { value: "half-doz", label: "Half Dozens (6 pcs)" },
  { value: "pkts", label: "Packets" },
  { value: "sachets", label: "Sachets" },
  { value: "pouches", label: "Pouches" },
  { value: "rolls", label: "Rolls" },
  { value: "bundles", label: "Bundles" },
  { value: "bales", label: "Bales" },
  { value: "bags", label: "Bags / Sacks" },
  { value: "ctns", label: "Cartons" },
  { value: "boxes", label: "Boxes" },
  { value: "cases", label: "Cases" },
  { value: "trays", label: "Trays" },
  { value: "tubs", label: "Tubs" },
  { value: "jars", label: "Jars" },
  { value: "cans", label: "Cans / Tins" },
  { value: "btls", label: "Bottles" },
  { value: "jerricans", label: "Jerrycans" },
  { value: "ltrs", label: "Litres (L)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "kgs", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "tons", label: "Tonnes (t)" },
  { value: "m", label: "Meters (m)" },
  { value: "cm", label: "Centimeters (cm)" },
  { value: "ft", label: "Feet (ft)" },
  { value: "sq-m", label: "Square Meters (m²)" },
];

export default function Stock({ user, list = [], refresh, isAdmin }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [deletingStock, setDeletingStock] = useState(null);
  const [form, setForm] = useState({
    product_name: "",
    variant: "",
    wholesaleQty: "",
    unitsPerBulk: "",
    retail_price: "",
    totalMoneySpent: "",
    unit: "pcs"
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 220);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredStock = useMemo(() => {
    if (!debouncedSearchTerm) return list || [];
    return (list || []).filter(item => 
      item.product_name?.toLowerCase().includes(debouncedSearchTerm) ||
      item.variant?.toLowerCase().includes(debouncedSearchTerm)
    );
  }, [debouncedSearchTerm, list]);

  const handleAddStock = async () => {
    try {
      setLoading(true);
      if (!user) return setNotice({ message: "Please log in first.", type: "error" });
      if (!form.product_name || !form.retail_price) {
        return setNotice({ message: "Required: Item Name and Selling Price.", type: "error" });
      }

      const total_units = Number(form.wholesaleQty || 0) * Number(form.unitsPerBulk || 1);
      const buying_price = total_units > 0 ? (Number(form.totalMoneySpent || 0) / total_units) : 0;

      const { error } = await supabase.from("stock").insert([{
        product_name: form.product_name,
        variant: form.variant,
        quantity: total_units,
        retail_price: Math.round(Number(form.retail_price)),
        buying_price: Number(buying_price.toFixed(2)),
        unit: form.unit,
        user_id: user.id,
      }]);

      if (error) throw error;
      setNotice({ message: "Stock item saved successfully.", type: "success" });
      setForm({ product_name: "", variant: "", wholesaleQty: "", unitsPerBulk: "", retail_price: "", totalMoneySpent: "", unit: "pcs" });
      refresh(); 
    } catch (err) {
      setNotice({ message: err.message || "Could not save stock item.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteStock = async () => {
    if (!deletingStock) return;
    setLoading(true);
    const { error } = await supabase.from("stock").delete().eq("id", deletingStock.id);
    if (error) {
      setNotice({ message: error.message, type: "error" });
    } else {
      setNotice({ message: "Stock item deleted.", type: "success" });
      await refresh();
    }
    setDeletingStock(null);
    setLoading(false);
  };

  return (
    <div className="section stock glass-card">
      <SystemToast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "info" })}
      />
      <AppModal
        open={Boolean(deletingStock)}
        title="Delete Stock Item"
        onCancel={() => setDeletingStock(null)}
        onConfirm={confirmDeleteStock}
        confirmLabel={loading ? "Deleting..." : "Delete"}
        confirmDisabled={loading}
      >
        Permanently delete <strong>{deletingStock?.product_name}</strong>?
      </AppModal>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '5px' }}>📦 Shop Inventory</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>Fill in the details below to add stock.</p>

      {/* 🔍 SEARCH BOX (Stays at top) */}
      <div style={{ marginBottom: '35px' }}>
        <small style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>QUICK SEARCH:</small>
        <input 
          type="text"
          placeholder="Search by name (e.g. Sugar or Soda)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '15px', marginTop: '8px', fontSize: '16px', borderRadius: '12px' }}
        />
      </div>

      {/* 📝 VERTICAL FORM WRAPPER */}
      <div className="stock-form-wrapper" style={{ 
        display: 'flex', 
        flexDirection: 'column', // This forces them below each other
        gap: '20px', 
        background: 'rgba(255,255,255,0.03)', 
        padding: '30px', 
        borderRadius: '24px', 
        border: '1px solid var(--border-slate)',
        maxWidth: '600px', // Keeps the vertical form from getting too wide
        margin: '0 auto' // Centers the form
      }}>
        
        {/* Field 1 */}
        <div className="stock-field">
          <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px' }}>PRODUCT NAME</label>
          <input placeholder="e.g. Rice or Pampers" value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} />
        </div>

        {/* Field 2 */}
        <div className="stock-field">
          <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px' }}>TYPE / SIZE / VARIETY</label>
          <input placeholder="e.g. Super, Medium, or Size 4" value={form.variant} onChange={e => setForm({...form, variant: e.target.value})} />
        </div>

        {/* Field 3 */}
        <div className="stock-field">
          <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px' }}>MEASURE IN...</label>
          <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} style={{ height: '52px', fontSize: '15px', width: '100%' }}>
            {UNIT_OPTIONS.map((unitOption) => (
              <option key={unitOption.value} value={unitOption.value}>
                {unitOption.label}
              </option>
            ))}
          </select>
        </div>

        {/* Field 4 & 5 (Grouped for easier logic) */}
        <div className="stock-inline-row" style={{ display: 'flex', gap: '15px' }}>
          <div className="stock-inline-col" style={{ flex: 1 }}>
            <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px' }}>QTY BOUGHT</label>
            <input type="number" step="any" placeholder="How many boxes?" value={form.wholesaleQty} onChange={e => setForm({...form, wholesaleQty: e.target.value})} />
          </div>
          <div className="stock-inline-col" style={{ flex: 1 }}>
            <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px' }}>UNITS PER BOX</label>
            <input type="number" step="any" placeholder="e.g. 24" value={form.unitsPerBulk} onChange={e => setForm({...form, unitsPerBulk: e.target.value})} />
          </div>
        </div>

        {/* Field 6 */}
        <div className="stock-field">
          <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px', color: 'var(--accent-teal)' }}>SELLING PRICE (EACH)</label>
          <input type="number" placeholder="Price per single item" value={form.retail_price} onChange={e => setForm({...form, retail_price: e.target.value})} />
        </div>

        {/* Field 7 */}
        <div className="stock-field">
          <label className="stock-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '14px' }}>TOTAL COST PAID</label>
          <input type="number" placeholder="How much did you spend in total?" value={form.totalMoneySpent} onChange={e => setForm({...form, totalMoneySpent: e.target.value})} />
        </div>

        {/* SAVE BUTTON */}
        <button onClick={handleAddStock} disabled={loading} style={{ 
          height: '60px', 
          width: '100%', 
          fontSize: '18px', 
          fontWeight: '900',
          marginTop: '15px',
          background: 'var(--accent-teal)',
          color: '#000',
          borderRadius: '16px',
          boxShadow: '0 10px 20px rgba(45, 212, 191, 0.2)'
        }}>
          {loading ? "Saving..." : "💾 SAVE TO SHOP"}
        </button>
      </div>

      {/* 📋 LIST (Stays as rows) */}
      <div style={{ marginTop: "50px" }}>
        <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>Shop Items List</h4>
        {filteredStock.map((s) => (
          <div key={s.id} className="item-row stock-item-card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div className="stock-item-main">
              <strong className="stock-item-name" style={{ fontSize: '1.1rem' }}>{s.product_name}</strong> 
              <span className="stock-item-variant" style={{ color: 'var(--neon-cyan)', marginLeft: '8px' }}>({s.variant})</span> <br />
              <small className="stock-item-qty" style={{ fontSize: '13px', color: s.quantity <= 5 ? "var(--danger)" : "#94a3b8" }}>
                {Number(s.quantity).toFixed(2)} {s.unit} in stock
              </small>
              {isAdmin && (
                <PricingTierEditor
                  productName={s.product_name}
                  currentTiers={s.pricing_tiers}
                  onSaveTiers={async (tiers) => {
                    const { error } = await supabase
                      .from("stock")
                      .update({ pricing_tiers: tiers })
                      .eq("id", s.id);
                    
                    if (!error) {
                      setNotice({ message: "Pricing tiers updated", type: "success" });
                      await refresh();
                    } else {
                      setNotice({ message: error.message, type: "error" });
                    }
                  }}
                />
              )}
            </div>
            
            <div className="stock-item-side" style={{ textAlign: "right" }}>
              <span className="stock-item-price" style={{ fontWeight: "900", fontSize: '1.2rem', color: 'var(--accent-teal)' }}>
                {Number(s.retail_price).toLocaleString()}
              </span>
              
              {isAdmin && (
                <button 
                  onClick={() => setDeletingStock(s)}
                  disabled={loading}
                  className="stock-item-delete"
                  style={{ background: 'transparent', color: 'var(--danger)', fontSize: '10px', display: 'block', marginLeft: 'auto', marginTop: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '6px' }}
                >
                  DELETE
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
