import { Navigate, Route, Routes } from "react-router-dom";
import Auth from "./Auth";
import Sales from "./sections/Sales";
import Stock from "./sections/Stock";
import Debts from "./sections/Debts";
import Creditors from "./sections/Creditors";
import Expenses from "./sections/Expenses";
import Dashboard from "./sections/Dashboard";
import ProfitAndLoss from "./sections/ProfitAndLoss";
import GuidePolicy from "./sections/GuidePolicy";
import Subscription from "./sections/Subscription";
import HomeHub from "./sections/HomeHub";
import AppLayout from "./layouts/AppLayout";
import { AppStateProvider, useAppState } from "./state/AppStateContext";
import { RequireAdmin, RequireAuth, RequirePro, RequireTrialNotExpired } from "./routing/Guards";

function AppRoutes() {
  const { user, isAdmin, data, fetchData, setDataDirect } = useAppState();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/hub" replace /> : <Auth />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/hub" element={<HomeHub />} />
        <Route
          path="/sales"
          element={
            <RequireTrialNotExpired>
              <Sales
                user={user}
                list={data.sales}
                stockList={data.stock}
                refresh={fetchData}
                setData={setDataDirect}
                isAdmin={isAdmin}
              />
            </RequireTrialNotExpired>
          }
        />
        <Route
          path="/stock"
          element={
            <RequireTrialNotExpired>
              <Stock
                user={user}
                list={data.stock}
                refresh={fetchData}
                setData={setDataDirect}
                isAdmin={isAdmin}
              />
            </RequireTrialNotExpired>
          }
        />
        <Route
          path="/debts"
          element={
            <RequireTrialNotExpired>
              <Debts
                user={user}
                list={data.debts}
                refresh={fetchData}
                setData={setDataDirect}
                isAdmin={isAdmin}
              />
            </RequireTrialNotExpired>
          }
        />
        <Route
          path="/creditors"
          element={
            <RequireTrialNotExpired>
              <Creditors
                user={user}
                list={data.creditors}
                refresh={fetchData}
                setData={setDataDirect}
                isAdmin={isAdmin}
              />
            </RequireTrialNotExpired>
          }
        />
        <Route
          path="/expenses"
          element={
            <RequireAdmin>
              <RequireTrialNotExpired>
                <Expenses user={user} isAdmin={isAdmin} />
              </RequireTrialNotExpired>
            </RequireAdmin>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <RequireTrialNotExpired>
                <Dashboard data={data} refresh={fetchData} />
              </RequireTrialNotExpired>
            </RequireAdmin>
          }
        />
        <Route
          path="/pnl"
          element={
            <RequireAdmin>
              <RequireTrialNotExpired>
                <ProfitAndLoss data={data} />
              </RequireTrialNotExpired>
            </RequireAdmin>
          }
        />
        <Route
          path="/payment-history"
          element={<GuidePolicy />}
        />
        <Route
          path="/subscription"
          element={<Subscription />}
        />
      </Route>

      <Route path="/" element={<Navigate to={user ? "/hub" : "/auth"} replace />} />
      <Route path="*" element={<Navigate to={user ? "/hub" : "/auth"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  );
}
