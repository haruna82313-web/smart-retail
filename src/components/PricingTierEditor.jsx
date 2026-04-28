import { useState } from "react";

/**
 * PricingTierEditor
 * Allows admin to set/edit tiered pricing for products
 * Used in Stock component
 */
export default function PricingTierEditor({ productName = "", currentTiers = {}, onSaveTiers }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tiers, setTiers] = useState(
    currentTiers || {
      retail: { unit_price: "", min_qty: 1, description: "Individual/Small Retail" },
      wholesale_retailer: { unit_price: "", min_qty: 11, description: "Retailers (Bulk)" },
      wholesale_distributor: { unit_price: "", min_qty: 50, description: "Distributors (Large)" },
    }
  );

  const handleTierChange = (tierKey, field, value) => {
    setTiers((prev) => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        [field]: field === "unit_price" || field === "min_qty" ? Number(value) || "" : value,
      },
    }));
  };

  const handleSave = () => {
    const valid = Object.values(tiers).every((t) => t.unit_price > 0 && t.min_qty >= 1);
    if (!valid) {
      alert("All tiers must have positive price and qty");
      return;
    }
    onSaveTiers?.(tiers);
    setIsOpen(false);
  };

  return (
    <div className="pricing-tier-editor-container">
      <button
        className="pricing-tier-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Edit pricing tiers"
      >
        💰 Pricing Tiers
      </button>

      {isOpen && (
        <div className="pricing-tier-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="pricing-tier-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pricing Tiers for {productName}</h3>

            <div className="tier-grid">
              {Object.entries(tiers).map(([tierKey, tierData]) => (
                <div key={tierKey} className="tier-card">
                  <div className="tier-header">{tierData.description}</div>

                  <div className="tier-field">
                    <label>Unit Price (UGX)</label>
                    <input
                      type="number"
                      value={tierData.unit_price}
                      onChange={(e) => handleTierChange(tierKey, "unit_price", e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="tier-field">
                    <label>Minimum Quantity</label>
                    <input
                      type="number"
                      value={tierData.min_qty}
                      onChange={(e) => handleTierChange(tierKey, "min_qty", e.target.value)}
                      placeholder="1"
                      min="1"
                      disabled={tierKey === "retail"}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pricing-tier-actions">
              <button className="btn-primary" onClick={handleSave}>
                Save Tiers
              </button>
              <button className="btn-secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
