// CHANGES: Updated to exclude retention for Hiring Service (always 0 for HS)
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialMonthlyEntries } from "../vendorMaster/dummyData";
import { APPLY_PAYMENTS, REVERSE_PAYMENTS } from "../payments/paymentSlice";

/* ---------- Helpers ---------- */
function normalizeRate(rate) {
  const r = Number(rate);
  if (!isFinite(r) || r === 0) return 0;
  return r >= 1 ? r / 100 : r;
}

function round2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

function parseNumber(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/[, ]+/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/* ---------- calculateHiringEntryTotals (Hiring: retention always 0) ---------- */
export const calculateHiringEntryTotals = (values = {}) => {
  const gross = round2(parseNumber(values.gross_amount));
  const gstRate = normalizeRate(values.gst_rate) || 0.18;
  const tdsRate = normalizeRate(values.tds_rate) || 0.02;

  const gst = round2(gross * gstRate);
  const total = round2(gross + gst);
  const tds = round2(gross * tdsRate);
  const retention = 0; // Always 0 for Hiring Service

  const debit = round2(parseNumber(values.debit_deduction));
  const gstHold =
    values.gst_hold !== "" && values.gst_hold !== undefined && values.gst_hold !== null
      ? round2(parseNumber(values.gst_hold))
      : gst;
  const others = round2(parseNumber(values.other_deductions));

  const sumDeductions = round2(tds + debit + retention + gstHold + others);
  const netTotal = round2(total - sumDeductions);

  const advances = round2(parseNumber(values.advances));
  const partPaid = round2(parseNumber(values.part_paid));
  const payables = round2(netTotal - advances - partPaid);

  return {
    gst_amount: gst,
    total_amount: total,
    tds,
    retention,
    debit_deduction: debit,
    gst_hold: gstHold,
    other_deductions: others,
    total_deductions: sumDeductions,
    net_total: netTotal,
    advances,
    part_paid: partPaid,
    payables,
  };
};

/* ----------------- Async thunks (mocked/back-end placeholders) ----------------- */

export const fetchHiringEntries = createAsyncThunk(
  "hiring/fetchEntries",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const entries = initialMonthlyEntries
        .filter((entry) => entry.type === "HS" && entry.year === year && entry.month === month)
        // ensure invoice_date and ra_bill_no exist on each entry from dummy data
        .map((e) => ({
          ...e,
          invoice_date: e.invoice_date || "",
          ra_bill_no: e.ra_bill_no || "",
        }));

      return entries;
    } catch (error) {
      return rejectWithValue("Failed to fetch hiring entries");
    }
  }
);

export const createHiringEntry = createAsyncThunk(
  "hiring/createEntry",
  async (entryData, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const calculatedValues = calculateHiringEntryTotals(entryData);

      const newEntry = {
        id: `entry-hs-${Date.now()}`,
        type: "HS",
        invoice_date: entryData.invoice_date || "",
        ra_bill_no: entryData.ra_bill_no || "",
        ...entryData,
        ...calculatedValues,
      };

      return newEntry;
    } catch (error) {
      return rejectWithValue("Failed to create hiring entry");
    }
  }
);

export const updateHiringEntry = createAsyncThunk(
  "hiring/updateEntry",
  async ({ id, ...entryData }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const calculatedValues = calculateHiringEntryTotals(entryData);

      return {
        id,
        invoice_date: entryData.invoice_date || "",
        ra_bill_no: entryData.ra_bill_no || "",
        ...entryData,
        ...calculatedValues,
      };
    } catch (error) {
      return rejectWithValue("Failed to update hiring entry");
    }
  }
);

export const deleteHiringEntry = createAsyncThunk(
  "hiring/deleteEntry",
  async (entryId, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return entryId;
    } catch (error) {
      return rejectWithValue("Failed to delete hiring entry");
    }
  }
);

/* ----------------- Slice ----------------- */

