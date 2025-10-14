// src/components/common/Button.jsx
import React from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import PropTypes from "prop-types";

const ReusableButton = ({
  children,
  variant = "contained",
  color = "primary",
  size = "medium",
  onClick,
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  loading = false,
  loadingIndicator,
  loadingPosition = "center",
  sx,
  type = "button",
  component,
  href,
  ...rest
}) => {
  const indicator = loadingIndicator || (
    <CircularProgress size={20} color="inherit" />
  );

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={loading && loadingPosition === "start" ? indicator : startIcon}
      endIcon={loading && loadingPosition === "end" ? indicator : endIcon}
      sx={sx}
      type={type}
      component={component}
      href={href}
      {...rest}
    >
      {loading && loadingPosition === "center" ? indicator : children}
    </Button>
  );
};

ReusableButton.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(["text", "contained", "outlined"]),
  color: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  loading: PropTypes.bool,
  loadingIndicator: PropTypes.node,
  loadingPosition: PropTypes.oneOf(["start", "end", "center"]),
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  component: PropTypes.elementType,
  href: PropTypes.string,
};

export default ReusableButton;
