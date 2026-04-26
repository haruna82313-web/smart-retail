import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("Staff");
  const [booting, setBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState({
    sales: [],
    stock: [],
    debts: [],
    creditors: [],
  });
  const [shopState, setShopState] = useState({
    isOpen: true,
    lastOpenedAt: null,
    lastClosedAt: null,
    isOperational: true, // Controls whether shop operations are allowed
  });

  const isAdmin = userRole === "Admin";

  const withTimeout = (promise, ms = 3000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);

  const enterAdminMode = async (pin) => {
    if (!/^\d{6}$/.test(String(pin || ""))) {
      return { ok: false, message: "PIN must be exactly 6 digits." };
    }
    
    // Check global admin PIN from app_secrets table
    const { data: globalSecret, error: globalError } = await supabase
      .from("app_secrets")
      .select("key_value")
      .eq("key_name", "admin_pin")
      .maybeSingle();
    
    if (globalError || !globalSecret?.key_value) {
      return { ok: false, message: "Admin PIN is not configured. Please contact the app owner." };
    }
    if (String(pin) !== String(globalSecret.key_value)) {
      return { ok: false, message: "Incorrect Admin PIN." };
    }
    
    setUserRole("Admin");
    return { ok: true, message: "Admin mode activated." };
  };

  
  const exitAdminMode = () => {
    setUserRole("Staff");
  };

  const readShopState = async () => {
    const keys = ["shop_is_open", "shop_last_opened_at", "shop_last_closed_at"];
    const { data: rows, error } = await supabase
      .from("app_secrets")
      .select("key_name, key_value")
      .in("key_name", keys);

    if (error) {
      setShopState((prev) => ({ ...prev, isOpen: true }));
      return;
    }

    const mapped = (rows || []).reduce((acc, row) => {
      acc[row.key_name] = row.key_value;
      return acc;
    }, {});

    setShopState({
      isOpen: String(mapped.shop_is_open ?? "true") === "true",
      lastOpenedAt: mapped.shop_last_opened_at || null,
      lastClosedAt: mapped.shop_last_closed_at || null,
    });
  };

  const setShopOpenState = async (isOpen, actorUserId = null) => {
    const nowISO = new Date().toISOString();
    const payload = [
      { key_name: "shop_is_open", key_value: String(isOpen) },
      {
        key_name: isOpen ? "shop_last_opened_at" : "shop_last_closed_at",
        key_value: nowISO,
      },
      ...(actorUserId
        ? [{ key_name: "shop_last_status_actor", key_value: String(actorUserId) }]
        : []),
    ];

    try {
      const { error } = await supabase
        .from("app_secrets")
        .upsert(payload, { onConflict: "key_name" });

      if (error) {
        // Log as info instead of error to avoid console errors
        console.log("App secrets update (expected with RLS):", error.message);
        // Check for RLS policy violation specifically
        if (error.message?.includes("row-level security") || error.code === "42501") {
          return { 
            ok: false, 
            message: "Database permission denied. Please contact your administrator to set up proper Row Level Security (RLS) policies for the app_secrets table." 
          };
        }
        return { ok: false, message: error.message || "Could not update shop state." };
      }

      setShopState((prev) => ({
        isOpen,
        lastOpenedAt: isOpen ? nowISO : prev.lastOpenedAt,
        lastClosedAt: isOpen ? prev.lastClosedAt : nowISO,
        isOperational: isOpen, // Shop operations are only allowed when shop is open
      }));

      return { ok: true };
    } catch (err) {
      console.log("Unexpected error in setShopOpenState:", err.message);
      return { ok: false, message: "Unexpected error occurred while updating shop state." };
    }
  };

  const closeShopAndCleanup = async ({ salesRows = [], actorUserId = null }) => {
    const saleIds = (salesRows || []).map((row) => row.id).filter(Boolean);
    let archivedSuccessfully = false;
    
    if (saleIds.length > 0) {
      try {
        // Try RPC function first (bypasses RLS)
        const { error: rpcError } = await supabase.rpc("close_shop_cleanup", {
          p_sale_ids: saleIds,
          p_closed_by: actorUserId,
        });

        if (!rpcError) {
          archivedSuccessfully = true;
        } else {
          // If RPC fails, try manual approach but catch any errors
          try {
            const rowsToArchive = salesRows.map((row) => ({
              source_sale_id: row.id,
              item: row.item,
              quantity: row.quantity,
              unit: row.unit,
              price: row.price,
              cost_price: row.cost_price,
              profit: row.profit,
              stock_id: row.stock_id,
              user_id: row.user_id,
              sale_created_at: row.created_at,
              closed_by: actorUserId,
            }));

            // Try archiving first
            const { error: archiveError } = await supabase.from("sales_archive").insert(rowsToArchive);
            if (!archiveError) {
              // If archiving succeeded, try deleting
              const { error: deleteError } = await supabase.from("sales").delete().in("id", saleIds);
              if (!deleteError) {
                archivedSuccessfully = true;
              } else {
                console.log("Delete failed (expected with RLS):", deleteError.message);
              }
            } else {
              console.log("Archive failed (expected with RLS):", archiveError.message);
            }
          } catch (manualError) {
            console.log("Manual cleanup failed (expected):", manualError.message);
          }
        }
      } catch (rpcError) {
        console.log("RPC call failed (expected):", rpcError.message);
      }
    }

    // Always try to close shop state, even if archiving fails
    const closeState = await setShopOpenState(false, actorUserId);
    if (!closeState.ok) return closeState;

    // Force refresh data to clear sales list for new business day
    await fetchData();
    
    return { 
      ok: true, 
      archived: archivedSuccessfully,
      message: archivedSuccessfully 
        ? "Shop closed with sales archiving completed." 
        : "Shop closed. Sales archiving was skipped due to permissions."
    };
  };

  const fetchData = async () => {
    if (!user) return;
    setIsRefreshing(true);
    const [sales, stock, debts, creditors] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("stock").select("*").order("created_at", { ascending: false }),
      supabase.from("debts").select("*").order("created_at", { ascending: false }),
      supabase.from("creditors").select("*").order("created_at", { ascending: false }),
    ]);

    const openAt = shopState.lastOpenedAt ? new Date(shopState.lastOpenedAt).getTime() : null;
    const scopedSales = (sales.data || []).filter((row) => {
      if (!openAt) return true;
      const createdAt = row?.created_at ? new Date(row.created_at).getTime() : 0;
      return createdAt >= openAt;
    });

    setData({
      sales: scopedSales,
      stock: stock.data || [],
      debts: debts.data || [],
      creditors: creditors.data || [],
    });
    setIsRefreshing(false);
  };

  const setDataDirect = (updater) => {
    setData((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole("Staff");
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData } = await withTimeout(supabase.auth.getSession(), 3000);
        const currentUser = sessionData.session?.user || null;
        setUser(currentUser);
        setUserRole("Staff");
      } catch {
        setUser(null);
        setUserRole("Staff");
      } finally {
        setBooting(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user || null;
        setUser(nextUser);
        setUserRole("Staff");
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Hard safety: never allow indefinite boot screen.
    const guard = setTimeout(() => setBooting(false), 3500);
    return () => clearTimeout(guard);
  }, []);

  useEffect(() => {
    if (user) {
      readShopState();
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [shopState.lastOpenedAt, user]);

  const value = useMemo(
    () => ({
      user,
      userRole,
      isAdmin,
      data,
      booting,
      isRefreshing,
      fetchData,
      setDataDirect,
      logout,
      enterAdminMode,
      exitAdminMode,
      shopState,
      readShopState,
      setShopOpenState,
      closeShopAndCleanup,
    }),
    [user, userRole, isAdmin, data, booting, isRefreshing, shopState]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
