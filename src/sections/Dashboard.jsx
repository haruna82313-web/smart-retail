import React, { useRef } from "react";
import { supabase } from "../supabaseClient";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import AppModal from "../components/AppModal";
import SystemToast from "../components/SystemToast";
import DiscountTracker from "../components/DiscountTracker";
import { useAppState } from "../state/AppStateContext";

export default function Dashboard({ data, refresh }) {
  const { 
    user, 
    shopState, 
    setShopOpenState, 
    closeShopAndCleanup,
    isAdmin,
    discounts,
    expenses, // Need expenses for true Net Profit
    addDiscount,
    deleteDiscount,
  } = useAppState();
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
  const totalCogs = sales.reduce((acc, s) => acc + Number(s.cost_price || 0), 0);
  
  const discountsGiven = discounts
    .filter(d => d.discount_type === "given_to_customer" || d.type === "given_to_customer")
    .reduce((acc, d) => acc + Number(d.amount || 0), 0);
    
  const discountsReceived = discounts
    .filter(d => d.discount_type === "received_from_supplier" || d.type === "received_from_supplier")
    .reduce((acc, d) => acc + Number(d.amount || 0), 0);
    
  const totalExpenses = (expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // NET PROFIT = Revenue - COGS - Discounts Given + Discounts Received - Expenses
  const totalProfit = totalRevenue - totalCogs - discountsGiven + discountsReceived - totalExpenses;
  
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
    
    // --- Header ---
    doc.setFillColor(18, 32, 59); // var(--bg-slate)
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("SMART RETAIL", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("PROFIT & LOSS INTELLIGENCE REPORT", 105, 30, { align: "center" });

    // --- P&L Section ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("1. FINANCIAL SUMMARY (P&L)", 14, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [["Financial Metric", "Amount (UGX)"]],
      body: [
        ["Total Revenue", Number(totalRevenue).toLocaleString()],
        ["Cost of Goods Sold (COGS)", Number(totalCogs).toLocaleString()],
        ["Expenses", Number(totalExpenses).toLocaleString()],
        ["Discounts Given", Number(discountsGiven).toLocaleString()],
        ["Discounts Received", Number(discountsReceived).toLocaleString()],
        ["NET PROFIT", Number(totalProfit).toLocaleString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 240, 252], textColor: [0, 0, 0] }, // Neon Cyan
      alternateRowStyles: { fillColor: [240, 249, 255] },
      styles: { fontSize: 11, cellPadding: 5 }
    });

    // --- Performance Section ---
    doc.setFontSize(14);
    doc.text("2. PERFORMANCE INSIGHTS", 14, doc.lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [["Performance Indicator", "Data"]],
      body: [
        ["Uncollected Customer Debt", formatUGX(totalDebt)],
        ["Low Stock Items", `${lowStockCount} items`],
        ["Total Sales Recorded", `${rows.length} rows`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [45, 212, 191], textColor: [0, 0, 0] }, // Accent Teal
    });

    // --- Footer ---
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${reportDate} ${new Date().toLocaleTimeString()}`, 105, 285, { align: "center" });
    doc.text("Automated Business Intelligence by SMART RETAIL", 105, 290, { align: "center" });

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
    <div className="section dashboard-page">
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

      <div className="dashboard-header">
        <h2 className="section-title">📊 Admin Intelligence</h2>
        <p className="section-subtitle">Comprehensive overview of your shop performance.</p>
      </div>

      <div className="dashboard-grid">
        {/* --- 💎 1. STATS GRID --- */}
        <div className="stats-grid">
          <div className="stat-card revenue">
            <small>Total Revenue</small>
            <h3>{formatUGX(totalRevenue)}</h3>
            <div className="stat-glow"></div>
          </div>

          <div className="stat-card profit">
            <small>Net Profit</small>
            <h3>{formatUGX(totalProfit)}</h3>
            <div className="stat-glow"></div>
          </div>

          <div className="stat-card debt">
            <small>Customer Debt</small>
            <h3>{formatUGX(totalDebt)}</h3>
            <div className="stat-glow"></div>
          </div>

          <div className="stat-card stock-alert">
            <small>Low Stock</small>
            <h3 style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'inherit' }}>{lowStockCount} Items</h3>
            <div className="stat-glow"></div>
          </div>
        </div>

        {/* --- 🏆 2. TOP PERFORMERS --- */}
        <div className="top-performers-card glass-card">
          <h3 className="card-title">🔝 Top Profit Varieties</h3>
          <div className="performers-list">
            {topItems.length === 0 ? (
              <p className="empty-msg">No sales recorded yet.</p>
            ) : (
              topItems.map(([name, stats]) => (
                <div key={name} className="performer-item">
                  <div className="performer-info">
                    <span className="performer-name">{name}</span>
                    <span className="performer-meta">{stats.units.toFixed(1)} units sold</span>
                  </div>
                  <span className="performer-value">+{formatUGX(stats.profit)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- 🛠️ 3. OPERATIONAL ACTIONS --- */}
        <div className="actions-card glass-card">
          <h3 className="card-title">🛠️ Shop Operations</h3>
          <div className="action-buttons">
            <button
              onClick={() => handleCloseShop({ auto: false })}
              className="action-btn-main close-shop"
            >
              Close Business Day
            </button>
            <button onClick={exportPDF} className="action-btn-secondary pdf-btn">
              Download PDF Report
            </button>
            <div className="backup-restore-row">
              <button className="action-btn-mini" onClick={backupData}>📤 Backup Data</button>
              <button className="action-btn-mini" onClick={() => fileInputRef.current.click()}>📥 Restore Data</button>
            </div>
          </div>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={restoreData} accept=".json" />
        </div>
      </div>

      {/* --- 3️⃣ ADMIN: DISCOUNTS TRACKER --- */}
      {isAdmin && (
        <div className="discounts-section glass-card">
          <DiscountTracker
            discounts={discounts}
            onAddDiscount={addDiscount}
            onDeleteDiscount={deleteDiscount}
            onRefresh={refresh}
          />
        </div>
      )}

      {/* --- 📞 4. SUPPORT --- */}
      <div className="support-section">
        <h4 className="support-title">📞 Need Technical Assistance?</h4>
        <div className="support-actions" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => window.open('tel:0752333216')} className="support-btn">Call Support 1</button>
          <button onClick={() => window.open('tel:0745401444')} className="support-btn">Call Support 2</button>
        </div>
      </div>
    </div>
  );
}
