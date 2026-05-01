export default function GuidePolicy() {
  return (
    <div className="section app-guide glass-card">
      <h2 className="section-title">SMART RETAIL - App Policy & User Guide</h2>
      <p className="app-guide-subtitle">Complete guide for dual-mode (Retail & Wholesale) operations</p>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🏪 Welcome to SMART RETAIL</h4>
        <p className="app-guide-text">
          SMART RETAIL is a powerful business management suite designed for entrepreneurs who demand real-time insights. 
          It seamlessly handles both <strong>Retail</strong> (standard pricing) and <strong>Wholesale</strong> (bulk tier pricing) operations.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🔄 Operating Modes</h4>
        <p className="app-guide-text">
          <strong>🛒 Retail Mode:</strong> Use this for standard daily sales. The system automatically fetches the retail price for every item.<br/><br/>
          <strong>📦 Wholesale Mode:</strong> Perfect for bulk deals. You can choose between <em>Retailer</em> and <em>Distributor</em> pricing tiers, or even override prices manually during checkout for trusted clients.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">💳 Subscription & Activation</h4>
        <p className="app-guide-text">
          <strong>Standard Plan (UGX 55,000/Month):</strong> Unlocks all core business logic including P&L tracking, Debt management, and Wholesale tools.<br/><br/>
          <strong>How to Activate:</strong> 
          <br/>1. Pay the fee to <strong>0752333216 (Luzira Hellen)</strong> via Airtel Money.
          <br/>2. Go to the <strong>Plan</strong> button in your Hub.
          <br/>3. Copy the Transaction ID from your SMS and paste it into the <strong>Activate My Plan</strong> field.
          <br/>4. Once approved by the owner, your status will turn <strong>ACTIVE</strong>.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">� Admin Intelligence (Dashboard)</h4>
        <p className="app-guide-text">
          Your dashboard is the "brain" of your business. It tracks:
          <br/>• <strong>Net Profit:</strong> Automatically calculated as <em>Revenue - Cost - Expenses - Discounts</em>.
          <br/>• <strong>Debt Tracking:</strong> Monitor uncollected money from customers in real-time.
          <br/>• <strong>Low Stock Alerts:</strong> Items with 5 or fewer units are flagged for restocking.
          <br/>• <strong>Daily Close:</strong> Use the "Close Business Day" button to archive your data and download a professional PDF performance report.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">� Admin PIN & Security</h4>
        <p className="app-guide-text">
          Sensitive features like <strong>Expenses</strong>, <strong>P&L</strong>, and <strong>Deleting Sales</strong> are protected by a 6-digit Admin PIN. 
          To unlock these features, tap the hamburger menu and select <strong>Unlock Admin Mode</strong>. Never share your PIN with staff.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">� Daily Workflow Tips</h4>
        <ul className="app-guide-list">
          <li><strong>Real-time Sync:</strong> Ensure you have a stable internet connection for sales to sync to the cloud.</li>
          <li><strong>Expenses:</strong> Record every small expense (transport, meals, rent) to ensure your Net Profit is 100% accurate.</li>
          <li><strong>Backup:</strong> Regularly use the "Backup Data" button in the dashboard to keep a personal copy of your records.</li>
        </ul>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📱 Installation (PWA)</h4>
        <p className="app-guide-text">
          Use the <strong>Install App</strong> button in the side menu to add SMART RETAIL to your home screen. This provides a faster, full-screen experience just like a regular mobile app.
        </p>
      </div>
    </div>
  );
}
