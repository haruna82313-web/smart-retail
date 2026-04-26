import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useEffect, useState } from "react";
import AppModal from "../components/AppModal";
import SystemToast from "../components/SystemToast";
import BusinessQuotes from "../components/BusinessQuotes";
import { triggerInstall, canInstall } from "../utils/pwaInstall";

/* 🔥 NEW: motivational quotes pool */
const motivationalQuotes = [
  "Execution is all that matters.",
  "Small daily improvements lead to big results.",
  "Discipline builds empires.",
  "Sales cure everything.",
  "Focus on progress, not perfection.",
  "Consistency beats intensity.",
  "Your business grows when you do.",
  "Action creates opportunity."
];

export default function AppLayout() {
  const { userRole, isAdmin, logout, isRefreshing, enterAdminMode, exitAdminMode, shopState } = useAppState();
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPinValues, setShowPinValues] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [quoteDraft, setQuoteDraft] = useState("");
  const [shopQuote, setShopQuote] = useState(
    "Execution is all that matters."
  );

  useEffect(() => {
    const savedQuote = window.localStorage.getItem("smart-retail-shop-quote");
    if (savedQuote) {
      setShopQuote(savedQuote);
      setQuoteDraft(savedQuote);
      return;
    }
    setQuoteDraft("Execution is all that matters.");
  }, []);

  /* 🔥 NEW: auto-rotate quotes every 2 minutes (only if user hasn't set one) */
  useEffect(() => {
    const savedQuote = window.localStorage.getItem("smart-retail-shop-quote");
    if (savedQuote) return;

    const interval = setInterval(() => {
      setShopQuote((prev) => {
        let next;
        do {
          next = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        } while (next === prev);
        return next;
      });
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleRoleToggle = async () => {
    if (isAdmin) {
      exitAdminMode();
      navigate("/sales");
      setNotice({ message: "Switched to Staff mode.", type: "success" });
      return;
    }
    setPin("");
    setShowPinModal(true);
  };

  const handlePinConfirm = async () => {
    setVerifying(true);
    const result = await enterAdminMode(pin);
    setVerifying(false);
    if (!result.ok) {
      setNotice({ message: result.message, type: "error" });
      return;
    }
    setShowPinModal(false);
    setNotice({ message: result.message, type: "success" });
    navigate("/dashboard");
  };

  

  const saveShopQuote = () => {
    const nextQuote = quoteDraft.trim();
    if (!nextQuote) {
      setNotice({ message: "Quote cannot be empty.", type: "error" });
      return;
    }
    setShopQuote(nextQuote);
    window.localStorage.setItem("smart-retail-shop-quote", nextQuote);
    setNotice({ message: "Motivation quote updated.", type: "success" });
  };

  return (
    <div className="app-viewport">
      <SystemToast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "info" })}
      />
      <AppModal
        open={showPinModal}
        title="Enter 6-digit Admin PIN"
        onCancel={() => setShowPinModal(false)}
        onConfirm={handlePinConfirm}
        confirmLabel={verifying ? "Verifying..." : "Unlock Admin"}
        confirmDisabled={verifying}
      >
        <input
          type={showPinValues ? "text" : "password"}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter PIN"
          inputMode="numeric"
        />
        <button
          type="button"
          className="pin-visibility-toggle"
          onClick={() => setShowPinValues((prev) => !prev)}
        >
          {showPinValues ? "Hide PIN" : "Show PIN"}
        </button>
      </AppModal>

      <header className="main-header">
        <h1>SMART<span>RETAIL</span></h1>
        <div className="header-actions">
          {canInstall() && (
            <button onClick={triggerInstall} className="btn-admin-idle header-install-btn">
              📱 Install App
            </button>
          )}
          <button className={isAdmin ? "btn-admin-active role-pill header-role-toggle-btn" : "btn-admin-idle role-pill header-role-toggle-btn"} onClick={handleRoleToggle}>
            {isAdmin ? "🔒 Admin (Switch)" : "👤 Staff (Switch)"}
          </button>
          <button onClick={handleRefresh} className="btn-admin-idle header-refresh-btn">
            🔄 Refresh
          </button>
          <button onClick={handleLogout} className="btn-admin-idle header-logout-btn">
            Logout
          </button>
        </div>
      </header>

      <BusinessQuotes />

      <nav className="nav-bar">
        <NavLink to="/sales" className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}>
          Sales
        </NavLink>
        <NavLink to="/stock" className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}>
          Stock
        </NavLink>
        <NavLink to="/debts" className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}>
          Debts
        </NavLink>
        <NavLink
          to="/creditors"
          className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}
        >
          Creditors
        </NavLink>
        <NavLink
          to="/payment-history"
          className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}
        >
          Guide
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}
          >
            Dashboard
          </NavLink>
        )}
      </nav>

      {isRefreshing && <p className="sync-indicator">Syncing latest data...</p>}
      <main className="glass-card">
        <Outlet />
      </main>
    </div>
  );
}