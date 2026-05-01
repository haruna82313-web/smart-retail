import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("Staff");
  const [booting, setBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const [data, setData] = useState({
    sales: [],
    stock: [],
    debts: [],
    creditors: [],
    paymentRequests: [],
  });
  const [subscription, setSubscription] = useState({
    plan: "free",
    status: "inactive",
    expiresAt: null,
  });
  const [trialStartDate, setTrialStartDate] = useState(null);
  const [shopState, setShopState] = useState({
    isOpen: true,
    lastOpenedAt: null,
    lastClosedAt: null,
    isOperational: true,
  });
  const [businessMode, setBusinessMode] = useState("retail");
  const [expenses, setExpenses] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [returnPolicy, setReturnPolicy] = useState(null);

  const isAdmin = userRole === "Admin";
  const isOwner = user?.email === "haruna82313@gmail.com";

  const isTrialExpired = useMemo(() => {
    if (isOwner) return false;
    if (subscription.status === "active") return false;
    if (!trialStartDate) return false;

    const trialStart = new Date(trialStartDate);
    const now = new Date();
    const diffMs = now.getTime() - trialStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays > 3.5;
  }, [isOwner, subscription.status, trialStartDate]);

  const withTimeout = (promise, ms = 3000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);

  const enterAdminMode = async (pin) => {
    if (isOwner) {
      setUserRole("Admin");
      localStorage.setItem("retail_user_role", "Admin");
      return { ok: true, message: "Admin mode activated." };
    }

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
    
    try {
      const { data: settings, error } = await supabase
        .from("user_settings")
        .select("shop_is_open, shop_last_opened_at, shop_last_closed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && settings) {
        setShopState({
          isOpen: String(settings.shop_is_open ?? "true") === "true",
          lastOpenedAt: settings.shop_last_opened_at || null,
          lastClosedAt: settings.shop_last_closed_at || null,
        });
      } else {
        setShopState((prev) => ({ ...prev, isOpen: true }));
      }
    } catch {
      setShopState((prev) => ({ ...prev, isOpen: true }));
    }
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
          // If RPC fails, try manual approach quietly
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

            const { error: archiveError } = await supabase.from("sales_archive").insert(rowsToArchive);
            if (!archiveError) {
              const { error: deleteError } = await supabase.from("sales").delete().in("id", saleIds);
              if (!deleteError) {
                archivedSuccessfully = true;
              }
            }
          } catch {}
        }
      } catch {}
    }

    const closeState = await setShopOpenState(false, actorUserId);
    if (!closeState.ok) return closeState;

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
    if (!user || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsRefreshing(true);
    
    const safeFetch = async (query) => {
      try {
        const result = await query;
        return { data: result.data || null, error: result.error || null };
      } catch (err) {
        return { data: null, error: err };
      }
    };

    try {
      const sales = await safeFetch(supabase.from("sales").select("*").order("created_at", { ascending: false }));
      const stock = await safeFetch(supabase.from("stock").select("*").order("created_at", { ascending: false }));
      const debts = await safeFetch(supabase.from("debts").select("*").order("created_at", { ascending: false }));
      const creditors = await safeFetch(supabase.from("creditors").select("*").order("created_at", { ascending: false }));
      const discounts = await safeFetch(supabase.from("discounts").select("*").eq("user_id", user.id).order("recorded_date", { ascending: false }));
      const subSettings = await safeFetch(supabase.from("user_settings").select("subscription_plan, subscription_status, subscription_expires_at, trial_start_date").eq("user_id", user.id).maybeSingle());
      
      // Re-enable payment requests with safe fetch
      let payments = { data: [], error: null };
      try {
        payments = await safeFetch(
          isOwner 
            ? supabase.from("payment_requests").select("*").order("submitted_at", { ascending: false })
            : supabase.from("payment_requests").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false })
        );
      } catch {}

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
        paymentRequests: payments.data || [],
        discounts: discounts.data || [],
      });

      if (subSettings.data) {
        setSubscription({
          plan: subSettings.data.subscription_plan || "free",
          status: subSettings.data.subscription_status || "inactive",
          expiresAt: subSettings.data.subscription_expires_at || null,
        });

        if (subSettings.data.trial_start_date) {
          setTrialStartDate(subSettings.data.trial_start_date);
        } else {
          const newTrialDate = new Date().toISOString();
          setTrialStartDate(newTrialDate);
          try {
            await supabase.from("user_settings").upsert({ 
              user_id: user.id, 
              trial_start_date: newTrialDate 
            }, { onConflict: "user_id" });
          } catch {}
        }
      } else {
        const newTrialDate = new Date().toISOString();
        setTrialStartDate(newTrialDate);
        try {
          await supabase.from("user_settings").upsert({ 
            user_id: user.id, 
            trial_start_date: newTrialDate 
          }, { onConflict: "user_id" });
        } catch {}
      }
    } finally {
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  const setDataDirect = (updater) => {
    setData((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  const fetchBusinessMode = async () => {
    if (!user) return;
    try {
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
    } catch {
      setBusinessMode("retail");
    }
  };

  const fetchExpenses = async () => {
    if (!user || !isAdmin) return;
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_date", { ascending: false });

      if (!error) {
        setExpenses(data || []);
      }
    } catch {}
  };

  const addExpense = async (expense) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert([{ ...expense, user_id: user.id }])
        .select();

      if (!error) {
        await fetchExpenses();
        return { ok: true, data };
      }
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    try {
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
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const fetchDiscounts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_date", { ascending: false });

      if (!error) {
        setDiscounts(data || []);
      }
    } catch {}
  };

  const addDiscount = async (discount) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    try {
      const { data, error } = await supabase
        .from("discounts")
        .insert([{ ...discount, user_id: user.id }])
        .select();

      if (!error) {
        await fetchDiscounts();
        return { ok: true, data };
      }
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const deleteDiscount = async (discountId) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    try {
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
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const fetchReturnPolicy = async () => {
    if (!user) return;
    try {
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
    } catch {
      setReturnPolicy({
        min_amount_for_return: 50000,
        max_days_for_return: 30,
        require_admin_approval: false,
      });
    }
  };

  const saveReturnPolicy = async (policy) => {
    if (!user || !isAdmin) {
      return { ok: false, error: "Not authorized" };
    }
    try {
      const { error } = await supabase
        .from("return_policies")
        .upsert({ ...policy, user_id: user.id })
        .eq("user_id", user.id);

      if (!error) {
        setReturnPolicy(policy);
        return { ok: true };
      }
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
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

  const submitPaymentRequest = async (payment) => {
    if (!user) return { ok: false, error: "Not logged in" };
    try {
      const { data, error } = await supabase
        .from("payment_requests")
        .insert([{ ...payment, user_id: user.id }])
        .select();

      if (!error) {
        await fetchData();
        return { ok: true, data };
      }
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const approvePaymentRequest = async (requestId, userId, planType, durationDays = 30) => {
    if (!isOwner) return { ok: false, error: "Only the app owner can approve payments." };
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const { error: reqError } = await supabase
        .from("payment_requests")
        .update({ status: "approved", processed_at: new Date().toISOString() })
        .eq("id", requestId);

      if (reqError) return { ok: false, error: reqError.message };

      const { error: subError } = await supabase
        .from("user_settings")
        .update({
          subscription_plan: planType,
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq("user_id", userId);

      if (subError) return { ok: false, error: subError.message };

      await fetchData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const rejectPaymentRequest = async (requestId, notes) => {
    if (!isOwner) return { ok: false, error: "Only the app owner can reject payments." };
    try {
      const { error } = await supabase
        .from("payment_requests")
        .update({ status: "rejected", processed_at: new Date().toISOString(), notes })
        .eq("id", requestId);

      if (!error) {
        await fetchData();
        return { ok: true };
      }
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      isOwner,
      isTrialExpired,
      userRole,
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
      subscription,
      submitPaymentRequest,
      approvePaymentRequest,
      rejectPaymentRequest,
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
    [user, userRole, isAdmin, isOwner, isTrialExpired, data, booting, isRefreshing, shopState, businessMode, expenses, discounts, returnPolicy, subscription]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
