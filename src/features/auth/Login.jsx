import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginUser, clearError } from "./LoginSlice";
import ReusableButton from "../../components/common/Button"; // keep your existing import path

// MUI
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

// Lucide icons
import { Eye, EyeOff } from "lucide-react";

// single generic illustration used for all cases
import loginIllustration from "../../assets/login-user.png";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth || {});

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Redirect after successful login (default vendor route)
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/vendordashboard");
    }
  }, [isAuthenticated, navigate]);

  // clear error when component unmounts
  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  // basic password validation: min 8 chars + at least one digit
  const validatePassword = (pwd) => {
    if (!pwd || pwd.length === 0) {
      return "Password is required";
    }
    if (pwd.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/\d/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));

    if (name === "password") {
      setPasswordError(validatePassword(value));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      alert("Please enter email and password");
      return;
    }

    const pwdErr = validatePassword(form.password);
    setPasswordError(pwdErr);
    if (pwdErr) return;

    dispatch(
      loginUser({
        email: form.email,
        password: form.password,
      })
    );
  };

  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Left image - hidden on small screens via CSS */}
        <div className="login-left">
          <img
            src={loginIllustration}
            alt="Login illustration"
            className="login-illustration"
          />
        </div>

        {/* Right form */}
        <div className="login-right">
          <div style={{ marginBottom: 18 }}>
            <h2 className="h2" style={{ margin: 0 }}>
              Login
            </h2>
            <p
              className="small"
              style={{ margin: "6px 0 0", color: "#6b7280" }}
            >
              Enter your email and password to continue
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ marginTop: 6, display: "flex", flexDirection: "column" }}
          >
            {/* Email */}
            <TextField
              name="email"
              value={form.email}
              onChange={handleChange}
              variant="outlined"
              label="Email"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              fullWidth
              margin="normal"
              className="mui-floating-input"
            />

            {/* Password with lucide eye toggle */}
            <TextField
              name="password"
              value={form.password}
              onChange={handleChange}
              variant="outlined"
              label="Password"
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              fullWidth
              margin="normal"
              className="mui-floating-input"
              error={!!passwordError}
              helperText={passwordError || ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={togglePasswordVisibility}
                      edge="end"
                      size="small"
                      sx={{ padding: 0.5 }}
                    >
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={2} />
                      ) : (
                        <Eye size={18} strokeWidth={2} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  color: "var(--danger, #d32f2f)",
                  marginTop: 10,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <ReusableButton
                type="submit"
                variant="contained"
                loading={!!loading}
                sx={{ minWidth: 140 }}
              >
                Login
              </ReusableButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
