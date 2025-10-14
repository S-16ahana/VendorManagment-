// src/components/common/Loader.jsx
import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

const Loader = ({ message = "Loading..." }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "200px",
        gap: 2,
      }}
    >
      <CircularProgress color="primary" size={40} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default Loader;
