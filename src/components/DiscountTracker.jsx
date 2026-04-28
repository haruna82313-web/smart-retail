import { useState } from "react";

export default function DiscountTracker({ discounts = [], isAdmin = false, onAddDiscount, onDeleteDiscount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "given_to_customer",
    amount: "",
    description: "",
  });

  const discountTypes = [
    { value: "given_to_customer", label: "🎁 Discount Given (Reduces Revenue)" },
    { value: "received_from_supplier", label: "✅ Discount Received (Reduces Cost)" },
  ];

  const getTypeLabel = (type) => discountTypes.find((t) => t.value === type)?.label || type;

  const handleSubmit = async () => {
    if (!form.amount || form.amount <= 0) {
      alert("Enter a valid amount");
      return;
    }
    await onAddDiscount?.({ ...form, amount: Number(form.amount) });
    setForm({ date: new Date().toISOString().split("T")[0], type: "given_to_customer", amount: "", description: "" });
    setIsOpen(false);
  };

  const formatUGX = (n) => "UGX " + Number(n || 0).toLocaleString();
  const formatDate = (dateStr) => new Date(dateStr + "T00:00:00").toLocaleDateString("en-UG", { month: "short", day: "numeric" });

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="discount-tracker-container">
      <div className="discount-header">
        <h3>Discounts Tracking</h3>
        <button className="btn-add-discount" onClick={() => setIsOpen(!isOpen)}>
          + Add Discount
        </button>
      </div>

      {isOpen && (
        <div className="discount-form-card">
          <h4>Record Discount</h4>

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
                {discountTypes.map((t) => (
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
              placeholder="E.g., Loyalty discount for bulk order, Easter sale..."
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSubmit}>
              Save Discount
            </button>
            <button className="btn-secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="discount-list">
        <div className="discount-list-header">
          <div className="col-date">Date</div>
          <div className="col-type">Type</div>
          <div className="col-amount">Amount</div>
          <div className="col-desc">Description</div>
          <div className="col-actions">Action</div>
        </div>

        {discounts.length === 0 ? (
          <p className="text-muted">No discounts recorded yet</p>
        ) : (
          discounts.map((discount) => (
            <div key={discount.id} className="discount-list-row">
              <div className="col-date">{formatDate(discount.recorded_date || discount.date)}</div>
              <div className="col-type">{getTypeLabel(discount.discount_type || discount.type)}</div>
              <div className="col-amount">{formatUGX(discount.amount)}</div>
              <div className="col-desc">{discount.description || "—"}</div>
              <div className="col-actions">
                <button
                  className="btn-delete"
                  onClick={() => {
                    if (confirm("Delete this discount entry?")) {
                      onDeleteDiscount?.(discount.id);
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
    </div>
  );
}
