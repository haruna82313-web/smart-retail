import React, { useRef } from "react";
import { supabase } from "../supabaseClient";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import AppModal from "../components/AppModal";
import SystemToast from "../components/SystemToast";
import { useAppState } from "../state/AppStateContext";

export default function Dashboard({ data, refresh }) {
  const { user, shopState, setShopOpenState, closeShopAndCleanup } = useAppState();
  const fileInputRef = useRef(null);
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);
  
  const formatUGX = (num) => "UGX " + Number(num || 0).toLocaleString();

  const formatLocalTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const sales = data?.sales || [];
  const stock = data?.stock || [];
  const debts = data?.debts || [];

  // --- 📈 MATH LOGIC ---
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.price || 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + Number(s.profit || 0), 0);
  const totalDebt = debts.reduce((acc, d) => acc + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);
  const lowStockCount = stock.filter(s => Number(s.quantity || 0) <= 5).length;

  const topItems = Object.entries(
    sales.reduce((acc, sale) => {
      const key = sale.item;
      if (!acc[key]) acc[key] = { profit: 0, units: 0 };
      acc[key].profit += Number(sale.profit || 0);
      acc[key].units += Number(sale.quantity || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.profit - a.profit).slice(0, 5);

  // --- 📄 ACTIONS ---
  const getDailyReportRows = () => {
    // Get all sales for the current day (from last shop open)
    return sales.filter((row) => {
      const createdAt = row?.created_at ? new Date(row.created_at) : null;
      return createdAt; // Return all sales for current business day
    });
  };

  const exportPDF = (rows = sales, filenamePrefix = "Report") => {
    if (!rows || rows.length === 0) {
      setNotice({ message: "No sales data found to generate a report.", type: "warning" });
      return;
    }
    
    const doc = new jsPDF();
    const reportDate = new Date().toLocaleDateString();
    doc.text("Business Performance Report", 14, 20);
    doc.text(`Date: ${reportDate}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [["Metric", "Value"]],
      body: [
        ["Total Revenue", formatUGX((rows || []).reduce((acc, s) => acc + Number(s.price || 0), 0))],
        ["Net Profit", formatUGX((rows || []).reduce((acc, s) => acc + Number(s.profit || 0), 0))],
        ["Uncollected Debt", formatUGX(totalDebt)],
        ["Sales Rows", (rows || []).length],
      ],
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Item", "Qty", "Unit", "Amount", "Time"]],
      body: rows.map((row) => [
        row.item || "-",
        Number(row.quantity || 0).toFixed(2),
        row.unit || "pcs",
        formatUGX(row.price || 0),
        formatLocalTime(row.created_at),
      ]),
    });

    doc.save(`${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleCloseShop = async ({ auto = false } = {}) => {
    try {
      const reportRows = getDailyReportRows();
      
      // Generate PDF first
      if (reportRows.length > 0) {
        exportPDF(reportRows, "Daily_Sales_Report");
      } else {
        setNotice({ message: "No sales data found for today. Shop closed without report.", type: "warning" });
      }
      
      // Then close shop and cleanup
      const result = await closeShopAndCleanup({ salesRows: reportRows, actorUserId: user?.id || null });
      if (!result.ok) {
        setNotice({ message: result.message || "Close shop failed.", type: "error" });
        return;
      }
      
      // Refresh data to show updated sales list
      await refresh();
      
      // Show appropriate success message
      let message = auto
        ? "Shop auto-closed at 22:00."
        : "Shop closed successfully.";
      
      if (reportRows.length > 0) {
        message += " Daily report downloaded.";
      }
      
      if (result.archived) {
        message += " Sales data archived.";
      } else {
        message += " Sales data preserved for next business day.";
      }
      
      setNotice({ message, type: "success" });
      
    } catch (err) {
      setNotice({ message: err.message || "Close shop failed.", type: "error" });
    }
  };

  
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dayKey = now.toISOString().slice(0, 10);
      const markerKey = `shop-auto-close-${dayKey}`;
      const alreadyTriggered = window.localStorage.getItem(markerKey) === "1";

      if (!shopState.isOpen || alreadyTriggered) return;
      if (hour > 22 || (hour === 22 && minute >= 0)) {
        window.localStorage.setItem(markerKey, "1");
        handleCloseShop({ auto: true });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [shopState.isOpen]);

  const backupData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const uri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const link = document.createElement("a");
    link.href = uri;
    link.download = `RETAIL_BACKUP_${new Date().toISOString()}.json`;
    link.click();
  };

  const restoreData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setPendingRestoreFile(file);
  };

  const confirmRestore = async () => {
    const file = pendingRestoreFile;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        for (const table of ["stock", "sales", "debts", "creditors"]) {
          if (json[table]) await supabase.from(table).upsert(json[table], { onConflict: 'id' });
        }
        setNotice({ message: "Restore successful.", type: "success" });
        window.location.reload();
      } catch (err) {
        setNotice({ message: "Restore failed: " + err.message, type: "error" });
      }
    };
    reader.readAsText(file);
    setPendingRestoreFile(null);
  };

  return (
    <div className="section dashboard glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <SystemToast message={notice.message} type={notice.type} onClose={() => setNotice({ message: "", type: "info" })} />
      <AppModal
        open={Boolean(pendingRestoreFile)}
        title="Confirm Restore"
        onCancel={() => setPendingRestoreFile(null)}
        onConfirm={confirmRestore}
        confirmLabel="Restore Backup"
      >
        Overwrite cloud data with this backup file?
      </AppModal>
      <h2 className="section-title admin-intelligence-title" style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '5px' }}>📊 Admin Intelligence</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>Overview of shop performance.</p>

      {/* --- 💎 1. STATS STACK --- */}
      <div className="dashboard-stats-stack" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--neon-cyan)' }}>
          <small>Total Revenue</small>
          <h3 style={{ fontSize: '1.5rem' }}>{formatUGX(totalRevenue)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-teal)' }}>
          <small>Net Profit</small>
          <h3 style={{ color: 'var(--accent-teal)', fontSize: '1.5rem' }}>{formatUGX(totalProfit)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <small>Customer Debt</small>
          <h3 style={{ color: 'var(--danger)', fontSize: '1.5rem' }}>{formatUGX(totalDebt)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px' }}>
          <small>Low Stock Items</small>
          <h3 style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'white', fontSize: '1.5rem' }}>{lowStockCount}</h3>
        </div>
      </div>

      {/* --- 🏆 2. TOP PERFORMERS --- */}
      <div className="dashboard-top-list" style={{ marginBottom: '40px' }}>
        <h4 style={{ marginBottom: '15px', color: 'var(--text-muted)', fontSize: '14px' }}>🔝 TOP PROFIT VARIETIES</h4>
        {topItems.map(([name, stats]) => (
          <div key={name} className="item-row dashboard-top-card" style={{ padding: '15px' }}>
            <div className="dashboard-top-main">
              <strong className="dashboard-top-name">{name}</strong> <br/>
              <small className="dashboard-top-meta" style={{ color: 'var(--text-muted)' }}>{stats.units.toFixed(1)} units sold</small>
            </div>
            <div className="dashboard-top-side" style={{ textAlign: "right" }}>
              <span className="dashboard-top-profit" style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>+{formatUGX(stats.profit)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- 🛠️ 3. ACTIONS --- */}
      <div className="dashboard-actions-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
        <button
          onClick={() => handleCloseShop({ auto: false })}
          className="shop-state-btn shop-close-btn"
          style={{ width: "100%", minHeight: "56px" }}
        >
          CLOSE SHOP
        </button>
        <button onClick={exportPDF} className="btn-pdf-theme" style={{ width: '100%', margin: '0' }}>
          📄 DOWNLOAD PDF REPORT
        </button>
        
        <div className="dashboard-actions-row" style={{ display: 'flex', gap: '10px' }}>
          <button className="dashboard-action-btn" onClick={backupData} style={{ flex: 1, height: '50px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-slate)' }}>📤 Backup</button>
          <button className="dashboard-action-btn" onClick={() => fileInputRef.current.click()} style={{ flex: 1, height: '50px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-slate)' }}>📥 Restore</button>
        </div>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={restoreData} accept=".json" />
      </div>

      {/* --- 📞 4. HELPLINES --- */}
      <div style={{ borderTop: '1px solid var(--border-slate)', paddingTop: '20px' }}>
        <h4 style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>📞 SUPPORT HELPLINES</h4>
        <div className="help-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p onClick={() => window.open('tel:0752333216')} style={{ padding: '12px', textAlign: 'center' }}>Call Tech Support 1</p>
          <p onClick={() => window.open('tel:0745401444')} style={{ padding: '12px', textAlign: 'center' }}>Call Tech Support 2</p>
        </div>
      </div>
    </div>
  );
}
