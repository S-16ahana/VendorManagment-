// src/features/payments/paymentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { dummyPayments } from "./dummyPayment";

/* ---------- LocalStorage helpers ---------- */
const LS_KEY = "app_payments_v1";

const readPaymentsFromLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (err) {
    console.warn("Failed to read payments from localStorage", err);
    return null;
  }
};

const writePaymentsToLocal = (payments) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payments || []));
  } catch (err) {
    console.warn("Failed to write payments to localStorage", err);
  }
};

/* ---------- Month parser (expects "July 2025") ---------- */
const parseMonthLabel = (label) => {
  if (!label || typeof label !== "string") return { year: null, month: null };
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return { year: null, month: null };
  const yearStr = parts[parts.length - 1];
  const monthName = parts.slice(0, parts.length - 1).join(" ");
  const monthIndex = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  const year = Number(yearStr) || null;
  return { year: year || null, month: monthIndex >= 0 ? monthIndex + 1 : null };
};

/* ---------- Action type constants (exported) ---------- */
export const APPLY_PAYMENTS = "payments/applyPaymentToEntries";
export const REVERSE_PAYMENTS = "payments/reversePaymentOnEntries";

/* ---------- small helper to decide status ---------- */
/* CHANGED: Treat any payment with amount > 0 as 'paid' (meaning the payment was executed),
   because we want partial payments to be counted when computing remaining payable. */
const decideStatus = (incomingStatus, amount, amountPayable) => {
  // If caller explicitly set paid, respect it.
  if (incomingStatus === "paid") return "paid";

  const a = Number(amount) || 0;
  // If a payment has a positive amount, consider it executed ("paid").
  if (a > 0) return "paid";

  // If amount is zero or missing, fall back to existing logic:
  const apNum = amountPayable === '' || amountPayable === null || amountPayable === undefined ? null : Number(amountPayable);

  // If amountPayable is explicitly zero -> payment is considered paid (edge-case).
  if (apNum === 0) {
    return "paid";
  }

  if (apNum === null || Number.isNaN(apNum)) {
    return a > 0 ? "paid" : (incomingStatus || "unpaid");
  }

  return a >= apNum ? "paid" : (incomingStatus || "unpaid");
};

/* ---------- Thunks ---------- */
export const fetchPayments = createAsyncThunk(
  "payments/fetchPayments",
  async (_, { rejectWithValue }) => {
    try {
      // prefer localStorage
      const ls = readPaymentsFromLocal();
      if (ls && ls.length > 0) {
        return ls;
      }
      // fallback to bundled dummyPayments
      await new Promise((res) => setTimeout(res, 250));
      return dummyPayments || [];
    } catch (error) {
      return rejectWithValue("Failed to fetch payments");
    }
  }
);

export const createPayment = createAsyncThunk(
  "payments/createPayment",
  async (paymentData, { rejectWithValue, dispatch, getState }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Determine effective status using helper
      const effectiveStatus = decideStatus(paymentData.status, paymentData.amount, paymentData.amountPayable);

      const newPayment = {
        id: `pay-${Date.now()}`,
        ...paymentData,
        status: effectiveStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If payment is created in 'paid' state, apply to entries immediately
      if (newPayment.status === "paid") {
        const { year, month } = parseMonthLabel(newPayment.month);
        dispatch({
          type: APPLY_PAYMENTS,
          payload: { vendorCode: newPayment.vendorCode, year, month, amount: Number(newPayment.amount), entryId: newPayment.entryId },
        });
      }

      // Persist to localStorage (we will let reducer write, but persist here as well in case UI reads immediately)
      const current = getState().payments?.payments || [];
      const next = [newPayment, ...current];
      writePaymentsToLocal(next);

      return newPayment;
    } catch (error) {
      return rejectWithValue("Failed to create payment");
    }
  }
);

export const updatePayment = createAsyncThunk(
  "payments/updatePayment",
  async ({ id, ...paymentData }, { rejectWithValue, dispatch, getState }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const state = getState();
      const prev = (state.payments && state.payments.payments) ? state.payments.payments.find(p => p.id === id) : null;

      // Determine effective status for updated payment:
      const effectiveStatus = decideStatus(paymentData.status, paymentData.amount, paymentData.amountPayable);

      const updatedPayment = {
        id,
        ...paymentData,
        status: effectiveStatus,
        updatedAt: new Date().toISOString(),
      };

      // If status changed from unpaid -> paid, apply; if paid -> unpaid, reverse.
      if (prev && prev.status !== updatedPayment.status) {
        const { year, month } = parseMonthLabel(updatedPayment.month || prev.month);
        if (updatedPayment.status === "paid") {
          dispatch({ type: APPLY_PAYMENTS, payload: { vendorCode: updatedPayment.vendorCode || prev.vendorCode, year, month, amount: Number(updatedPayment.amount), entryId: updatedPayment.entryId || prev.entryId } });
        } else if (prev.status === "paid" && updatedPayment.status !== "paid") {
          dispatch({ type: REVERSE_PAYMENTS, payload: { vendorCode: updatedPayment.vendorCode || prev.vendorCode, year, month, amount: Number(updatedPayment.amount), entryId: updatedPayment.entryId || prev.entryId } });
        }
      }

      // Update localStorage (done in reducer too, but ensure persisted)
      const current = state.payments?.payments || [];
      const next = current.map((p) => (p.id === id ? { ...p, ...updatedPayment } : p));
      writePaymentsToLocal(next);
      return updatedPayment;
    } catch (error) {
      return rejectWithValue("Failed to update payment");
    }
  }
);

