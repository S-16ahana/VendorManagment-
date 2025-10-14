// src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store";
import Loader from "./components/common/Loader";
import DashboardLayout from "./components/layout/DashboardLayout";

// Lazy load pages
const VendorMaster = lazy(() => import("./features/vendorMaster/VenderMaster"));
const SubContractor = lazy(() => import("./features/subContractor/subContractor"));
const Hiring = lazy(() => import("./features/hiring/hiring"));
const Reports = lazy(() => import("./features/reports/Reports"));
const Payments = lazy(() => import("./features/payments/payment"));
const Login = lazy(() => import("./features/auth/Login"));
const Settings = lazy(() => import("./features/auth/Settings"));

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Suspense fallback={<Loader message="Loading application..." />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Redirect legacy /vendordashboard to new top-level vendors route */}
            <Route path="/vendordashboard" element={<Navigate to="/vendors" replace />} />
            <Route path="/vendordashboard/*" element={<Navigate to="/vendors" replace />} />

            {/* Dashboard layout — shared wrapper for authenticated app pages */}
            <Route path="/" element={<DashboardLayout />}>
              {/* default route -> /vendors */}
              <Route index element={<Navigate to="/vendors" replace />} />

              {/* App module pages (render inside DashboardLayout) */}
              <Route path="vendors" element={<VendorMaster />} />
              <Route path="subcontractors" element={<SubContractor />} />
              <Route path="hiring" element={<Hiring />} />
              <Route path="payments" element={<Payments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/vendors" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
