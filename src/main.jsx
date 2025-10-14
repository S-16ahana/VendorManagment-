// src/main.jsx
import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import App from "./App.jsx";
import store from "./store/store"; // ensure src/store/index.js or src/store.js exports the store as default
import "./index.css";

// Optional: create a small theme so MUI components look consistent with your CSS vars
const theme = createTheme({
  palette: {
    primary: {
      main:
        getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          ?.trim() || "#1976d2",
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
