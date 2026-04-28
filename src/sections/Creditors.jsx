import { useState } from "react";
import { supabase } from "../supabaseClient";
import SystemToast from "../components/SystemToast";
import AppModal from "../components/AppModal";
export default function Creditors({ user, list = [], refresh, isAdmin }) {
  const [form, setForm] = useState({ supplier: "", amount: "", entryDate: "" });
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [payingCreditor, setPayingCreditor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [deletingCreditor, setDeletingCreditor] = useState(null);
  const formatUGX = (num) => "UGX " + Number(num || 0).toLocaleString();
  const formatPostedDate = (iso) => {
    if (!iso) return "No date";
    return new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
  };
  const isCreditorFormComplete = Boolean(form.supplier && form.amount && form.entryDate);
  const scopedCreditors = (list || []).filter((row) => !user?.id || row?.user_id === user.id);

  const recordPaymentHistory = async ({ amount, creditorRecord }) => {
    const { error } = await supabase.from("payment_history").insert({
      entry_type: "creditor_payment",
      reference_id: creditorRecord.id,
      party_name: creditorRecord.supplier,
      amount: Number(amount),
      user_id: user?.id || null,
    });
    return error;
  };

  const addCreditor = async () => {
    if (!isCreditorFormComplete) {
      return setNotice({ message: "Fill in supplier, amount, and date.", type: "error" });
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("creditors").insert({
        supplier: form.supplier,
        total_amount: Math.round(Number(form.amount)),
        paid_amount: 0,
        user_id: user.id,
        created_at: `${form.entryDate}T00:00:00`,
      });
      if (error) return setNotice({ message: error.message, type: "error" });
      setForm({ supplier: "", amount: "", entryDate: "" });
      setNotice({ message: "Creditor record added.", type: "success" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const payCreditor = async () => {
    if (!payingCreditor || !paymentAmount || isNaN(paymentAmount)) {
      return setNotice({ message: "Payment cancelled or invalid amount.", type: "warning" });
    }
    try {
      setLoading(true);
      const paymentValue = Number(paymentAmount);
      const maxPayable = Math.max(0, Number(payingCreditor.total_amount) - Number(payingCreditor.paid_amount));
      if (paymentValue <= 0) {
        setNotice({ message: "Enter a valid payment amount.", type: "error" });
        return;
      }
      if (paymentValue > maxPayable) {
        setNotice({ message: "Payment exceeds remaining balance.", type: "error" });
        return;
      }
      const newPaid = Number(payingCreditor.paid_amount) + paymentValue;
      await supabase.from("creditors").update({ paid_amount: newPaid }).eq("id", payingCreditor.id);
      const paymentLogError = await recordPaymentHistory({ amount: paymentAmount, creditorRecord: payingCreditor });
      const fullyCleared = Math.abs(newPaid - Number(payingCreditor.total_amount)) < 0.0001;
      setPayingCreditor(null);
      setPaymentAmount("");
      setNotice({
        message: paymentLogError
          ? "Payment saved. History log missing; ensure payment_history table exists."
          : fullyCleared
            ? "Creditor cleared and logged in Payment History."
            : "Supplier payment saved and logged in Payment History.",
        type: paymentLogError ? "warning" : "success",
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const deleteCreditor = async () => {
    if (!deletingCreditor) return;
    try {
      setLoading(true);
      await supabase.from("creditors").delete().eq("id", deletingCreditor.id);
      setDeletingCreditor(null);
      setNotice({ message: "Creditor record deleted.", type: "success" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section creditors glass-card">
      <SystemToast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "info" })}
      />
      <AppModal
        open={Boolean(payingCreditor)}
        title="Pay Supplier"
        onCancel={() => {
          setPayingCreditor(null);
          setPaymentAmount("");
        }}
        onConfirm={payCreditor}
        confirmLabel={loading ? "Saving..." : "Save Payment"}
        confirmDisabled={loading}
      >
        <input
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="Enter payment amount"
          type="number"
        />
      </AppModal>
      <AppModal
        open={Boolean(deletingCreditor)}
        title="Delete Creditor Record"
        onCancel={() => setDeletingCreditor(null)}
        onConfirm={deleteCreditor}
        confirmLabel={loading ? "Deleting..." : "Delete"}
        confirmDisabled={loading}
      >
        Delete record for <strong>{deletingCreditor?.supplier}</strong>?
      </AppModal>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '5px' }}>🏦 Supplier Creditors</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>Track money you owe to your suppliers.</p>

      <div className="creditors-form-wrapper" style={{ 
        display: 'flex', flexDirection: 'column', gap: '20px', 
        background: 'rgba(255,255,255,0.03)', padding: '30px', 
        borderRadius: '24px', border: '1px solid var(--border-slate)',
        maxWidth: '500px', margin: '0 auto' 
      }}>
        <div className="creditors-field">
          <label className="creditors-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>SUPPLIER / COMPANY</label>
          <input placeholder="Who did you get stock from?" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
        </div>

        <div className="creditors-field">
          <label className="creditors-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>AMOUNT YOU OWE</label>
          <input placeholder="Total money to be paid" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
        </div>

        <div className="creditors-field">
          <label className="creditors-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>CREDITOR DATE</label>
          <input type="date" value={form.entryDate} onChange={e => setForm({...form, entryDate: e.target.value})} />
        </div>

        <button onClick={addCreditor} disabled={loading || !isCreditorFormComplete} style={{ height: '55px', fontWeight: '900', background: 'var(--neon-cyan)', color: '#000', borderRadius: '12px' }}>
          {loading ? "Saving..." : "➕ ADD CREDITOR RECORD"}
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
        {scopedCreditors.map((c) => (
          <div key={c.id} className="item-row creditors-item-card" style={{ padding: '20px' }}>
            <div className="creditors-item-main">
              <strong className="creditors-item-name">{c.supplier}</strong> <br />
              <small className="creditors-item-meta">
                You Owe: <span style={{color: 'var(--neon-cyan)', fontWeight: 'bold'}}>{formatUGX(c.total_amount - c.paid_amount)}</span> • Posted: {formatPostedDate(c.created_at)}
              </small>
            </div>
            <div className="creditors-item-side" style={{ textAlign: "right" }}>
              <button className="creditors-item-action" onClick={() => setPayingCreditor(c)} disabled={loading} style={{ padding: '8px 15px' }}>Pay Supplier</button>
              {isAdmin && (
                <button 
                  className="creditors-item-delete"
                  onClick={() => setDeletingCreditor(c)}
                  disabled={loading}
                  style={{ color: 'var(--danger)', marginLeft: 15, background: 'none', fontSize: '18px' }}
                >🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
