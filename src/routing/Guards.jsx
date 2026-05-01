import { Navigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";

export function RequireAuth({ children }) {
  const { user, booting } = useAppState();
  if (booting) {
    return (
      <div className="app-viewport">
        <div className="glass-card">
          <p className="sync-indicator">Loading session...</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/auth" replace />;
}

export function RequireAdmin({ children }) {
  const { isAdmin } = useAppState();
  return isAdmin ? children : <Navigate to="/sales" replace />;
}

export function RequirePro({ children }) {
  const { subscription } = useAppState();
  if (subscription.plan === "free") {
    return <Navigate to="/subscription" replace />;
  }
  return children;
}

export function RequireTrialNotExpired({ children }) {
  const { isTrialExpired } = useAppState();
  if (isTrialExpired) {
    return <Navigate to="/subscription" replace />;
  }
  return children;
}
