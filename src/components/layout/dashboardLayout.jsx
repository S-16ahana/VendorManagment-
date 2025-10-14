// src/components/layout/DashboardLayout.jsx
import React, { useState, useMemo, useEffect } from "react";
import Box from "@mui/material/Box";
import SidebarMui from "./Sidebar";
import HeaderMui from "./header";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function DashboardLayout() {
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((s) => s.auth || {});

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", collapsed ? "true" : "false");
    } catch {}
  }, [collapsed]);

  const currentPageName = useMemo(() => {
    const parts = location.pathname.split("/");
    const last = parts[parts.length - 1] || "";
    if (!last || last === "vendordashboard") return "Dashboard";
    return (
      decodeURIComponent(last).charAt(0).toUpperCase() +
      decodeURIComponent(last).slice(1)
    );
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleCollapse = () => setCollapsed((s) => !s);

  const drawerWidth = collapsed ? 72 : 260;

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh", // full viewport height
        overflow: "hidden", // prevent page scrollbars
        bgcolor: "transparent",
      }}
    >
      <SidebarMui
        mobileOpen={false}
        onClose={() => {}}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          ml: { lg: `${drawerWidth}px` },
          transition: (theme) =>
            theme.transitions.create(["margin"], { duration: 200 }),
          height: "100vh", // full height
          overflow: "hidden", // outer main shouldn't scroll
          bgcolor: "#f3f6f9",
        }}
      >
        <HeaderMui
          onToggleSidebar={() => {}}
          onToggleCollapse={toggleCollapse}
          currentPageName={currentPageName}
          collapsed={collapsed}
        />

        {/* scrollable content region */}
        <Box sx={{ p: 2, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
