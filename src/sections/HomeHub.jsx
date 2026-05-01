import { NavLink, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useState } from "react";
import AppModal from "../components/AppModal";

const IconSales = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);

const IconStock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);

const IconPNL = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);

const IconExpenses = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
  </svg>
);

const IconDebts = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
  </svg>
);

const IconCreditors = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="12" x2="12.01" y1="12" y2="12"/>
  </svg>
);

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);

const IconPlan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

export default function HomeHub() {
  const { isAdmin, isTrialExpired } = useAppState();
  const navigate = useNavigate();
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const handleButtonClick = (to) => {
    if (isTrialExpired && to !== "/subscription") {
      setShowExpiredModal(true);
    } else {
      navigate(to);
    }
  };

  const isButtonDisabled = (to) => {
    if (to === "/subscription") return false;
    return isTrialExpired;
  };

  return (
    <div className="mobile-hub-container">
      <div className="mobile-grid-dashboard">
        {/* Row 1: Primary */}
        <button 
          onClick={() => handleButtonClick("/sales")}
          className={`grid-btn grid-btn-sales ${isButtonDisabled("/sales") ? "disabled" : ""}`}
        >
          <IconSales />
          <span>Sales</span>
        </button>
        <button 
          onClick={() => handleButtonClick("/stock")}
          className={`grid-btn grid-btn-stock ${isButtonDisabled("/stock") ? "disabled" : ""}`}
        >
          <IconStock />
          <span>Stock</span>
        </button>

        {/* Row 2: Financials */}
        <button 
          onClick={() => handleButtonClick("/pnl")}
          className={`grid-btn grid-btn-pnl ${isAdmin ? "" : "disabled"} ${isButtonDisabled("/pnl") ? "disabled" : ""}`}
        >
          <IconPNL />
          <span>P&L</span>
        </button>
        <button 
          onClick={() => handleButtonClick("/expenses")}
          className={`grid-btn grid-btn-expenses ${isAdmin ? "" : "disabled"} ${isButtonDisabled("/expenses") ? "disabled" : ""}`}
        >
          <IconExpenses />
          <span>Expenses</span>
        </button>

        {/* Row 3: Management */}
        <button 
          onClick={() => handleButtonClick("/debts")}
          className={`grid-btn grid-btn-debts ${isButtonDisabled("/debts") ? "disabled" : ""}`}
        >
          <IconDebts />
          <span>Debts</span>
        </button>
        <button 
          onClick={() => handleButtonClick("/creditors")}
          className={`grid-btn grid-btn-creditors ${isButtonDisabled("/creditors") ? "disabled" : ""}`}
        >
          <IconCreditors />
          <span>Creditors</span>
        </button>

        {/* Row 4: Admin & Subscription */}
        <button 
          onClick={() => handleButtonClick("/dashboard")}
          className={`grid-btn grid-btn-dashboard ${isAdmin ? "" : "disabled"} ${isButtonDisabled("/dashboard") ? "disabled" : ""}`}
        >
          <IconDashboard />
          <span>Dashboard</span>
        </button>
        <button 
          onClick={() => handleButtonClick("/subscription")}
          className="grid-btn grid-btn-plan"
        >
          <IconPlan />
          <span>Plan</span>
        </button>
      </div>

      <div className="mobile-hub-footer">
        <NavLink to="/payment-history" className="hub-footer-link">
          Guide &gt;
        </NavLink>
      </div>

      <AppModal
        open={showExpiredModal}
        title="Trial Period Expired"
        onCancel={() => setShowExpiredModal(false)}
        onConfirm={() => {
          setShowExpiredModal(false);
          navigate("/subscription");
        }}
        confirmLabel="Activate Plan"
        cancelLabel="Close"
      >
        <p>Your free trial period has expired. Please activate your plan to continue using SMART RETAIL features.</p>
      </AppModal>
    </div>
  );
}
