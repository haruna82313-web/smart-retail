/**
 * ProfitAndLossWidget
 * Displays complete P&L breakdown for dashboard
 * Shows: Revenue - COGS - Discounts Given + Discounts Received = GROSS PROFIT
 *        GROSS PROFIT - Operating Expenses = NET PROFIT
 */
export default function ProfitAndLossWidget({ data = {}, expenses = [], discounts = [] }) {
  const { sales = [], stock = [] } = data;

  const formatUGX = (n) => "UGX " + Number(n || 0).toLocaleString();

  // --- REVENUE CALCULATION ---
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.price || 0), 0);

  // --- COGS CALCULATION ---
  const totalCOGS = sales.reduce((sum, sale) => {
    const stockItem = stock.find((s) => s.id === sale.stock_id);
    const costPerUnit = stockItem ? Number(stockItem.totalMoneySpent || 0) / Number(stockItem.wholesaleQty || 1) : 0;
    const quantity = Number(sale.quantity_sold || 1);
    return sum + costPerUnit * quantity;
  }, 0);

  // --- DISCOUNTS CALCULATION ---
  const discountsGiven = discounts
    .filter((d) => d.discount_type === "given_to_customer" || d.type === "given_to_customer")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const discountsReceived = discounts
    .filter((d) => d.discount_type === "received_from_supplier" || d.type === "received_from_supplier")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // --- GROSS PROFIT ---
  const grossProfit = totalRevenue - totalCOGS - discountsGiven + discountsReceived;

  // --- OPERATING EXPENSES ---
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // --- NET PROFIT ---
  const netProfit = grossProfit - totalExpenses;

  // --- METRICS ---
  const marginPercentage = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
  const profitMarginPercentage = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="pal-widget">
      <h3>📊 Profit & Loss Statement</h3>

      <div className="pal-section revenue-section">
        <div className="pal-row">
          <span className="pal-label">Total Revenue</span>
          <span className="pal-value positive">{formatUGX(totalRevenue)}</span>
        </div>
      </div>

      <div className="pal-section cogs-section">
        <div className="pal-row">
          <span className="pal-label">Cost of Goods Sold (COGS)</span>
          <span className="pal-value negative">- {formatUGX(totalCOGS)}</span>
        </div>
      </div>

      <div className="pal-section discounts-section">
        <div className="pal-row">
          <span className="pal-label">Discounts Given (to customers)</span>
          <span className="pal-value negative">- {formatUGX(discountsGiven)}</span>
        </div>
        <div className="pal-row">
          <span className="pal-label">Discounts Received (from suppliers)</span>
          <span className="pal-value positive">+ {formatUGX(discountsReceived)}</span>
        </div>
      </div>

      <div className="pal-divider"></div>

      <div className="pal-section gross-profit-section">
        <div className="pal-row highlight">
          <span className="pal-label strong">GROSS PROFIT</span>
          <span className="pal-value positive strong">{formatUGX(grossProfit)}</span>
        </div>
        <div className="pal-row sub">
          <span className="pal-label">Gross Margin</span>
          <span className="pal-value">{marginPercentage}%</span>
        </div>
      </div>

      <div className="pal-divider"></div>

      <div className="pal-section expenses-section">
        <div className="pal-row">
          <span className="pal-label">Operating Expenses</span>
          <span className="pal-value negative">- {formatUGX(totalExpenses)}</span>
        </div>
        <div className="pal-row sub">
          <span className="pal-label-small">
            (Salaries, Utilities, Taxes, Transport, Depreciation, Drawings, etc.)
          </span>
        </div>
      </div>

      <div className="pal-divider"></div>

      <div className="pal-section net-profit-section">
        <div className="pal-row highlight">
          <span className="pal-label strong">NET PROFIT</span>
          <span className={`pal-value strong ${netProfit >= 0 ? "positive" : "negative"}`}>
            {netProfit >= 0 ? "✨" : "⚠️"} {formatUGX(netProfit)}
          </span>
        </div>
        <div className="pal-row sub">
          <span className="pal-label">Net Profit Margin</span>
          <span className={`pal-value ${netProfit >= 0 ? "positive" : "negative"}`}>
            {profitMarginPercentage}%
          </span>
        </div>
      </div>

      <div className="pal-metrics">
        <div className="metric-card">
          <div className="metric-label">Items Sold</div>
          <div className="metric-value">{sales.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg. Transaction</div>
          <div className="metric-value">{formatUGX(sales.length > 0 ? totalRevenue / sales.length : 0)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Expense Ratio</div>
          <div className="metric-value">
            {totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
