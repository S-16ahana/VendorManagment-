// src/components/layout/Sidebar.jsx
import React, { useMemo, useCallback, useState } from "react";
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
import Collapse from "@mui/material/Collapse";

import MenuIcon from "@mui/icons-material/Menu";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BarChartIcon from "@mui/icons-material/BarChart";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PaymentIcon from "@mui/icons-material/Payment";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout as logoutAction } from "../../features/auth/LoginSlice";

const DEFAULT_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

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
const footerBoxSx = (collapsed) => ({
  p: collapsed ? 1 : 2,
  display: "flex",
  justifyContent: collapsed ? "center" : "flex-start",
});

function SidebarMui({ mobileOpen, onClose, collapsed = false, onToggleCollapse }) {
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const width = collapsed ? COLLAPSED_WIDTH : DEFAULT_WIDTH;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((s) => s.auth || {});
  const role = user?.role || "";

  // Procurement submenu items (preserve the items from the screenshot)
  const procurementSubmenus = [
    { label: "Demand Requisition", path: "/procurement/demand-requisition" },
    { label: "Purch. Requisition", path: "/procurement/purch-requisition" },
    { label: "Service Bill", path: "/procurement/service-bill" },
    { label: "Purchase Order", path: "/procurement/purchase-order" },
    { label: "Services Invoice", path: "/procurement/services-invoice" },
    { label: "GRN Detail", path: "/procurement/grn-detail" },
    { label: "Purchase Return", path: "/procurement/purchase-return" },
  ];

  // Build visible menus based on role. Procurement should be last for admin.
  let visibleMenus = [];

  if (role === "admin") {
    visibleMenus = [
      { label: "Reports", path: "/reports", Icon: BarChartIcon },
      { label: "Vendor Master", path: "/vendors", Icon: BusinessIcon },
      { label: "Subcontractors", path: "/subcontractors", Icon: PeopleIcon },
      { label: "Hiring Services", path: "/hiring", Icon: LocalShippingIcon },
      { label: "Payments", path: "/payments", Icon: PaymentIcon },
      // procurement intentionally last for admin
      { label: "Procurement", path: "/procurement", Icon: LocalShippingIcon, hasSubmenu: true },
    ];
  } else if (role === "user") {
    visibleMenus = [
      { label: "Reports", path: "/reports", Icon: BarChartIcon },
      { label: "Vendor Master", path: "/vendors", Icon: BusinessIcon },
      { label: "Subcontractors", path: "/subcontractors", Icon: PeopleIcon },
      { label: "Hiring Services", path: "/hiring", Icon: LocalShippingIcon },
      { label: "Payments", path: "/payments", Icon: PaymentIcon },
    ];
  } else if (role === "procurement") {
    visibleMenus = [
      { label: "Vendor Master", path: "/vendors", Icon: BusinessIcon },
      { label: "Procurement", path: "/procurement", Icon: LocalShippingIcon, hasSubmenu: true },
    ];
  }

  // Open procurement submenu if current location is inside /procurement
  const initialProcurementOpen = location.pathname.startsWith("/procurement");
  const [procurementOpen, setProcurementOpen] = useState(initialProcurementOpen);

  const handleToggleProcurement = () => {
    // don't open submenus when sidebar is collapsed (keeps UX consistent)
    if (collapsed) return;
    setProcurementOpen((s) => !s);
  };

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
      <Box
        sx={{
          width,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          px: collapsed ? 0 : 2,
        }}
      >
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
          {visibleMenus.map(({ label, path, Icon, hasSubmenu }) => {
            // Special rendering for Procurement (with submenu)
            if (hasSubmenu) {
              // top-level procurement button
              return (
                <Box key={path}>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={handleToggleProcurement}
                      component={NavLink}
                      to={path}
                      sx={{
                        px: collapsed ? 1.25 : 1.5,
                        "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                        "&.active": { backgroundColor: "rgba(255,255,255,0.06)" },
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Tooltip title={collapsed ? label : ""} placement="right" disableHoverListener={!collapsed}>
                          <ListItemIcon sx={{ minWidth: 36, justifyContent: "center", color: "inherit" }}>
                            <Icon />
                          </ListItemIcon>
                        </Tooltip>

                        {!collapsed && (
                          <ListItemText primary={label} sx={{ color: "inherit", fontWeight: 500 }} />
                        )}
                      </Box>

                      {/* expand icon only when not collapsed */}
                      {!collapsed && (procurementOpen ? <ExpandLess /> : <ExpandMore />)}
                    </ListItemButton>
                  </ListItem>

                  {/* Nested submenu (hidden when collapsed) */}
                  <Collapse in={procurementOpen && !collapsed} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {procurementSubmenus.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <ListItem key={item.path} disablePadding>
                            <ListItemButton
                              component={NavLink}
                              to={item.path}
                              sx={{
                                px: 4,
                                py: 1,
                                "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
                                backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                                color: "inherit",
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 24, justifyContent: "flex-start", color: "inherit" }}>
                                {/* small dot icon like in the screenshot */}
                                <FiberManualRecordIcon sx={{ fontSize: 10, opacity: isActive ? 1 : 0.6 }} />
                              </ListItemIcon>
                              <ListItemText primary={item.label} sx={{ color: "inherit", fontSize: 13 }} />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            }

            // default menu item rendering
            return (
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
            );
          })}
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
    // dependencies: include everything referenced inside
    [width, collapsed, procurementOpen, location.pathname, visibleMenus, handleHeaderClick, isLgUp, onClose, onToggleCollapse, handleLogout]
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
