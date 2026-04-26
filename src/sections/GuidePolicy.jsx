export default function GuidePolicy() {
  return (
    <div className="section app-guide glass-card">
      <h2 className="section-title">SMART RETAIL - App Policy & User Guide</h2>
      <p className="app-guide-subtitle">Complete guide for efficient retail management and daily operations</p>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🏪 Welcome to SMART RETAIL</h4>
        <p className="app-guide-text">
          SMART RETAIL is a comprehensive retail management system designed to help you manage daily sales, stock inventory, customer debts, supplier credits, and business insights with precision and ease. This system provides real-time tracking of all business operations, ensuring accurate financial records and streamlined workflow for both staff and administrators.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🔐 User Roles & Access Control</h4>
        <p className="app-guide-text">
          <strong>Staff Mode:</strong> Default access level for daily operations including sales recording, stock viewing, and basic functions.<br/><br/>
          <strong>Admin Mode:</strong> Advanced access requiring a 6-digit PIN for complete system control including dashboard access, stock management, sales returns, and system administration. The admin PIN is centrally managed by the app owner for security and control.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📋 Daily Operations Guide</h4>
        <p className="app-guide-text">
          <strong>Sales Management:</strong> Record every transaction immediately using the intuitive sales interface. Select products, specify quantities (use fraction buttons for partial sales), and complete transactions with real-time stock updates.<br/><br/>
          <strong>Stock Management:</strong> Add new inventory items with accurate measurements and pricing. Admins can delete stock entries and manage inventory levels.<br/><br/>
          <strong>Financial Tracking:</strong> Monitor customer debts and supplier credits with complete payment history and balance tracking.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🎯 Key Features</h4>
        <ul className="app-guide-list">
          <li><strong>Real-time Sales:</strong> Instant recording and tracking of all transactions</li>
          <li><strong>Smart Inventory:</strong> Automatic stock deduction with each sale</li>
          <li><strong>Fraction Sales:</strong> Quick buttons for 1/4, 1/2, 3/4, and whole unit sales</li>
          <li><strong>Financial Management:</strong> Complete debt and creditor tracking</li>
          <li><strong>Admin Dashboard:</strong> Comprehensive business insights and analytics</li>
          <li><strong>PDF Reports:</strong> Automated daily sales reports with detailed breakdowns</li>
          <li><strong>Data Backup:</strong> Secure backup and restore functionality</li>
          <li><strong>Mobile Optimized:</strong> Responsive design for all devices</li>
        </ul>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📊 Admin Functions</h4>
        <p className="app-guide-text">
          Admin users have exclusive access to advanced features including business analytics dashboard, stock management, sales returns, data backup/restore, and system administration. The CLOSE SHOP button generates comprehensive PDF reports and manages daily business cycles.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">⚡ Quick Rules & Best Practices</h4>
        <ul className="app-guide-list">
          <li>Record every sale immediately - no batch processing</li>
          <li>Use accurate measurements and pricing for all stock items</li>
          <li>Maintain complete debtor and creditor records with dates</li>
          <li>Admins should perform regular data backups</li>
          <li>Review dashboard metrics daily for business insights</li>
          <li>Protect admin PIN and log out when unattended</li>
          <li>Use fraction buttons for partial unit sales efficiency</li>
          <li>Keep stock levels accurate for proper inventory management</li>
        </ul>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">🔄 System Features</h4>
        <p className="app-guide-text">
          <strong>Refresh Function:</strong> Use the refresh button to reload the application and sync latest data.<br/><br/>
          <strong>Role Switching:</strong> Toggle between Staff and Admin modes with secure PIN authentication.<br/><br/>
          <strong>Responsive Design:</strong> Optimized for mobile, tablet, and desktop devices.<br/><br/>
          <strong>Real-time Sync:</strong> All data updates sync immediately across the system.
        </p>
      </div>

      <div className="app-guide-card">
        <h4 className="app-guide-heading">📞 Support & Help</h4>
        <p className="app-guide-text">
          For technical support and assistance, contact our support team through the helpline numbers available in the admin dashboard. Our team is ready to help you maximize the benefits of SMART RETAIL for your business success.
        </p>
      </div>
    </div>
  );
}
