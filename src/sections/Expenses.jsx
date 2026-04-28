import { useState } from "react";
import { supabase } from "../supabaseClient";
import SystemToast from "../components/SystemToast";
import AppModal from "../components/AppModal";
import { useAppState } from "../state/AppStateContext";

export default function Expenses({ user, isAdmin }) {
  const { expenses, addExpense, deleteExpense } = useAppState();
  const [form, setForm] = useState({ type: "supplies", amount: "", description: "" });
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);

  const expenseTypes = [
    { value: "supplies", label: "🛒 Supplies & Materials" },
    { value: "utilities", label: "💡 Utilities (Water, Power, Internet)" },
    { value: "rent", label: "🏠 Rent & Premises" },
    { value: "transport", label: "🚗 Transport & Logistics" },
    { value: "salaries", label: "💼 Salaries & Wages" },
    { value: "maintenance", label: "🔧 Maintenance & Repairs" },
    { value: "marketing", label: "📢 Marketing & Advertising" },
    { value: "other", label: "📋 Other Expenses" },
  ];

  const formatUGX = (num) => "UGX " + Number(num || 0).toLocaleString();

  const handleAddExpense = async () => {
    if (!form.type) return setNotice({ message: "Select expense type.", type: "error" });
    if (!form.amount || Number(form.amount) <= 0) return setNotice({ message: "Enter valid amount.", type: "error" });

    try {
      setLoading(true);
      await addExpense({
        type: form.type,
        amount: Math.round(Number(form.amount)),
        description: form.description || "No description",
        user_id: user?.id,
      });
      setNotice({ message: "Expense recorded.", type: "success" });
      setForm({ type: "supplies", amount: "", description: "" });
    } catch (err) {
      setNotice({ message: err.message || "Failed to record expense.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      setLoading(true);
      await deleteExpense(deletingExpense.id);
      setNotice({ message: "Expense deleted.", type: "success" });
      setDeletingExpense(null);
    } catch (err) {
      setNotice({ message: err.message || "Failed to delete expense.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const getTypeLabel = (value) => {
    const typeMap = {
      "supplies": "🛒 Supplies & Materials",
      "utilities": "💡 Utilities (Water, Power, Internet)",
      "rent": "🏠 Rent & Premises",
      "transport": "🚗 Transport & Logistics",
      "salaries": "💼 Salaries & Wages",
      "maintenance": "🔧 Maintenance & Repairs",
      "marketing": "📢 Marketing & Advertising",
      "other": "📋 Other Expenses"
    };
    return typeMap[value] || value;
  };

  return (
    <div className="section expenses glass-card">
      <SystemToast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "info" })}
      />
      <AppModal
        open={Boolean(deletingExpense)}
        title="Delete Expense"
        onCancel={() => setDeletingExpense(null)}
        onConfirm={handleDeleteExpense}
        confirmLabel={loading ? "Deleting..." : "Delete"}
        confirmDisabled={loading}
      >
        Delete <strong>{deletingExpense?.type}</strong> expense for {formatUGX(deletingExpense?.amount)}?
      </AppModal>

      <h2 className="section-title">💸 Manage Expenses</h2>
      <p className="payment-history-subtitle">Track business expenses and costs.</p>

      {/* TOTAL EXPENSES CARD */}
      <div className="stats" style={{ marginBottom: '30px' }}>
        <div className="stat-box">
          <small style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Today's Total Expenses</small>
          <h3 style={{ color: 'var(--danger)' }}>
            {formatUGX(totalExpenses)}
          </h3>
        </div>
      </div>

      {/* FORM WRAPPER */}
      <div className="expenses-form-wrapper" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        background: 'rgba(255,255,255,0.03)', 
        padding: '30px', 
        borderRadius: '24px', 
        border: '1px solid var(--border-slate)', 
        maxWidth: '500px', 
        margin: '0 auto 40px'
      }}>
        <div className="expenses-field">
          <label className="expenses-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>Expense Type</label>
          <select 
            value={form.type} 
            onChange={(e) => setForm({ ...form, type: e.target.value })} 
            style={{ width: '100%', height: '52px' }}
          >
            {expenseTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="expenses-field">
          <label className="expenses-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>Amount (UGX)</label>
          <input 
            type="number" 
            step="100"
            placeholder="Enter amount..." 
            value={form.amount} 
            onChange={(e) => setForm({ ...form, amount: e.target.value })} 
          />
        </div>

        <div className="expenses-field">
          <label className="expenses-field-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>Description (Optional)</label>
          <textarea 
            placeholder="Notes about this expense..." 
            value={form.description} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
            style={{ minHeight: '80px', fontFamily: 'inherit' }}
          />
        </div>

        <button 
          onClick={handleAddExpense} 
          disabled={loading} 
          style={{ 
            height: '60px', 
            fontWeight: '900',
            background: 'var(--accent-teal)',
            color: '#000',
            borderRadius: '16px'
          }}
        >
          {loading ? "Recording..." : "💾 RECORD EXPENSE"}
        </button>
      </div>

      {/* EXPENSES LIST */}
      <div style={{ marginTop: '40px' }}>
        <h4 style={{ marginBottom: '20px', textAlign: 'center', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>Recent Expenses</h4>
        {!expenses || expenses.length === 0 ? (
          <div className="payment-history-empty">
            No expenses recorded today.
          </div>
        ) : (
          [...(expenses || [])].reverse().map((expense) => (
            <div 
              key={expense.id} 
              className="item-row expenses-item-card"
              style={{ padding: '20px' }}
            >
              <div className="expenses-item-main">
                <strong className="expenses-item-name" style={{ color: 'var(--text-main)' }}>{getTypeLabel(expense.type)}</strong><br />
                <small className="expenses-item-meta" style={{ color: 'var(--text-muted)' }}>{expense.description}</small>
              </div>
              <div className="expenses-item-side" style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className="expenses-item-amount" style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--danger)' }}>
                  -{formatUGX(expense.amount)}
                </span>
                {isAdmin && (
                  <button
                    className="expenses-item-delete"
                    onClick={() => setDeletingExpense(expense)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      color: 'var(--danger)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    DELETE
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
