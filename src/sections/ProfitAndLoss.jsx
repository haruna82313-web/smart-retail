import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";

export default function ProfitAndLoss({ data }) {
  const navigate = useNavigate();
  const { expenses: allExpenses, discounts: stateDiscounts } = useAppState();
  const [filterRange, setFilterRange] = useState("today"); // today, week, month, year, custom
  const [customDates, setCustomDates] = useState({ start: "", end: "" });
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);
  const [physicalCash, setPhysicalCash] = useState("");

  const formatUGX = (num) => "UGX " + Number(num || 0).toLocaleString();

  // --- 1. FILTERING LOGIC ---
  const filteredData = useMemo(() => {
    const now = new Date();
    let startLimit = new Date();
    startLimit.setHours(0, 0, 0, 0);

    if (filterRange === "week") {
      startLimit.setDate(now.getDate() - 7);
    } else if (filterRange === "month") {
      startLimit.setMonth(now.getMonth() - 1);
    } else if (filterRange === "year") {
      startLimit.setFullYear(now.getFullYear() - 1);
    } else if (filterRange === "custom") {
      if (customDates.start) startLimit = new Date(customDates.start);
    }

    let endLimit = new Date();
    if (filterRange === "custom" && customDates.end) {
      endLimit = new Date(customDates.end);
      endLimit.setHours(23, 59, 59, 999);
    }

    const filterByDate = (list, dateField) => list.filter(item => {
      const d = new Date(item[dateField]);
      return d >= startLimit && d <= endLimit;
    });

    return {
      sales: filterByDate(data?.sales || [], "created_at"),
      expenses: filterByDate(allExpenses || [], "recorded_date"),
      discounts: filterByDate(data?.discounts || stateDiscounts || [], "recorded_date")
    };
  }, [filterRange, customDates, data, allExpenses, stateDiscounts]);

  const { sales, expenses, discounts } = filteredData;
  const debts = data?.debts || [];
  const stock = data?.stock || [];

  // --- 2. CORE CALCULATIONS ---
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.price || 0), 0);
  const totalCogs = sales.reduce((acc, s) => acc + Number(s.cost_price || 0), 0);
  
  const discountsGiven = discounts
    .filter(d => String(d.discount_type || d.type || "").trim() === "given_to_customer")
    .reduce((acc, d) => acc + Number(d.amount || 0), 0);
    
  const discountsReceived = discounts
    .filter(d => String(d.discount_type || d.type || "").trim() === "received_from_supplier")
    .reduce((acc, d) => acc + Number(d.amount || 0), 0);
    
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  
  const netProfit = totalRevenue - totalCogs - discountsGiven + discountsReceived - totalExpenses;
  
  // --- 3. MARGINS & INDICATORS ---
  const grossMargin = totalRevenue > 0 ? (((totalRevenue - totalCogs) / totalRevenue) * 100).toFixed(1) : 0;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
  const isLowMargin = Number(netMargin) < 10 && totalRevenue > 0;

  // --- 4. CASH VS PAPER PROFIT ---
  // Total uncollected debt for the items sold in this period
  // (Simplification: using all current debts as uncollected revenue)
  const uncollectedRevenue = debts.reduce((acc, d) => acc + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);
  const realizedProfit = netProfit - uncollectedRevenue;

  // --- 5. TAX ESTIMATOR (UGANDA URA) ---
  const estimatedVAT = totalRevenue * 0.18; // 18% Standard VAT
  const estimatedWHT = totalRevenue > 1000000 ? totalRevenue * 0.06 : 0; // 6% WHT on large transactions

  // --- 6. EXPENSE BREAKDOWN ---
  const expenseBreakdown = expenses.reduce((acc, e) => {
    const type = e.expense_type || "Other";
    acc[type] = (acc[type] || 0) + Number(e.amount);
    return acc;
  }, {});

  const lowStockCount = (stock || []).filter((s) => Number(s.quantity || 0) <= 5).length;
  const totalDebt = debts.reduce((acc, d) => acc + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  return (
    <div className="section pnl glass-card">
      <h2 className="pnl-title" style={{ 
        fontSize: 'clamp(1.2rem, 5vw, 1.8rem)', 
        marginBottom: '5px', 
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        💰 Profit & Loss Statement
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>
        Detailed breakdown of your business performance.
      </p>

      {/* --- 1. DATE RANGE FILTERS (ORGANIZED) --- */}
      <div className="pnl-filters" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        marginBottom: '30px',
        padding: '20px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        border: '1px solid var(--border-slate)'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['today', 'week', 'month', 'year', 'custom'].map((range) => (
            <button
              key={range}
              onClick={() => setFilterRange(range)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: filterRange === range ? '1px solid var(--neon-cyan)' : '1px solid var(--border-slate)',
                background: filterRange === range ? 'rgba(15, 240, 252, 0.1)' : 'transparent',
                color: filterRange === range ? 'var(--neon-cyan)' : 'var(--text-muted)',
                fontSize: '12px',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {filterRange === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="date" 
              value={customDates.start} 
              onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
              style={{ fontSize: '12px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-slate)', color: '#fff', borderRadius: '4px' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input 
              type="date" 
              value={customDates.end} 
              onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
              style={{ fontSize: '12px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-slate)', color: '#fff', borderRadius: '4px' }}
            />
          </div>
        )}
      </div>

      {/* --- 2. KPI MARGIN CARDS (CLEAN & PRO) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          background: 'rgba(15, 240, 252, 0.05)', 
          border: '1px solid rgba(15, 240, 252, 0.2)', 
          textAlign: 'center' 
        }}>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>GROSS MARGIN</small>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--neon-cyan)', margin: 0 }}>{grossMargin}%</h3>
        </div>
        <div style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          background: isLowMargin ? 'rgba(251, 191, 36, 0.05)' : 'rgba(45, 212, 191, 0.05)', 
          border: isLowMargin ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(45, 212, 191, 0.2)', 
          textAlign: 'center' 
        }}>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>NET MARGIN</small>
          <h3 style={{ fontSize: '1.6rem', color: isLowMargin ? 'var(--accent-amber)' : 'var(--accent-teal)', margin: 0 }}>{netMargin}%</h3>
          {isLowMargin && <small style={{ color: 'var(--accent-amber)', fontSize: '10px', display: 'block', marginTop: '4px' }}>⚠️ Low Margin Alert</small>}
        </div>
      </div>

      {/* --- 3. DETAILED P&L TABLE (REVERTED STRUCTURE) --- */}
      <div style={{ 
        background: 'rgba(255,255,255,0.03)', 
        border: '1px solid var(--border-slate)', 
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '30px',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-slate)', height: '50px' }}>
              <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>Total Revenue</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatUGX(totalRevenue)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Cost of Goods Sold (COGS)</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--danger)' }}>-{formatUGX(totalCogs)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Discounts Given</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--danger)' }}>-{formatUGX(discountsGiven)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Discounts Received</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--accent-teal)' }}>+{formatUGX(discountsReceived)}</td>
            </tr>
            
            <tr 
              onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px', cursor: 'pointer', background: showExpenseBreakdown ? 'rgba(255,255,255,0.02)' : 'transparent' }}
            >
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                Operating Expenses {showExpenseBreakdown ? '▼' : '▶'}
              </td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--danger)' }}>-{formatUGX(totalExpenses)}</td>
            </tr>

            {showExpenseBreakdown && Object.entries(expenseBreakdown).map(([type, amount]) => (
              <tr key={type} style={{ background: 'rgba(255,255,255,0.01)', fontSize: '12px' }}>
                <td style={{ padding: '8px 12px 8px 30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>↳ {type}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: 'rgba(239, 68, 68, 0.7)' }}>{formatUGX(amount)}</td>
              </tr>
            ))}

            <tr style={{ borderTop: '2px solid var(--neon-cyan)', height: '60px', background: 'rgba(15, 240, 252, 0.05)' }}>
              <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: '1.1rem' }}>NET PROFIT (Paper)</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: netProfit >= 0 ? 'var(--accent-teal)' : 'var(--danger)' }}>
                {formatUGX(netProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- 4. CASHFLOW & RECONCILIATION (NEAT & ORGANISED) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ 
          padding: '25px', 
          borderRadius: '16px', 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
          border: '1px solid var(--border-slate)'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--accent-amber)', fontSize: '14px', fontWeight: 'bold' }}>💵 CASHFLOW ANALYSIS</h4>
          <div 
            onClick={() => navigate('/debts')}
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Uncollected Debts 🔗</span>
            <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>-{formatUGX(uncollectedRevenue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>REALIZED CASH</span>
            <span style={{ fontWeight: 'bold', color: realizedProfit >= 0 ? 'var(--accent-teal)' : 'var(--danger)', fontSize: '1.1rem' }}>
              {formatUGX(realizedProfit)}
            </span>
          </div>
        </div>

        <div style={{ 
          padding: '25px', 
          borderRadius: '16px', 
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-slate)'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--neon-cyan)', fontSize: '14px', fontWeight: 'bold' }}>🛡️ DRAWER RECONCILIATION</h4>
          <input 
            type="number" 
            placeholder="Enter physical cash..."
            value={physicalCash}
            onChange={(e) => setPhysicalCash(e.target.value)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-slate)', padding: '12px', borderRadius: '8px', color: '#fff', marginBottom: '15px' }}
          />
          {physicalCash !== "" && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: (Number(physicalCash) - realizedProfit) === 0 ? 'rgba(45, 212, 191, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: (Number(physicalCash) - realizedProfit) === 0 ? '1px solid var(--accent-teal)' : '1px solid var(--danger)',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 'bold',
              color: (Number(physicalCash) - realizedProfit) === 0 ? 'var(--accent-teal)' : 'var(--danger)'
            }}>
              {(Number(physicalCash) - realizedProfit) === 0 ? "✅ BALANCED" : 
               (Number(physicalCash) - realizedProfit) > 0 ? `📈 OVERAGE: ${formatUGX(Number(physicalCash) - realizedProfit)}` : 
               `📉 SHORTAGE: ${formatUGX(Math.abs(Number(physicalCash) - realizedProfit))}`}
            </div>
          )}
        </div>
      </div>

      {/* --- 5. TAX ESTIMATOR (CLEAN) --- */}
      <div style={{ 
        padding: '25px', 
        borderRadius: '16px', 
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-slate)',
        marginBottom: '30px',
        position: 'relative'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--neon-purple)', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏛️ URA TAX ESTIMATOR
          <span 
            title="These are estimates for planning purposes. Actual tax liability can vary based on URA regulations and specific business circumstances."
            style={{ 
              cursor: 'help', 
              fontSize: '12px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '50%', 
              width: '18px', 
              height: '18px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            ?
          </span>
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <small style={{ color: 'var(--text-muted)', display: 'block' }}>EST. VAT (18%)</small>
            <span style={{ fontWeight: 'bold' }}>{formatUGX(estimatedVAT)}</span>
          </div>
          <div>
            <small style={{ color: 'var(--text-muted)', display: 'block' }}>EST. WHT (6%)</small>
            <span style={{ fontWeight: 'bold' }}>{formatUGX(estimatedWHT)}</span>
          </div>
        </div>
        <p style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.5)', marginTop: '12px', fontStyle: 'italic' }}>
          * Estimates only. Please consult a tax professional for actual filings.
        </p>
      </div>

      {/* --- 6. SUMMARY FOOTER (NEAT) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <div className="stat-box dashboard-stat-card" style={{ padding: '15px', borderLeft: '4px solid var(--neon-cyan)' }}>
          <small>Revenue</small>
          <h4 style={{ margin: '5px 0 0 0' }}>{formatUGX(totalRevenue)}</h4>
        </div>
        <div className="stat-box dashboard-stat-card" style={{ padding: '15px', borderLeft: '4px solid var(--accent-teal)' }}>
          <small>Net Profit</small>
          <h4 style={{ margin: '5px 0 0 0', color: 'var(--accent-teal)' }}>{formatUGX(netProfit)}</h4>
        </div>
        <div className="stat-box dashboard-stat-card" style={{ padding: '15px', borderLeft: '4px solid var(--danger)' }}>
          <small>Total Debt</small>
          <h4 style={{ margin: '5px 0 0 0', color: 'var(--danger)' }}>{formatUGX(totalDebt)}</h4>
        </div>
        <div className="stat-box dashboard-stat-card" style={{ padding: '15px', borderLeft: '4px solid var(--accent-amber)' }}>
          <small>Low Stock</small>
          <h4 style={{ margin: '5px 0 0 0', color: lowStockCount > 0 ? 'var(--danger)' : 'white' }}>{lowStockCount} Items</h4>
        </div>
      </div>
    </div>
  );
}