export const deletePayment = createAsyncThunk(
  "payments/deletePayment",
  async (paymentId, { rejectWithValue, getState }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // update localStorage
      const current = getState().payments?.payments || [];
      const next = current.filter((p) => p.id !== paymentId);
      writePaymentsToLocal(next);
      return paymentId;
    } catch (error) {
      return rejectWithValue("Failed to delete payment");
    }
  }
);

export const markPaymentPaid = createAsyncThunk(
  "payments/markPaymentPaid",
  async (paymentId, { getState, rejectWithValue, dispatch }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const payment = getState().payments.payments.find(p => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");
      const newStatus = payment?.status === "paid" ? "unpaid" : "paid";
      const { year, month } = parseMonthLabel(payment.month);

      if (newStatus === "paid") {
        dispatch({ type: APPLY_PAYMENTS, payload: { vendorCode: payment.vendorCode, year, month, amount: Number(payment.amount), entryId: payment.entryId } });
      } else {
        dispatch({ type: REVERSE_PAYMENTS, payload: { vendorCode: payment.vendorCode, year, month, amount: Number(payment.amount), entryId: payment.entryId } });
      }

      // Return only the status update; reducer will persist
      return { id: paymentId, status: newStatus, updatedAt: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue("Failed to update payment status");
    }
  }
);

/* ----------
   replayPaidPaymentsForPeriod
   Reads localStorage payments and dispatches applyPaymentToEntries for paid payments
   matching the provided year/month.
   ---------- */
export const replayPaidPaymentsForPeriod = createAsyncThunk(
  "payments/replayPaidPaymentsForPeriod",
  async ({ year, month }, { dispatch, rejectWithValue }) => {
    try {
      if (!year || !month) return [];
      const all = readPaymentsFromLocal() || [];
      // Only include payments marked as 'paid'
      const paymentsForPeriod = all.filter((p) => {
        if (!p || p.status !== "paid") return false;
        const parsed = parseMonthLabel(p.month);
        return parsed.year === Number(year) && parsed.month === Number(month);
      });
      // Dispatch apply action for each payment found
      paymentsForPeriod.forEach((p) => {
        const amt = Number(p.amount) || 0;
        if (!amt) return;
        dispatch({
          type: APPLY_PAYMENTS,
          payload: {
            vendorCode: p.vendorCode,
            year: Number(year),
            month: Number(month),
            amount: amt,
            ...(p.entryId ? { entryId: p.entryId } : {}),
          },
        });
      });
      return paymentsForPeriod;
    } catch (err) {
      console.warn("replayPaidPaymentsForPeriod error", err);
      return rejectWithValue("Failed to replay payments");
    }
  }
);

/* ---------- Slice ---------- */
const initialState = {
  payments: readPaymentsFromLocal() || dummyPayments || [],
  loading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload || [];
        // persist (sync)
        writePaymentsToLocal(state.payments);
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /* create */
      .addCase(createPayment.fulfilled, (state, action) => {
        // unshift new item
        state.payments.unshift(action.payload);
        writePaymentsToLocal(state.payments);
      })
      /* update */
      .addCase(updatePayment.fulfilled, (state, action) => {
        const idx = state.payments.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) {
          state.payments[idx] = { ...state.payments[idx], ...action.payload };
        }
        writePaymentsToLocal(state.payments);
      })
      /* delete */
      .addCase(deletePayment.fulfilled, (state, action) => {
        state.payments = state.payments.filter((p) => p.id !== action.payload);
        writePaymentsToLocal(state.payments);
      })
      /* toggle paid */
      .addCase(markPaymentPaid.fulfilled, (state, action) => {
        const idx = state.payments.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) {
          state.payments[idx].status = action.payload.status;
          state.payments[idx].updatedAt = action.payload.updatedAt || new Date().toISOString();
        }
        writePaymentsToLocal(state.payments);
      });
  },
});

export const { clearError } = paymentSlice.actions;
export default paymentSlice.reducer;
