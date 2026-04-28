import { useAppState } from "../state/AppStateContext";

export default function ProfitAndLoss({ data }) {
  const { expenses, discounts } = useAppState();

  const formatUGX = (num) => "UGX " + Number(num || 0).toLocaleString();

  const sales = data?.sales || [];
  const debts = data?.debts || [];
  const stock = data?.stock || [];

  // Calculate totals
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.price || 0), 0);
  const totalCogs = sales.reduce((acc, s) => acc + Number(s.cost_price || 0), 0);
  const discountsGiven = discounts.filter(d => d.type === "given_to_customer").reduce((acc, d) => acc + Number(d.amount || 0), 0);
  const discountsReceived = discounts.filter(d => d.type === "received_from_supplier").reduce((acc, d) => acc + Number(d.amount || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  
  const netProfit = totalRevenue - totalCogs - discountsGiven + discountsReceived - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

  const lowStockCount = (stock || []).filter((s) => Number(s.quantity || 0) <= 5).length;
  const totalDebt = debts.reduce((acc, d) => acc + (Number(d.total_amount || 0) - Number(d.paid_amount || 0)), 0);

  return (
    <div className="section pnl glass-card">
      <h2 style={{ fontSize: '1.8rem', marginBottom: '5px', textAlign: 'center' }}>💰 Profit & Loss Statement</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>
        Detailed breakdown of your business performance today.
      </p>

      {/* DETAILED P&L TABLE */}
      <div style={{ 
        background: 'rgba(255,255,255,0.03)', 
        border: '1px solid var(--border-slate)', 
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '40px',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <tr style={{ borderBottom: '2px solid var(--border-slate)', height: '50px' }}>
              <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>Total Revenue</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatUGX(totalRevenue)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px', background: 'rgba(255,255,255,0.01)' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Cost of Goods Sold (COGS)</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'rgba(239, 68, 68, 0.7)' }}>-{formatUGX(totalCogs)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Discounts Given to Customers</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'rgba(239, 68, 68, 0.7)' }}>-{formatUGX(discountsGiven)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px', background: 'rgba(255,255,255,0.01)' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Discounts Received from Suppliers</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--accent-teal)' }}>+{formatUGX(discountsReceived)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '45px' }}>
              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Operating Expenses</td>
              <td style={{ padding: '12px', textAlign: 'right', color: 'rgba(239, 68, 68, 0.7)' }}>-{formatUGX(totalExpenses)}</td>
            </tr>
            <tr style={{ borderBottom: '2px solid var(--neon-cyan)', height: '50px', background: 'rgba(15, 240, 252, 0.05)' }}>
              <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: '1.1rem' }}>NET PROFIT</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: netProfit >= 0 ? 'var(--accent-teal)' : 'var(--danger)' }}>
                {netProfit >= 0 ? '+' : ''}{formatUGX(netProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '40px' }}>
        <div style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          background: 'rgba(15, 240, 252, 0.05)',
          border: '1px solid rgba(15, 240, 252, 0.3)',
          textAlign: 'center'
        }}>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>PROFIT MARGIN</small>
          <h3 style={{ fontSize: '1.8rem', color: 'var(--neon-cyan)', margin: 0 }}>{profitMargin}%</h3>
          <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>of revenue retained</small>
        </div>

        <div style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          background: 'rgba(45, 212, 191, 0.05)',
          border: '1px solid rgba(45, 212, 191, 0.3)',
          textAlign: 'center'
        }}>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>AVERAGE ORDER VALUE</small>
          <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-teal)', margin: 0 }}>
            {formatUGX(sales.length > 0 ? totalRevenue / sales.length : 0)}
          </h3>
          <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>per transaction</small>
        </div>

        <div style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          background: 'rgba(251, 191, 36, 0.05)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          textAlign: 'center'
        }}>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>TRANSACTIONS TODAY</small>
          <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-amber)', margin: 0 }}>{sales.length}</h3>
          <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>sales recorded</small>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--neon-cyan)' }}>
          <small>Total Revenue</small>
          <h3 style={{ fontSize: '1.5rem' }}>{formatUGX(totalRevenue)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-teal)' }}>
          <small>Net Profit</small>
          <h3 style={{ color: 'var(--accent-teal)', fontSize: '1.5rem' }}>{formatUGX(netProfit)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <small>Customer Debt</small>
          <h3 style={{ color: 'var(--danger)', fontSize: '1.5rem' }}>{formatUGX(totalDebt)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid rgba(239, 68, 68, 0.5)' }}>
          <small>Total Expenses</small>
          <h3 style={{ color: 'rgba(239, 68, 68, 0.8)', fontSize: '1.5rem' }}>{formatUGX(totalExpenses)}</h3>
        </div>

        <div className="stat-box dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-amber)' }}>
          <small>Low Stock Items</small>
          <h3 style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'white', fontSize: '1.5rem' }}>{lowStockCount}</h3>
        </div>
      </div>
    </div>
  );
}
