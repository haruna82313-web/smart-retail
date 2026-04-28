export default function GuidePolicy() {
  return (
    <div className="section app-guide glass-card">
      <h2 className="section-title">SMART RETAIL - App Policy & User Guide</h2>
      <p className="app-guide-subtitle">Complete guide for dual-mode (Retail & Wholesale) operations</p>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🏪 Welcome to SMART RETAIL</h4>
        <p className="app-guide-text">
          SMART RETAIL is a next-generation POS system designed for businesses that operate in both <strong>Retail</strong> and <strong>Wholesale</strong> environments. 
          It features real-time stock syncing, automated profit calculations, and comprehensive financial tracking for a complete business overview.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🔄 Operating Modes</h4>
        <p className="app-guide-text">
          <strong>🛒 Retail Mode:</strong> Standard pricing for end-consumers. The system uses the default retail price for all items.<br/><br/>
          <strong>📦 Wholesale Mode:</strong> Advanced pricing for retailers and distributors. This mode enables tier-based pricing (Retailer vs. Distributor) and allows for custom unit price overrides during checkout.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🔐 Access Control (Admin vs. Staff)</h4>
        <p className="app-guide-text">
          <strong>Staff Level:</strong> Can perform daily sales, view stock levels, and record customer debts/creditors. Access is restricted to operational tasks only.<br/><br/>
          <strong>Admin Level (PIN Protected):</strong> Required for sensitive operations including deleting sales (returns), managing expenses, viewing the Profit & Loss (P&L) dashboard, and editing stock pricing tiers.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📋 Core Modules Guide</h4>
        <p className="app-guide-text">
          <strong>1. Sales Checkout:</strong> Search for items, set quantities, and select customer types in Wholesale mode. Real-time stock deduction occurs upon successful sync.<br/><br/>
          <strong>2. Stock Management:</strong> Maintain inventory with accurate cost prices and multi-tier selling prices. Ensure "Pricing Tiers" are set for wholesale items.<br/><br/>
          <strong>3. Debt & Credit:</strong> Track customer balances and supplier payments. Record partial payments to maintain accurate historical logs.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📊 Financials & P&L</h4>
        <p className="app-guide-text">
          The <strong>Profit & Loss (P&L)</strong> widget provides a deep dive into your business health by calculating:
          <br/>• <strong>Revenue:</strong> Total sales income.
          <br/>• <strong>COGS:</strong> Cost of Goods Sold based on buying prices.
          <br/>• <strong>Expenses:</strong> Daily operational costs (Rent, Wages, Transport, etc.).
          <br/>• <strong>Net Profit:</strong> Final earnings after all deductions and discounts.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">⚡ Best Practices</h4>
        <ul className="app-guide-list">
          <li><strong>Sync Status:</strong> Always wait for the "Synced to cloud" status before closing the app.</li>
          <li><strong>Close Shop:</strong> Use the "Close Shop" function daily to archive sales and reset the dashboard for a new business day.</li>
          <li><strong>Expense Tracking:</strong> Record every expense as it happens to ensure accurate net profit metrics.</li>
          <li><strong>PIN Security:</strong> Never share the 6-digit Admin PIN with unauthorized staff.</li>
        </ul>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📱 Installation (PWA)</h4>
        <p className="app-guide-text">
          Use the <strong>Install</strong> button in the header to add SMART RETAIL to your home screen. This provides a faster, app-like experience with offline support for basic navigation.
        </p>
      </div>
    </div>
  );
}
