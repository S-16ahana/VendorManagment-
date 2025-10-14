// src/components/layout/header.jsx
import React, { Suspense, lazy } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { logout as logoutAction } from "../../features/auth/LoginSlice"; // ensure exact filename in FS

// lazy import not used for local routing; App registers /settings in App.jsx
// kept lazy import only if you want to use it elsewhere
const Settings = lazy(() => import("../../features/auth/Settings"));

export default function HeaderMui({
  onToggleSidebar = () => {},
  onToggleCollapse = () => {},
  currentPageName = "Dashboard",
  collapsed = false,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const { user } = useSelector((s) => s.auth || {});

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMobileMenuOpen = (e) => setMobileMoreAnchorEl(e.currentTarget);
  const handleMobileMenuClose = () => setMobileMoreAnchorEl(null);
  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleLogout = () => {
    dispatch(logoutAction());
    handleMenuClose();
    navigate("/login");
  };

  // detect admin
  const isAdmin = Boolean(user && (user.role === "admin" || user.isAdmin));

  const initials =
    (user?.name && user.name.charAt(0)) ||
    (user?.email && user.email.charAt(0)) ||
    "U";

  const menuId = "primary-account-menu";
  const mobileMenuId = "primary-account-menu-mobile";

  // Main menu: for admin show Settings + Logout; for others only Logout
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      id={menuId}
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      {isAdmin && (
        <MenuItem
          onClick={() => {
            handleMenuClose();
            // navigate to canonical route registered in App.jsx
            navigate("/settings");
          }}
        >
          Settings
        </MenuItem>
      )}

      <MenuItem onClick={handleLogout}>Logout</MenuItem>
    </Menu>
  );

  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      {isAdmin && (
        <MenuItem
          onClick={() => {
            handleMobileMenuClose();
            navigate("/settings");
          }}
        >
          <p className="small">Settings</p>
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          handleMobileMenuClose();
          handleLogout();
        }}
      >
        <p className="small">Logout</p>
      </MenuItem>
    </Menu>
  );

  const handleBack = () => {
    try {
      navigate(-1);
    } catch (err) {
      console.warn("Back navigation not available", err);
    }
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        className="app-header"
        sx={{ background: "transparent" }}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            px: { xs: 1, sm: 2, lg: 3 },
            gap: 2,
            minHeight: 64,
          }}
        >
          {/* LEFT */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: { xs: "auto", md: 320 },
              minWidth: { md: 320 },
            }}
          >
            <IconButton
              color="inherit"
              onClick={onToggleSidebar}
              sx={{ display: { lg: "none" }, color: "primary.main" }}
              aria-label="open drawer"
              size="small"
            >
              <MenuIcon />
            </IconButton>

            <IconButton
              color="inherit"
              onClick={handleBack}
              sx={{ color: "primary.main" }}
              size="small"
              aria-label="go back"
              title="Back"
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box>
                <Box
                  component="span"
                  sx={{
                    display: "block",
                    fontSize: { xs: "1.125rem", md: "1.25rem" },
                    fontWeight: 700,
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "primary.main",
                  }}
                >
                  {currentPageName}
                </Box>
                <Box
                  component="span"
                  className="small text-muted"
                  sx={{ marginTop: 0.25, display: "block" }}
                />
              </Box>
            </div>
          </Box>

          {/* CENTER */}
          <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }} />

          {/* RIGHT */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: { xs: "auto", md: 320 },
              minWidth: { md: 320 },
              justifyContent: "flex-end",
            }}
          >
            <IconButton
              edge="end"
              aria-label="account"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{
                ml: 0.5,
                bgcolor: "transparent",
                color: "primary.main",
              }}
              size="small"
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "primary.main",
                  fontSize: 14,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>

        {renderMobileMenu}
        {renderMenu}
      </AppBar>
    </>
  );
}
