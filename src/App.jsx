import { Navigate, Route, Routes } from "react-router-dom";
import Auth from "./Auth";
import Sales from "./sections/Sales";
import Stock from "./sections/Stock";
import Debts from "./sections/Debts";
import Creditors from "./sections/Creditors";
import Dashboard from "./sections/Dashboard";
import GuidePolicy from "./sections/GuidePolicy";
import AppLayout from "./layouts/AppLayout";
import { AppStateProvider, useAppState } from "./state/AppStateContext";
import { RequireAdmin, RequireAuth } from "./routing/Guards";

function AppRoutes() {
  const { user, isAdmin, data, fetchData, setDataDirect } = useAppState();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/sales" replace /> : <Auth />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route
          path="/sales"
          element={
            <Sales
              user={user}
              list={data.sales}
              stockList={data.stock}
              refresh={fetchData}
              setData={setDataDirect}
              isAdmin={isAdmin}
            />
          }
        />
        <Route
          path="/stock"
          element={
            <Stock
              user={user}
              list={data.stock}
              refresh={fetchData}
              setData={setDataDirect}
              isAdmin={isAdmin}
            />
          }
        />
        <Route
          path="/debts"
          element={
            <Debts
              user={user}
              list={data.debts}
              refresh={fetchData}
              setData={setDataDirect}
              isAdmin={isAdmin}
            />
          }
        />
        <Route
          path="/creditors"
          element={
            <Creditors
              user={user}
              list={data.creditors}
              refresh={fetchData}
              setData={setDataDirect}
              isAdmin={isAdmin}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <Dashboard data={data} refresh={fetchData} />
            </RequireAdmin>
          }
        />
        <Route
          path="/payment-history"
          element={<GuidePolicy />}
        />
      </Route>

      <Route path="/" element={<Navigate to={user ? "/sales" : "/auth"} replace />} />
      <Route path="*" element={<Navigate to={user ? "/sales" : "/auth"} replace />} />
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
