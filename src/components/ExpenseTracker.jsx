import { useState } from "react";

/**
 * ExpenseTracker
 * Track daily operating expenses
 * Admin-only for visibility and delete permission
 * Shows summary in dashboard for all users
 */
export default function ExpenseTracker({ expenses = [], isAdmin = false, onAddExpense, onDeleteExpense }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "salaries",
    amount: "",
    description: "",
  });

  const expenseTypes = [
    { value: "salaries", label: "💼 Salaries" },
    { value: "utilities", label: "⚡ Utilities (Electricity, Water)" },
    { value: "taxes", label: "📋 Taxes" },
    { value: "transport", label: "🚚 Transport/Fuel" },
    { value: "discounts_given", label: "🎁 Discounts Given to Customers" },
    { value: "depreciation", label: "📉 Depreciation" },
    { value: "drawings", label: "💸 Drawings (Personal Expenses)" },
    { value: "other", label: "📌 Other" },
  ];

  const getTypeLabel = (type) => expenseTypes.find((t) => t.value === type)?.label || type;

  const handleSubmit = async () => {
    if (!form.amount || form.amount <= 0) {
      alert("Enter a valid amount");
      return;
    }
    await onAddExpense?.({ ...form, amount: Number(form.amount) });
    setForm({ date: new Date().toISOString().split("T")[0], type: "salaries", amount: "", description: "" });
    setIsOpen(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const formatUGX = (n) => "UGX " + Number(n || 0).toLocaleString();
  const formatDate = (dateStr) => new Date(dateStr + "T00:00:00").toLocaleDateString("en-UG", { month: "short", day: "numeric" });

  if (!isAdmin) {
    // Non-admin users only see expense summary
    return (
      <div className="expense-summary-card">
        <h4>Operating Expenses (Summary)</h4>
        <div className="expense-total">{formatUGX(totalExpenses)}</div>
        <p className="text-muted">Admin can view full details</p>
      </div>
    );
  }

  return (
    <div className="expense-tracker-container">
      <div className="expense-header">
        <h3>Operating Expenses</h3>
        <button className="btn-add-expense" onClick={() => setIsOpen(!isOpen)}>
          + Add Expense
        </button>
      </div>

      {isOpen && (
        <div className="expense-form-card">
          <h4>Record Expense</h4>

          <div className="form-grid">
            <div>
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {expenseTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Amount (UGX)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="E.g., Staff monthly payment, January electricity bill..."
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSubmit}>
              Save Expense
            </button>
            <button className="btn-secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="expense-list">
        <div className="expense-list-header">
          <div className="col-date">Date</div>
          <div className="col-type">Type</div>
          <div className="col-amount">Amount</div>
          <div className="col-desc">Description</div>
          <div className="col-actions">Action</div>
        </div>

        {expenses.length === 0 ? (
          <p className="text-muted">No expenses recorded yet</p>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="expense-list-row">
              <div className="col-date">{formatDate(expense.recorded_date || expense.date)}</div>
              <div className="col-type">{getTypeLabel(expense.expense_type || expense.type)}</div>
              <div className="col-amount">{formatUGX(expense.amount)}</div>
              <div className="col-desc">{expense.description || "—"}</div>
              <div className="col-actions">
                <button
                  className="btn-delete"
                  onClick={() => {
                    if (confirm("Delete this expense?")) {
                      onDeleteExpense?.(expense.id);
                    }
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="expense-summary">
        <strong>Total Expenses: {formatUGX(totalExpenses)}</strong>
      </div>
    </div>
  );
}
