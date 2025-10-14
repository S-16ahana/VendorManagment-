// src/features/subContractor/subContractorSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialMonthlyEntries } from "../vendorMaster/dummyData";
import { APPLY_PAYMENTS, REVERSE_PAYMENTS } from "../payments/paymentSlice";

/* Helpers (preserved) */
function normalizeRate(rate) {
  if (rate === "" || rate === null || rate === undefined) return 0;
  const s = String(rate).trim().replace(/[%\s,]+/g, "");
  const r = Number(s);
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

/* calculateEntryTotals (preserved) */
export const calculateEntryTotals = (values = {}) => {
  const gross = round2(parseNumber(values.gross_amount));
  const gstRate = normalizeRate(values.gst_rate);
  const tdsRate = normalizeRate(values.tds_rate);
  const gst_amount = round2(gross * gstRate);
  const total_amount = round2(gross + gst_amount);
  const tds = round2(gross * tdsRate);
  const explicitRetentionRate =
    typeof values.retention_rate === "number" ? values.retention_rate : undefined;
  const isHiringService = String(values.workType || "").trim() === "Hiring Service";
  const retention_rate = isHiringService
    ? 0
    : explicitRetentionRate !== undefined
    ? explicitRetentionRate
    : 0.05;
  const retention = round2(gross * retention_rate);
  const debit_deduction = round2(parseNumber(values.debit_deduction));
  const gst_hold =
    values.gst_hold !== "" && values.gst_hold !== undefined && values.gst_hold !== null
      ? round2(parseNumber(values.gst_hold))
      : gst_amount;
  const other_deductions = round2(parseNumber(values.other_deductions));
  const total_deductions = round2(tds + retention + debit_deduction + gst_hold + other_deductions);
  const net_total = round2(total_amount - total_deductions);
  const advances = round2(parseNumber(values.advances));
  const part_paid = round2(parseNumber(values.part_paid));
  const payables = round2(net_total - advances - part_paid);
  return {
    gst_amount,
    total_amount,
    tds,
    retention,
    debit_deduction,
    gst_hold,
    other_deductions,
    total_deductions,
    net_total,
    advances,
    part_paid,
    payables,
  };
};

/* Async thunks (preserved) */
export const fetchSubcontractorEntries = createAsyncThunk(
  "subcontractor/fetchEntries",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const entries = initialMonthlyEntries
        .filter((entry) => entry.type === "SC" && entry.year === year && entry.month === month)
        .map((e) => ({
          ...e,
          invoice_date: e.invoice_date || "",
          ra_bill_no: e.ra_bill_no || "",
        }));
      return entries;
    } catch (error) {
      return rejectWithValue("Failed to fetch subcontractor entries");
    }
  }
);

export const createSubcontractorEntry = createAsyncThunk(
  "subcontractor/createEntry",
  async (entryData, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const calculatedValues = calculateEntryTotals(entryData);
      const newEntry = {
        id: `entry-${Date.now()}`,
        type: "SC",
        invoice_date: entryData.invoice_date || "",
        ra_bill_no: entryData.ra_bill_no || "",
        ...entryData,
        ...calculatedValues,
      };
      return newEntry;
    } catch (error) {
      return rejectWithValue("Failed to create entry");
    }
  }
);

export const updateSubcontractorEntry = createAsyncThunk(
  "subcontractor/updateEntry",
  async ({ id, ...entryData }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const calculatedValues = calculateEntryTotals(entryData);
      return {
        id,
        invoice_date: entryData.invoice_date || "",
        ra_bill_no: entryData.ra_bill_no || "",
        ...entryData,
        ...calculatedValues,
      };
    } catch (error) {
      return rejectWithValue("Failed to update entry");
    }
  }
);

export const deleteSubcontractorEntry = createAsyncThunk(
  "subcontractor/deleteEntry",
  async (entryId, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return entryId;
    } catch (error) {
      return rejectWithValue("Failed to delete entry");
    }
  }
);

/* ----------------- Slice ----------------- */
const initialState = {
  entries: [],
  loading: false,
  error: null,
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
};

const subContractorSlice = createSlice({
  name: "subcontractor",
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
      .addCase(fetchSubcontractorEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubcontractorEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = (action.payload || []).map((e) => ({
          ...e,
          invoice_date: e.invoice_date || "",
          ra_bill_no: e.ra_bill_no || "",
        }));
      })
      .addCase(fetchSubcontractorEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSubcontractorEntry.fulfilled, (state, action) => {
        state.entries.unshift({
          ...action.payload,
          invoice_date: action.payload.invoice_date || "",
          ra_bill_no: action.payload.ra_bill_no || "",
        });
      })
      .addCase(updateSubcontractorEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1)
          state.entries[index] = {
            ...action.payload,
            invoice_date: action.payload.invoice_date || "",
            ra_bill_no: action.payload.ra_bill_no || "",
          };
      })
      .addCase(deleteSubcontractorEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      })

      /* ---------- Payment apply/reverse handlers (UPDATED) ---------- */
      .addCase(APPLY_PAYMENTS, (state, action) => {
        const { vendorCode, year, month, amount, entryId } = action.payload || {};
        const amt = Number(amount) || 0;
        if (!vendorCode || !year || !month || amt <= 0) return;

        // Match entries by vendor_code OR vendor_name (defensive)
        let matches = state.entries.filter(
          (e) =>
            (String(e.vendor_code) === String(vendorCode) || String(e.vendor_name) === String(vendorCode)) &&
            Number(e.year) === Number(year) &&
            Number(e.month) === Number(month)
        );
        if (!matches || matches.length === 0) return;

        // Sort by invoice_date ascending (oldest first)
        matches = matches.slice().sort((a, b) => {
          const da = a.invoice_date ? Date.parse(a.invoice_date) : 0;
          const db = b.invoice_date ? Date.parse(b.invoice_date) : 0;
          return (Number(da || 0) - Number(db || 0)) || 0;
        });

        let remaining = amt;

        if (entryId) {
          const target = matches.find((m) => m.id === entryId);
          if (!target) return;
          const payables = Number(target.payables || 0);
          const apply = Math.min(remaining, payables);
          target.part_paid = round2(Number(target.part_paid || 0) + apply);
          target.payables = round2(Math.max(0, payables - apply));
          remaining = round2(remaining - apply);
        } else {
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
        const amt = Number(amount) || 0;
        if (!vendorCode || !year || !month || amt <= 0) return;

        // Match entries by vendor_code OR vendor_name
        let matches = state.entries.filter(
          (e) =>
            (String(e.vendor_code) === String(vendorCode) || String(e.vendor_name) === String(vendorCode)) &&
            Number(e.year) === Number(year) &&
            Number(e.month) === Number(month)
        );
        if (!matches || matches.length === 0) return;

        // Sort by invoice_date descending (newest first)
        matches = matches.slice().sort((a, b) => {
          const da = a.invoice_date ? Date.parse(a.invoice_date) : 0;
          const db = b.invoice_date ? Date.parse(b.invoice_date) : 0;
          return (Number(db || 0) - Number(da || 0)) || 0;
        });

        let remaining = amt;

        if (entryId) {
          const target = matches.find((m) => m.id === entryId);
          if (!target) return;
          const partPaid = Number(target.part_paid || 0);
          const undo = Math.min(remaining, partPaid);
          target.part_paid = round2(Math.max(0, partPaid - undo));
          target.payables = round2(Number(target.payables || 0) + undo);
          remaining = round2(remaining - undo);
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

export const { setSelectedPeriod, clearError } = subContractorSlice.actions;
export default subContractorSlice.reducer;
