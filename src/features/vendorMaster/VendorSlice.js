// src/features/vendorMaster/VendorSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { initialVendors } from "./dummyData";

const generateVendorCode = (vendors, type) => {
  const existingCodes = vendors
    .filter((v) => v.type === type)
    .map((v) => parseInt(v.vendor_code.split("_")[1]))
    .sort((a, b) => b - a);

  const nextNumber = existingCodes.length > 0 ? existingCodes[0] + 1 : 1;
  return `${type}_${nextNumber.toString().padStart(2, "0")}`;
};

export const fetchVendors = createAsyncThunk(
  "vendors/fetchVendors",
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return initialVendors;
    } catch (error) {
      return rejectWithValue("Failed to fetch vendors");
    }
  }
);

export const createVendor = createAsyncThunk(
  "vendors/createVendor",
  async (vendorData, { getState, rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const state = getState();
      const existingVendors = state.vendors.items;

      const vendor_code = generateVendorCode(existingVendors, vendorData.type);

      const newVendor = {
        id: `vendor-${Date.now()}`,
        vendor_code,
        ...vendorData,
      };

      return newVendor;
    } catch (error) {
      return rejectWithValue("Failed to create vendor");
    }
  }
);

export const updateVendor = createAsyncThunk(
  "vendors/updateVendor",
  async ({ id, ...vendorData }, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, ...vendorData };
    } catch (error) {
      return rejectWithValue("Failed to update vendor");
    }
  }
);

export const deleteVendor = createAsyncThunk(
  "vendors/deleteVendor",
  async (vendorId, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return vendorId;
    } catch (error) {
      return rejectWithValue("Failed to delete vendor");
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const vendorSlice = createSlice({
  name: "vendors",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        const index = state.items.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.items = state.items.filter((v) => v.id !== action.payload);
      });
  },
});

export const { clearError } = vendorSlice.actions;
export default vendorSlice.reducer;
