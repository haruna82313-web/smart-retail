import { useState } from "react";
import { supabase } from "../supabaseClient";
import SystemToast from "../components/SystemToast";
import AppModal from "../components/AppModal";
export default function Sales({ user, list = [], stockList = [], setData, refresh, isAdmin }) {
  const [form, setForm] = useState({ itemID: "", quantity: 1 });
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [syncStatus, setSyncStatus] = useState("idle");
  const [returningSale, setReturningSale] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatUGX = (n) => "UGX " + Number(n || 0).toLocaleString();

  const formatLocalTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const selectedProduct = stockList.find((s) => s.id?.toString() === form.itemID);

  const decrementStockSafely = async (stockId, qty) => {
    const { data: beforeRow, error: beforeErr } = await supabase
      .from("stock")
      .select("quantity")
      .eq("id", stockId)
      .single();
    if (beforeErr) throw beforeErr;

    const beforeQty = Number(beforeRow?.quantity || 0);

    const { error: rpcErr } = await supabase.rpc("decrement_stock", {
      row_id: stockId,
      quantity_to_sub: qty
    });

    if (!rpcErr) {
      const { data: afterRpcRow, error: afterRpcErr } = await supabase
        .from("stock")
        .select("quantity")
        .eq("id", stockId)
        .single();
      if (afterRpcErr) throw afterRpcErr;

      const afterRpcQty = Number(afterRpcRow?.quantity || 0);
      const expectedQty = beforeQty - Number(qty || 0);
      const rpcApplied = Math.abs(afterRpcQty - expectedQty) < 0.0001;
      if (rpcApplied) return;
    }

    setNotice({ message: "RPC fallback used: stock updated directly.", type: "warning" });

    const { data: row, error: fetchErr } = await supabase
      .from("stock")
      .select("quantity")
      .eq("id", stockId)
      .single();
    if (fetchErr) throw fetchErr;

    const nextQty = Math.max(0, Number(row?.quantity || 0) - Number(qty || 0));
    const { data: updatedRows, error: updateErr } = await supabase
      .from("stock")
      .update({ quantity: nextQty })
      .eq("id", stockId)
      .select("id, quantity");
    if (updateErr) throw updateErr;
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Stock update was blocked (no rows updated). Check Supabase RLS UPDATE policy on stock.");
    }
  };

  const incrementStockSafely = async (stockId, qty) => {
    const { data: beforeRow, error: beforeErr } = await supabase
      .from("stock")
      .select("quantity")
      .eq("id", stockId)
      .single();
    if (beforeErr) throw beforeErr;

    const beforeQty = Number(beforeRow?.quantity || 0);

    const { error: rpcErr } = await supabase.rpc("increment_stock", {
      row_id: stockId,
      quantity_to_add: qty
    });

    if (!rpcErr) {
      const { data: afterRpcRow, error: afterRpcErr } = await supabase
        .from("stock")
        .select("quantity")
        .eq("id", stockId)
        .single();
      if (afterRpcErr) throw afterRpcErr;

      const afterRpcQty = Number(afterRpcRow?.quantity || 0);
      const expectedQty = beforeQty + Number(qty || 0);
      const rpcApplied = Math.abs(afterRpcQty - expectedQty) < 0.0001;
      if (rpcApplied) return;
    }

    setNotice({ message: "RPC fallback used: return stock updated directly.", type: "warning" });

    const { data: row, error: fetchErr } = await supabase
      .from("stock")
      .select("quantity")
      .eq("id", stockId)
      .single();
    if (fetchErr) throw fetchErr;

    const nextQty = Number(row?.quantity || 0) + Number(qty || 0);
    const { data: updatedRows, error: updateErr } = await supabase
      .from("stock")
      .update({ quantity: nextQty })
      .eq("id", stockId)
      .select("id, quantity");
    if (updateErr) throw updateErr;
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Return stock update was blocked (no rows updated). Check Supabase RLS UPDATE policy on stock.");
    }
  };

  const addSale = async (qtyOverride = null) => {
    const qty = Number(qtyOverride || form.quantity || 0);
    if (!selectedProduct) return setNotice({ message: "Select an item first.", type: "error" });
    if (qty <= 0) return setNotice({ message: "Enter a valid quantity.", type: "error" });

    const available = Number(selectedProduct.quantity || 0);
    if (available < qty) return setNotice({ message: "Insufficient stock.", type: "error" });

    const retail = Number(selectedProduct.retail_price || 0);
    const buying = Number(selectedProduct.buying_price || 0);
    const totalSellingPrice = qty * retail;
    const totalCost = qty * buying;
    const profit = totalSellingPrice - totalCost;

    const newSale = {
      item: `${selectedProduct.product_name} (${selectedProduct.variant || "N/A"})`,
      quantity: qty,
      price: totalSellingPrice,
      cost_price: totalCost,
      profit: profit,
      unit: selectedProduct.unit || "pcs",
      user_id: user?.id,
      stock_id: selectedProduct.id // 👈 THIS LINKS TO STOCK
    };

    // UI Update (Optimistic)
    setData((prev) => ({
      ...prev,
      sales: [{ ...newSale, id: Date.now(), created_at: new Date().toISOString() }, ...(prev.sales || [])],
      stock: (prev.stock || []).map((s) => s.id === selectedProduct.id ? { ...s, quantity: s.quantity - qty } : s),
    }));

    setForm({ ...form, quantity: 1 });
    setSyncStatus("syncing");

    // DATABASE SYNC
    try {
      setLoading(true);
      const { error: insertErr } = await supabase.from("sales").insert(newSale);
      if (insertErr) throw insertErr;

      await decrementStockSafely(selectedProduct.id, qty);
      await refresh();
      setSyncStatus("synced");
      setNotice({ message: "Sale saved and stock synced.", type: "success" });

    } catch (err) {
      console.error("Sale Failed:", err.message);
      setSyncStatus("error");
      setNotice({ message: err.message || "Sale sync failed. Check DB permissions.", type: "error" });
      refresh(); // REVERTS TO TRUTH
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (sale) => {
    if (!isAdmin) return setNotice({ message: "Admin only action.", type: "error" });

    try {
      setLoading(true);
      setSyncStatus("syncing");
      await supabase.from("sales").delete().eq("id", sale.id);
      if (sale.stock_id) {
        await incrementStockSafely(sale.stock_id, Number(sale.quantity));
      }
      setSyncStatus("synced");
      setNotice({ message: "Sale returned and stock restored.", type: "success" });
      refresh();
    } catch (err) {
      setSyncStatus("error");
      setNotice({ message: err.message || "Return sync failed.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const totalToday = (list || []).reduce((a, b) => a + Number(b?.price || 0), 0);

  return (
    <div className="section sales glass-card">
      <SystemToast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "info" })}
      />

      <h2 className="section-title checkout-title">🧾 Customer Checkout</h2>
      <p style={{ textAlign: "center", marginTop: "-8px", marginBottom: "16px", fontSize: "12px", color: syncStatus === "error" ? "var(--danger)" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        {syncStatus === "syncing" && (
          <>
            <span className="sync-spinner" aria-hidden="true" />
            Sync status: Saving sale...
          </>
        )}
        {syncStatus === "synced" && "Sync status: Synced to cloud"}
        {syncStatus === "error" && "Sync status: Sync failed (check notice)"}
        {syncStatus === "idle" && "Sync status: Ready"}
      </p>
      <AppModal
        open={Boolean(returningSale)}
        title="Confirm Return"
        onCancel={() => setReturningSale(null)}
        onConfirm={async () => {
          if (!returningSale) return;
          await handleReturn(returningSale);
          setReturningSale(null);
        }}
        confirmLabel={loading ? "Returning..." : "Return Sale"}
        confirmDisabled={loading}
      >
        Return <strong>{returningSale?.item}</strong> to stock?
      </AppModal>

      <div className="checkout-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border-slate)', maxWidth: '500px', margin: '0 auto' }}>
        <div className="checkout-field">
          <label className="checkout-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>SELECT PRODUCT</label>
          <select value={form.itemID} onChange={(e) => setForm({ ...form, itemID: e.target.value })} style={{ width: '100%', height: '52px' }}>
            <option value="">-- Choose Item --</option>
            {stockList.map((s) => (
              <option key={s.id} value={s.id}>{s.product_name} - {s.variant} ({Number(s.quantity).toFixed(2)} left)</option>
            ))}
          </select>
        </div>

        <div className="checkout-field">
          <label className="checkout-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>QUANTITY</label>
          <input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>

        <div className="chips" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          <button 
            onClick={() => addSale(0.25)} 
            disabled={loading}
            style={{
              height: '48px',
              fontWeight: '400',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: '#fff',
              color: '#333',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 0 10px rgba(0, 0, 0, 0.1)',
              transform: loading ? 'scale(0.95)' : 'scale(1)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🥄 1/4
          </button>
          <button 
            onClick={() => addSale(0.5)} 
            disabled={loading}
            style={{
              height: '48px',
              fontWeight: '400',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: '#fff',
              color: '#333',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 0 10px rgba(0, 0, 0, 0.1)',
              transform: loading ? 'scale(0.95)' : 'scale(1)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🍽️ 1/2
          </button>
          <button 
            onClick={() => addSale(0.75)} 
            disabled={loading}
            style={{
              height: '48px',
              fontWeight: '400',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: '#fff',
              color: '#333',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 0 10px rgba(0, 0, 0, 0.1)',
              transform: loading ? 'scale(0.95)' : 'scale(1)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🍲 3/4
          </button>
          <button 
            onClick={() => addSale(1)} 
            disabled={loading}
            style={{
              height: '48px',
              fontWeight: '400',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: '#fff',
              color: '#333',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 0 10px rgba(0, 0, 0, 0.1)',
              transform: loading ? 'scale(0.95)' : 'scale(1)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🍱 1 Whole
          </button>
        </div>

        <button onClick={() => addSale()} disabled={loading} style={{ height: '60px', fontWeight: '900', background: 'var(--accent-teal)', color: '#000', borderRadius: '12px' }}>
          {loading ? "Saving..." : "✅ COMPLETE SALE"}
        </button>
      </div>

      <div className="stats" style={{ marginTop: '30px' }}>
        <div className="stat-box">
          <small>Today's Total Revenue</small>
          <h3>{formatUGX(totalToday)}</h3>
        </div>
      </div>

      <div style={{ marginTop: "30px" }}>
        {list.map((s) => (
          <div key={s.id} className="item-row sales-item-card">
            <div className="sales-item-main">
              <strong className="sales-item-name">{s.item}</strong> <br />
              <small className="sales-item-meta">{Number(s.quantity)} {s.unit} sold • {formatLocalTime(s.created_at)}</small>
            </div>
            <div className="sales-item-side" style={{ textAlign: "right" }}>
              <span className="sales-item-price" style={{ fontWeight: "bold" }}>{formatUGX(s.price)}</span> <br/>
              {isAdmin && (
                <button className="sales-item-return" onClick={() => setReturningSale(s)} style={{color: 'var(--danger)', fontSize: '10px', marginTop: '5px', background: 'none', border: '1px solid var(--danger)', padding: '2px 5px', cursor: 'pointer'}}>
                  ↩️ Return Sale
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
