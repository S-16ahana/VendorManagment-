// src/features/auth/Settings.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Stack,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReusableButton from "../../components/common/Button";
import ModalForm from "../../components/common/ModalForm";

/**
 * Admin settings UI (demo/local):
 * - shows built-in + stored users
 * - create new user (stored to localStorage 'app_users')
 * - change/reset password (writes to 'app_users' so login accepts it)
 *
 * NOTE: Storing plain passwords in localStorage is only for demo. Use a real backend & hashing for production.
 */

// --- constants ---
const BUILT_IN = [
  { email: "admin@gmail.com", name: "Administrator", role: "admin", password: "Admin@123" },
  { email: "user@gmail.com", name: "Standard User", role: "user", password: "User@123" },
];

// --- helpers ---
const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem("app_users");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("parse app_users failed", e);
    return [];
  }
};

const persistUsersToLocalStorage = (list) => {
  try {
    localStorage.setItem("app_users", JSON.stringify(list));
  } catch (e) {
    console.error("failed to persist app_users", e);
  }
};

export default function Settings() {
  const userRole = useSelector((s) => s.auth?.user?.role);
  const userName = useSelector((s) => s.auth?.user?.name);
  // Wait for authentication state to avoid premature redirect
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);

  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [storedUsers, setStoredUsersState] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // memoized field definitions (stable references)
  const createFields = useMemo(
    () => [
      { name: "name", label: "Full name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      {
        name: "password",
        label: "Password",
        type: "password",
        required: true,
        helperText: "Min 8 chars, include a digit",
      },
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        options: [
          { value: "user", label: "User" },
          { value: "admin", label: "Admin" },
        ],
      },
    ],
    []
  );

  const pwFields = useMemo(
    () => [{ name: "password", label: "New Password", type: "password", required: true }],
    []
  );

  // merge built-in + stored
  const refreshUsers = () => {
    const stored = getStoredUsers();
    setStoredUsersState(stored);

    const merged = [
      ...BUILT_IN.filter(
        (b) => !stored.find((su) => su.email.toLowerCase() === b.email.toLowerCase())
      ),
      ...stored,
    ];
    setUsers(merged);
  };

  const saveStoredUsers = (list) => {
    persistUsersToLocalStorage(list);
    setStoredUsersState(list);

    const merged = [
      ...BUILT_IN.filter(
        (b) => !list.find((su) => su.email.toLowerCase() === b.email.toLowerCase())
      ),
      ...list,
    ];
    setUsers(merged);
  };

  // only run when auth state / userRole changes
  useEffect(() => {
    // If we explicitly know the user is unauthenticated, send them to login
    if (isAuthenticated === false) {
      navigate("/login");
      return;
    }

    // If auth is known and user is not admin redirect to vendors
    if (isAuthenticated && userRole && userRole !== "admin") {
      navigate("/vendors");
      return;
    }

    // If authenticated and admin - load users
    if (isAuthenticated && userRole === "admin") {
      refreshUsers();
    }
    // NOTE: if isAuthenticated is undefined (still loading), do nothing — avoids premature redirect
  }, [isAuthenticated, userRole, navigate]);

  // handlers
  const handleCreateUser = async (values) => {
    const email = (values.email || "").toLowerCase().trim();
    if (!email) throw new Error("Email required");

    if (!values.password || values.password.length < 8 || !/\d/.test(values.password)) {
      throw new Error("Password must be at least 8 chars and contain a number");
    }

    const stored = getStoredUsers();
    if (stored.find((u) => u.email.toLowerCase() === email)) {
      throw new Error("User with this email already exists.");
    }

    const nextStored = [
      ...stored,
      {
        name: values.name,
        email,
        password: values.password,
        role: values.role || "user",
      },
    ];

    saveStoredUsers(nextStored);
    setCreateOpen(false);
  };

  const handleOpenChangePassword = (u) => {
    setEditingUser(u);
    setPwOpen(true);
  };

  const handleChangePassword = async ({ password }) => {
    if (!editingUser) throw new Error("No user selected");

    if (!password || password.length < 8 || !/\d/.test(password)) {
      throw new Error("Password must be at least 8 chars and contain a number");
    }

    const stored = getStoredUsers();
    const email = editingUser.email.toLowerCase();
    const idx = stored.findIndex((u) => u.email.toLowerCase() === email);

    if (idx >= 0) {
      stored[idx] = { ...stored[idx], password };
    } else {
      stored.push({
        email,
        name: editingUser.name || editingUser.email,
        role: editingUser.role || "user",
        password,
      });
    }

    saveStoredUsers(stored);
    setPwOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (u) => {
    const stored = getStoredUsers();
    const next = stored.filter((s) => s.email.toLowerCase() !== u.email.toLowerCase());
    saveStoredUsers(next);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Settings
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Signed in as <strong>{userName || "Admin"}</strong>. Create users and manage
        passwords (demo/local).
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <ReusableButton onClick={() => setCreateOpen(true)}>Create New User</ReusableButton>
      </Stack>

      <Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Source</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => {
              const isStored = storedUsers.find(
                (s) => s.email.toLowerCase() === u.email.toLowerCase()
              );
              return (
                <TableRow key={u.email}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{isStored ? "Stored" : "Built-in"}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenChangePassword(u)}
                      title="Change password"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {isStored && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(u)}
                        title="Delete stored user"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      {/* Create user modal */}
      <ModalForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        fields={createFields}
        onSubmit={handleCreateUser}
        submitText="Create user"
      />

      {/* Password modal */}
      <ModalForm
        open={pwOpen}
        onClose={() => {
          setPwOpen(false);
          setEditingUser(null);
        }}
        title={`Set password for ${editingUser?.email || ""}`}
        fields={pwFields}
        onSubmit={handleChangePassword}
        submitText="Save password"
      />
    </Box>
  );
}
