import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useEffect, useState } from "react";
import AppModal from "../components/AppModal";
import SystemToast from "../components/SystemToast";
import BusinessQuotes from "../components/BusinessQuotes";
import ModeSelector from "../components/ModeSelector";
import { supabase } from "../supabaseClient";
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
  const { 
    userRole, 
    isAdmin, 
    logout, 
    isRefreshing, 
    enterAdminMode, 
    exitAdminMode, 
    shopState, 
    fetchData,
    businessMode,
    setBusinessMode,
    user,
    updateAdminPin,
  } = useAppState();
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showUpdatePinModal, setShowUpdatePinModal] = useState(false);
  const [showPinValues, setShowPinValues] = useState(false);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState(false);
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

  const handleRefresh = async () => {
    await fetchData();
    setNotice({ message: "Data refreshed.", type: "success" });
  };

  const handleRoleToggle = async () => {
    if (isAdmin) {
      exitAdminMode();
      navigate("/sales");
      setNotice({ message: "Admin access disabled. Returned to Staff mode.", type: "success" });
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
    setNotice({ message: "✅ Admin access granted. Dashboard, Expenses, and advanced features unlocked.", type: "success" });
    navigate("/dashboard");
  };

  const handleUpdatePinConfirm = async () => {
    if (newPin !== confirmPin) {
      setNotice({ message: "PINs do not match.", type: "error" });
      return;
    }
    if (newPin.length !== 6) {
      setNotice({ message: "PIN must be exactly 6 digits.", type: "error" });
      return;
    }

    setUpdating(true);
    const result = await updateAdminPin(newPin);
    setUpdating(false);

    if (result.ok) {
      setShowUpdatePinModal(false);
      setNewPin("");
      setConfirmPin("");
      setNotice({ message: "✅ Admin PIN updated successfully.", type: "success" });
    } else {
      setNotice({ message: result.message, type: "error" });
    }
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
        title="Unlock Admin Access"
        onCancel={() => setShowPinModal(false)}
        onConfirm={handlePinConfirm}
        confirmLabel={verifying ? "Verifying..." : "Unlock Admin"}
        confirmDisabled={verifying}
      >
        <div style={{ marginBottom: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
          Admin access grants: Dashboard, Expenses, Sales Returns, Delete Sessions
        </div>
        <input
          type={showPinValues ? "text" : "password"}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit PIN"
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

      <AppModal
        open={showUpdatePinModal}
        title="Change Admin PIN"
        onCancel={() => setShowUpdatePinModal(false)}
        onConfirm={handleUpdatePinConfirm}
        confirmLabel={updating ? "Updating..." : "Update PIN"}
        confirmDisabled={updating || newPin.length !== 6 || confirmPin.length !== 6}
      >
        <div style={{ marginBottom: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
          Set a new 6-digit PIN to secure your Admin functions.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter New 6-digit PIN"
            inputMode="numeric"
            className="pin-input"
          />
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Confirm New 6-digit PIN"
            inputMode="numeric"
            className="pin-input"
          />
        </div>
      </AppModal>

      <header className="main-header">
        <h1>SMART<span>RETAIL</span></h1>
        <div className="header-actions">
          {canInstall() && (
            <button onClick={triggerInstall} className="unified-btn btn-install">
              📱 Install
            </button>
          )}
          <ModeSelector 
            currentMode={businessMode} 
            onModeChange={async (mode) => {
              setBusinessMode(mode);
              // Save to DB
              const { error } = await supabase
                .from("business_modes")
                .upsert({ user_id: user?.id, primary_mode: mode })
                .eq("user_id", user?.id);
              
              if (!error) {
                setNotice({ message: `Operating mode: ${mode.toUpperCase()}`, type: "success" });
              }
            }}
          />
          <button 
            className={isAdmin ? "unified-btn btn-admin-active-pill" : "unified-btn btn-admin-unlock"} 
            onClick={handleRoleToggle}
            aria-label={isAdmin ? "Exit admin access" : "Enter admin access with PIN"}
            title={isAdmin ? "Disable Admin Access" : "Enable Admin Access (Dashboard, Expenses, Returns)"}
          >
            {isAdmin ? "🔐 Admin (Exit)" : "🔓 Admin"}
          </button>
          <button onClick={handleRefresh} className="unified-btn btn-refresh">
            🔄 Refresh
          </button>
          <button onClick={handleLogout} className="unified-btn btn-logout">
            🚪 Logout
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
        {isAdmin && (
          <NavLink
            to="/expenses"
            className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}
          >
            Expenses
          </NavLink>
        )}
        {isAdmin && (
          <NavLink
            to="/pnl"
            className={({ isActive }) => (isActive ? "active-nav-btn nav-link-btn" : "nav-link-btn")}
          >
            P&L
          </NavLink>
        )}
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
        {isAdmin && (
          <button 
            className="unified-btn nav-link-btn btn-change-pin" 
            onClick={() => setShowUpdatePinModal(true)}
            style={{ border: '1px solid var(--neon-purple)', color: 'var(--neon-purple)' }}
          >
            Change PIN
          </button>
        )}
      </nav>

      {isRefreshing && <p className="sync-indicator">Syncing latest data...</p>}
      <main className="glass-card">
        <Outlet />
      </main>
    </div>
  );
}