const initialState = {
  entries: [],
  loading: false,
  error: null,
  selectedYear: 2025,
  selectedMonth: 7,
};

const hiringSlice = createSlice({
  name: "hiring",
  initialState,
  reducers: {
    setSelectedPeriod: (state, action) => {
      state.selectedYear = action.payload.year;
      state.selectedMonth = action.payload.month;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHiringEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHiringEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = (action.payload || []).map((e) => ({
          ...e,
          invoice_date: e.invoice_date || "",
          ra_bill_no: e.ra_bill_no || "",
        }));
      })
      .addCase(fetchHiringEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // New entries added to top of list
      .addCase(createHiringEntry.fulfilled, (state, action) => {
        state.entries.unshift({
          ...action.payload,
          invoice_date: action.payload.invoice_date || "",
          ra_bill_no: action.payload.ra_bill_no || "",
        });
      })

      .addCase(updateHiringEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = {
            ...action.payload,
            invoice_date: action.payload.invoice_date || "",
            ra_bill_no: action.payload.ra_bill_no || "",
          };
        }
      })

      .addCase(deleteHiringEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      })

      /* ---------------- Payment apply/reverse handlers ---------------- */
      // payload: { vendorCode, year, month, amount, entryId? }
      .addCase(APPLY_PAYMENTS, (state, action) => {
        const { vendorCode, year, month, amount, entryId } = action.payload || {};
        if (!vendorCode || !year || !month || !amount) return;
        // Only handle HS vendor codes in hiring slice
        if (!String(vendorCode).startsWith("HS_")) return;

        const matches = state.entries.filter(
          (e) => e.vendor_code === vendorCode && e.year === year && e.month === month
        );
        if (!matches || matches.length === 0) return;

        let remaining = Number(amount);
        if (entryId) {
          // If entryId provided, apply only to that entry
          const target = matches.find((m) => m.id === entryId);
          if (!target) return;
          const payables = Number(target.payables || 0);
          const apply = Math.min(remaining, payables);
          target.part_paid = round2(Number(target.part_paid || 0) + apply);
          target.payables = round2(Math.max(0, payables - apply));
          remaining -= apply;
        } else {
          // Distribute across matches in order until exhausted
          for (let i = 0; i < matches.length && remaining > 0; i++) {
            const e = matches[i];
            const payables = Number(e.payables || 0);
            if (payables <= 0) continue;
            const apply = Math.min(remaining, payables);
            e.part_paid = round2(Number(e.part_paid || 0) + apply);
            e.payables = round2(Math.max(0, payables - apply));
            remaining = round2(remaining - apply);
          }
        }
      })
      .addCase(REVERSE_PAYMENTS, (state, action) => {
        const { vendorCode, year, month, amount, entryId } = action.payload || {};
        if (!vendorCode || !year || !month || !amount) return;
        if (!String(vendorCode).startsWith("HS_")) return;

        const matches = state.entries.filter(
          (e) => e.vendor_code === vendorCode && e.year === year && e.month === month
        );
        if (!matches || matches.length === 0) return;

        let remaining = Number(amount);
        if (entryId) {
          const target = matches.find((m) => m.id === entryId);
          if (!target) return;
          const partPaid = Number(target.part_paid || 0);
          const undo = Math.min(remaining, partPaid);
          target.part_paid = round2(Math.max(0, partPaid - undo));
          target.payables = round2(Number(target.payables || 0) + undo);
          remaining -= undo;
        } else {
          for (let i = 0; i < matches.length && remaining > 0; i++) {
            const e = matches[i];
            const partPaid = Number(e.part_paid || 0);
            if (partPaid <= 0) continue;
            const undo = Math.min(remaining, partPaid);
            e.part_paid = round2(Math.max(0, partPaid - undo));
            e.payables = round2(Number(e.payables || 0) + undo);
            remaining = round2(remaining - undo);
          }
        }
      });
  },
});

export const { setSelectedPeriod, clearError } = hiringSlice.actions;
export default hiringSlice.reducer;
