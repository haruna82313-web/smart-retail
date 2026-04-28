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
  const [businessMode, setBusinessMode] = useState("retail");
  const [expenses, setExpenses] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [returnPolicy, setReturnPolicy] = useState(null);

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
    
    if (!user) {
      return { ok: false, message: "You must be logged in to enter admin mode." };
    }
    
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("admin_pin_hash")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (settingsError || !userSettings?.admin_pin_hash) {
      return { ok: false, message: "Admin PIN is not set. Please set up your PIN first." };
    }
    
    if (String(pin) !== String(userSettings.admin_pin_hash)) {
      return { ok: false, message: "Incorrect Admin PIN." };
    }
    
    setUserRole("Admin");
    return { ok: true, message: "Admin mode activated." };
  };

  const exitAdminMode = () => {
    setUserRole("Staff");
  };

  const updateAdminPin = async (newPin) => {
    if (!/^\d{6}$/.test(String(newPin || ""))) {
      return { ok: false, message: "PIN must be exactly 6 digits." };
    }
    
    if (!user) {
      return { ok: false, message: "You must be logged in to update PIN." };
    }
    
    const { error } = await supabase
      .from("user_settings")
      .upsert({ 
        user_id: user.id, 
        admin_pin_hash: String(newPin),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    
    if (error) {
      return { ok: false, message: error.message || "Could not update PIN." };
    }
    
    return { ok: true, message: "Admin PIN updated successfully." };
  };

  const readShopState = async () => {
    if (!user) return;
    
    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("shop_is_open, shop_last_opened_at, shop_last_closed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !settings) {
      setShopState((prev) => ({ ...prev, isOpen: true }));
      return;
    }

    setShopState({
      isOpen: String(settings.shop_is_open ?? "true") === "true",
      lastOpenedAt: settings.shop_last_opened_at || null,
      lastClosedAt: settings.shop_last_closed_at || null,
    });
  };

  const setShopOpenState = async (isOpen, actorUserId = null) => {
    if (!user) {
      return { ok: false, message: "You must be logged in to change shop state." };
    }
    
    const nowISO = new Date().toISOString();
    const updates = {
      user_id: user.id,
      shop_is_open: isOpen,
      shop_last_status_actor: actorUserId || user.id,
    };
    
    if (isOpen) {
      updates.shop_last_opened_at = nowISO;
    } else {
      updates.shop_last_closed_at = nowISO;
    }

    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert(updates, { onConflict: "user_id" });

      if (error) {
        console.log("User settings update error:", error.message);
        return { ok: false, message: error.message || "Could not update shop state." };
      }

      setShopState((prev) => ({
        isOpen,
        lastOpenedAt: isOpen ? nowISO : prev.lastOpenedAt,
        lastClosedAt: isOpen ? prev.lastClosedAt : nowISO,
        isOperational: isOpen,
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

  // ============================================================================
  // BUSINESS MODE FUNCTIONS
  // ============================================================================
  const fetchBusinessMode = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("business_modes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setBusinessMode(data.primary_mode || "retail");
    } else {
      setBusinessMode("retail");
    }
  };

  // ============================================================================
  // EXPENSE FUNCTIONS (Admin only)
  // ============================================================================
  const fetchExpenses = async () => {
    if (!user || !isAdmin) return;
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_date", { ascending: false });

    if (!error) {
      setExpenses(data || []);
    }
  };

  const addExpense = async (expense) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert([{ ...expense, user_id: user.id }])
      .select();

    if (!error) {
      await fetchExpenses();
      return { ok: true, data };
    }
    return { ok: false, error: error.message };
  };

  const deleteExpense = async (expenseId) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("user_id", user.id);

    if (!error) {
      await fetchExpenses();
      return { ok: true };
    }
    return { ok: false, error: error.message };
  };

  // ============================================================================
  // DISCOUNT FUNCTIONS (Admin only)
  // ============================================================================
  const fetchDiscounts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("discounts")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_date", { ascending: false });

    if (!error) {
      setDiscounts(data || []);
    }
  };

  const addDiscount = async (discount) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    const { data, error } = await supabase
      .from("discounts")
      .insert([{ ...discount, user_id: user.id }])
      .select();

    if (!error) {
      await fetchDiscounts();
      return { ok: true, data };
    }
    return { ok: false, error: error.message };
  };

  const deleteDiscount = async (discountId) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    const { error } = await supabase
      .from("discounts")
      .delete()
      .eq("id", discountId)
      .eq("user_id", user.id);

    if (!error) {
      await fetchDiscounts();
      return { ok: true };
    }
    return { ok: false, error: error.message };
  };

  // ============================================================================
  // RETURN POLICY FUNCTIONS (Admin only)
  // ============================================================================
  const fetchReturnPolicy = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("return_policies")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) {
      setReturnPolicy(
        data || {
          min_amount_for_return: 50000,
          max_days_for_return: 30,
          require_admin_approval: false,
        }
      );
    }
  };

  const saveReturnPolicy = async (policy) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    const { error } = await supabase
      .from("return_policies")
      .upsert({ ...policy, user_id: user.id })
      .eq("user_id", user.id);

    if (!error) {
      setReturnPolicy(policy);
      return { ok: true };
    }
    return { ok: false, error: error.message };
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
      fetchBusinessMode();
      if (isAdmin) {
        fetchExpenses();
        fetchDiscounts();
        fetchReturnPolicy();
      }
    }
  }, [user, isAdmin]);

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
      updateAdminPin,
      shopState,
      readShopState,
      setShopOpenState,
      closeShopAndCleanup,
      // New exports for wholesale/expenses/discounts
      businessMode,
      setBusinessMode,
      fetchBusinessMode,
      expenses,
      addExpense,
      deleteExpense,
      fetchExpenses,
      discounts,
      addDiscount,
      deleteDiscount,
      fetchDiscounts,
      returnPolicy,
      fetchReturnPolicy,
      saveReturnPolicy,
    }),
    [user, userRole, isAdmin, data, booting, isRefreshing, shopState, businessMode, expenses, discounts, returnPolicy]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
