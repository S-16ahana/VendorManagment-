// src/features/reports/reportsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialMonthlyEntries } from "../vendorMaster/dummyData";

// fetch report entries (simulated)
export const fetchReportEntries = createAsyncThunk(
  "reports/fetchEntries",
  async ({ year } = {}, { rejectWithValue }) => {
    try {
      // simulate latency (keep small)
      await new Promise((res) => setTimeout(res, 300));
      // filter initialMonthlyEntries by year (you can replace this with API)
      const entries = (initialMonthlyEntries || []).filter((e) => e.year === year || year == null);
      return entries;
    } catch (err) {
      return rejectWithValue("Failed to fetch report entries");
    }
  }
);

const initialState = {
  entries: [], // flat list of all monthly entries (SC + HS)
  loading: false,
  error: null,
  selectedYear: new Date().getFullYear(), // default
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // optional helper to set entries manually (useful in tests)
    setEntries: (state, action) => {
      state.entries = action.payload || [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchReportEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedYear, clearError, setEntries } = reportsSlice.actions;
export default reportsSlice.reducer;
