import { useState } from "react";
import { supabase } from "../supabaseClient";
import SystemToast from "../components/SystemToast";
import AppModal from "../components/AppModal";
export default function Debts({ user, list = [], refresh, isAdmin }) {
  const [form, setForm] = useState({ customer: "", amount: "", entryDate: "" });
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [payingDebt, setPayingDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [deletingDebt, setDeletingDebt] = useState(null);
  const formatUGX = (num) => "UGX " + Number(num || 0).toLocaleString();
  const formatPostedDate = (iso) => {
    if (!iso) return "No date";
    return new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
  };
  const isDebtFormComplete = Boolean(form.customer && form.amount && form.entryDate);
  const scopedDebts = (list || []).filter((row) => !user?.id || row?.user_id === user.id);

  const recordPaymentHistory = async ({ amount, debtRecord }) => {
    const { error } = await supabase.from("payment_history").insert({
      entry_type: "debt_payment",
      reference_id: debtRecord.id,
      party_name: debtRecord.customer,
      amount: Number(amount),
      user_id: user?.id || null,
    });
    return error;
  };

  const addDebt = async () => {
    if (!isDebtFormComplete) {
      return setNotice({ message: "Fill in customer, amount, and date.", type: "error" });
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("debts").insert({
        customer: form.customer,
        total_amount: Number(form.amount),
        paid_amount: 0,
        user_id: user.id,
        created_at: `${form.entryDate}T00:00:00`,
      });
      if (error) return setNotice({ message: error.message, type: "error" });
      setForm({ customer: "", amount: "", entryDate: "" });
      setNotice({ message: "Debt record added.", type: "success" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const payDebt = async () => {
    if (!payingDebt || !paymentAmount || isNaN(paymentAmount)) {
      return setNotice({ message: "Payment cancelled or invalid amount.", type: "warning" });
    }
    try {
      setLoading(true);
      const paymentValue = Number(paymentAmount);
      const maxPayable = Math.max(0, Number(payingDebt.total_amount) - Number(payingDebt.paid_amount));
      if (paymentValue <= 0) {
        setNotice({ message: "Enter a valid payment amount.", type: "error" });
        return;
      }
      if (paymentValue > maxPayable) {
        setNotice({ message: "Payment exceeds remaining balance.", type: "error" });
        return;
      }
      const newPaid = Number(payingDebt.paid_amount) + paymentValue;
      await supabase.from("debts").update({ paid_amount: newPaid }).eq("id", payingDebt.id);
      const paymentLogError = await recordPaymentHistory({ amount: paymentAmount, debtRecord: payingDebt });
      const fullyCleared = Math.abs(newPaid - Number(payingDebt.total_amount)) < 0.0001;
      setPayingDebt(null);
      setPaymentAmount("");
      setNotice({
        message: paymentLogError
          ? "Payment saved. History log missing; ensure payment_history table exists."
          : fullyCleared
            ? "Debt cleared and logged in Payment History."
            : "Payment received and logged in Payment History.",
        type: paymentLogError ? "warning" : "success",
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const deleteDebt = async () => {
    if (!deletingDebt) return;
    try {
      setLoading(true);
      await supabase.from("debts").delete().eq("id", deletingDebt.id);
      setDeletingDebt(null);
      setNotice({ message: "Debt record deleted.", type: "success" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section debts glass-card">
      <SystemToast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "info" })}
      />
      <AppModal
        open={Boolean(payingDebt)}
        title="Receive Payment"
        onCancel={() => {
          setPayingDebt(null);
          setPaymentAmount("");
        }}
        onConfirm={payDebt}
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
        open={Boolean(deletingDebt)}
        title="Delete Debt Record"
        onCancel={() => setDeletingDebt(null)}
        onConfirm={deleteDebt}
        confirmLabel={loading ? "Deleting..." : "Delete"}
        confirmDisabled={loading}
      >
        Delete record for <strong>{deletingDebt?.customer}</strong>?
      </AppModal>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '5px' }}>💰 Customer Debts</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>Track people who owe the shop money.</p>

      <div className="debts-form-wrapper" style={{ 
        display: 'flex', flexDirection: 'column', gap: '20px', 
        background: 'rgba(255,255,255,0.03)', padding: '30px', 
        borderRadius: '24px', border: '1px solid var(--border-slate)',
        maxWidth: '500px', margin: '0 auto' 
      }}>
        <div className="debts-field">
          <label className="debts-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>CUSTOMER NAME</label>
          <input placeholder="Who is taking on credit?" value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} />
        </div>

        <div className="debts-field">
          <label className="debts-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>AMOUNT OWED</label>
          <input placeholder="Total money owed" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
        </div>

        <div className="debts-field">
          <label className="debts-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px' }}>DEBT DATE</label>
          <input type="date" value={form.entryDate} onChange={e => setForm({...form, entryDate: e.target.value})} />
        </div>

        <button onClick={addDebt} disabled={loading || !isDebtFormComplete} style={{ height: '55px', fontWeight: '900', background: 'var(--accent-teal)', color: '#000', borderRadius: '12px' }}>
          {loading ? "Saving..." : "➕ ADD DEBT RECORD"}
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
        {scopedDebts.map((d) => (
          <div key={d.id} className="item-row debts-item-card" style={{ padding: '20px' }}>
            <div className="debts-item-main">
              <strong className="debts-item-name">{d.customer}</strong> <br />
              <small className="debts-item-meta">
                Balance: <span style={{color: 'var(--danger)', fontWeight: 'bold'}}>{formatUGX(d.total_amount - d.paid_amount)}</span> • Posted: {formatPostedDate(d.created_at)}
              </small>
            </div>
            <div className="debts-item-side" style={{ textAlign: "right" }}>
              <button className="debts-item-action" onClick={() => setPayingDebt(d)} disabled={loading} style={{ padding: '8px 15px' }}>Receive Payment</button>
              {isAdmin && (
                <button 
                  className="debts-item-delete"
                  onClick={() => setDeletingDebt(d)}
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
