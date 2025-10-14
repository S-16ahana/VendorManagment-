// src/features/auth/loginSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// built-in demo users (kept as defaults)
const VALID_USERS = [
  {
    email: "admin@gmail.com",
    password: "Admin@123",
    role: "admin",
    name: "Administrator",
  },
  {
    email: "user@gmail.com",
    password: "User@123",
    role: "user",
    name: "Standard User",
  },
];

// helper: get runtime users saved by admin (from localStorage)
function getStoredUsers() {
  try {
    const raw = localStorage.getItem("app_users");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse app_users from localStorage", e);
    return [];
  }
}

// Async thunk to simulate login call (checks VALID_USERS + stored users)
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // simulate latency
      await new Promise((res) => setTimeout(res, 600));

      const stored = getStoredUsers();
      // precedence: stored users override built-in if same email
      const merged = [...VALID_USERS.filter(u => !stored.find(su => su.email.toLowerCase() === u.email.toLowerCase())), ...stored];

      const found = merged.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.password === password
      );

      if (!found) {
        return rejectWithValue("Invalid email or password");
      }

      const token = btoa(`${found.email}:${Date.now()}`);

      return {
        user: {
          email: found.email,
          name: found.name,
          role: found.role,
        },
        token,
      };
    } catch (err) {
      return rejectWithValue("Login failed");
    }
  }
);

const initialState = {
  user: JSON.parse(localStorage.getItem("auth_user")) || null,
  token: localStorage.getItem("auth_token") || null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem("auth_token"),
};

const loginSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        localStorage.setItem("auth_user", JSON.stringify(action.payload.user));
        localStorage.setItem("auth_token", action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      });
  },
});

export const { logout, clearError } = loginSlice.actions;
export default loginSlice.reducer;
