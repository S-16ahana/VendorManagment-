// src/components/layout/Sidebar.jsx
import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import MenuIcon from "@mui/icons-material/Menu";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BarChartIcon from "@mui/icons-material/BarChart";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PaymentIcon from "@mui/icons-material/Payment";

import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout as logoutAction } from "../../features/auth/LoginSlice";

/* --- constants / static data (stable references) --- */
const DEFAULT_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

/**
 * NOTE:
 * - Dashboard menu removed (no /vendordashboard link)
 * - Paths are normalized to top-level routes (e.g. /vendors, /subcontractors)
 */
const menuItems = [
  { label: "Reports", path: "/reports", Icon: BarChartIcon },
  { label: "Vendor Master", path: "/vendors", Icon: BusinessIcon },
  { label: "Subcontractors", path: "/subcontractors", Icon: PeopleIcon },
  { label: "Hiring Services", path: "/hiring", Icon: LocalShippingIcon },
  { label: "Payments", path: "/payments", Icon: PaymentIcon },
];

const drawerPaperSx = (width, theme, isLgUp) => ({
  width,
  bgcolor: "var(--primary)",
  color: "#fff",
  border: "none",
  boxShadow: 6,
  borderRadius: isLgUp ? "0 12px 12px 0" : 0,
  transition: theme.transitions.create("width", { duration: 200 }),
  overflowX: "hidden",
});

const headerBoxSx = (collapsed) => ({
  px: 1,
  py: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

const headerInnerSx = (collapsed) => ({
  display: "flex",
  alignItems: "center",
  gap: collapsed ? 0 : 1.5,
  cursor: collapsed ? "pointer" : "default",
});

const listSx = { flex: 1, px: 0 };
const footerBoxSx = (collapsed) => ({ p: collapsed ? 1 : 2, display: "flex", justifyContent: collapsed ? "center" : "flex-start" });

function SidebarMui({ mobileOpen, onClose, collapsed = false, onToggleCollapse }) {
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const width = collapsed ? COLLAPSED_WIDTH : DEFAULT_WIDTH;

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleHeaderClick = useCallback(() => {
    if (collapsed && typeof onToggleCollapse === "function") onToggleCollapse();
  }, [collapsed, onToggleCollapse]);

  const handleLogout = useCallback(() => {
    try {
      dispatch(logoutAction());
    } catch (err) {
      console.warn("Logout dispatch failed", err);
    }
    if (!isLgUp && typeof onClose === "function") onClose();
    try {
      navigate("/login");
    } catch (err) {
      console.warn("Navigation to /login failed", err);
    }
  }, [dispatch, navigate, isLgUp, onClose]);

  const content = useMemo(
    () => (
      <Box sx={{ width, display: "flex", flexDirection: "column", height: "100%", px: collapsed ? 0 : 2 }}>
        {/* Header */}
        <Box sx={headerBoxSx(collapsed)}>
          <Box
            onClick={handleHeaderClick}
            role={collapsed ? "button" : undefined}
            tabIndex={collapsed ? 0 : -1}
            sx={headerInnerSx(collapsed)}
          >
            <BusinessIcon />
            {!collapsed && <Box sx={{ color: "white", fontWeight: "bold" }}>VMS</Box>}
          </Box>

          <IconButton sx={{ color: "white" }} onClick={isLgUp ? onToggleCollapse : onClose}>
            {isLgUp ? (collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />) : <MenuIcon />}
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

        {/* Menu */}
        <List sx={listSx}>
          {menuItems.map(({ label, path, Icon }) => (
            <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to={path}
                end={path === "/"}
                sx={{
                  px: collapsed ? 1.25 : 1.5,
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                  "&.active": { backgroundColor: "rgba(255,255,255,0.06)" },
                  color: "inherit",
                }}
              >
                <Tooltip title={collapsed ? label : ""} placement="right" disableHoverListener={!collapsed}>
                  <ListItemIcon sx={{ minWidth: 36, justifyContent: "center", color: "inherit" }}>
                    <Icon />
                  </ListItemIcon>
                </Tooltip>

                {!collapsed && <ListItemText primary={label} sx={{ color: "inherit", fontWeight: 500 }} />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Footer */}
        <Box sx={footerBoxSx(collapsed)}>
          <Tooltip title={collapsed ? "Logout" : ""} placement="right" disableHoverListener={!collapsed}>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                px: collapsed ? 1 : 0,
                width: collapsed ? "auto" : "100%",
                borderRadius: 1,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                color: "inherit",
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, justifyContent: "center", color: "inherit" }}>
                <LogoutIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary="Logout" sx={{ color: "inherit", fontWeight: 500 }} />}
            </ListItemButton>
          </Tooltip>
        </Box>
      </Box>
    ),
    [width, collapsed, handleHeaderClick, isLgUp, onClose, onToggleCollapse, handleLogout]
  );

  return (
    <Drawer
      variant={isLgUp ? "permanent" : "temporary"}
      open={isLgUp ? true : mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      anchor="left"
      sx={{ "& .MuiDrawer-paper": drawerPaperSx(width, theme, isLgUp) }}
    >
      {content}
    </Drawer>
  );
}

SidebarMui.propTypes = {
  mobileOpen: PropTypes.bool,
  onClose: PropTypes.func,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};

export default React.memo(SidebarMui);
