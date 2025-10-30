import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReusableTable from "../../components/common/ReusableTable";

// Define ProgressBarCell inside Procurement.jsx
const ProgressBarCell = ({ value, yearBudget }) => {
  const percentage = (value / yearBudget) * 100;
  const remainingPercentage = 100 - percentage;

  return (
    <Box sx={{ width: "100%", height: 20, bgcolor: "#f0f0f0", borderRadius: 1, overflow: "hidden", display: "flex" }}>
      <Tooltip title={`Used: ${percentage.toFixed(1)}% (₹${value})`} arrow>
        <Box
          sx={{
            width: `${percentage}%`,
            height: "100%",
            bgcolor: "error.main", // Red for used
            transition: "width 0.3s ease",
          }}
        />
      </Tooltip>
      <Tooltip title={`Remaining: ${remainingPercentage.toFixed(1)}% (₹${yearBudget - value})`} arrow>
        <Box
          sx={{
            width: `${remainingPercentage}%`,
            height: "100%",
            bgcolor: "success.main", // Green for remaining
            transition: "width 0.3s ease",
          }}
        />
      </Tooltip>
    </Box>
  );
};

const DEFAULT_DEPTS = [
  { id: "dept-1", name: "HR", description: "Human Resources", yearBudget: 500000, monthBudget: 42000 },
  { id: "dept-2", name: "IT", description: "Information Technology", yearBudget: 750000, monthBudget: 62500 },
  { id: "dept-3", name: "Finance", description: "Finance & Accounting", yearBudget: 400000, monthBudget: 33333 },
];

const STORAGE_KEYS_TO_CHECK = ["proc_depts_inr", "proc_depts"];
const STORAGE_KEY_WRITE = "proc_depts_inr";

const safeToString = (v, fallback = "") => {
  try {
    if (v == null) return fallback;
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  } catch {
    return fallback;
  }
};

const safeNumber = (v, fallback = 0) => {
  try {
    if (v == null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
};

const formatCurrencyINR = (v) => {
  const n = safeNumber(v, 0);
  try {
    return `₹${n.toLocaleString("en-IN")}`;
  } catch {
    return `₹${n}`;
  }
};

export default function Procurement() {
  const [depts, setDepts] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const emptyForm = { name: "", description: "", yearBudget: "", monthBudget: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    try {
      let loaded = null;
      for (const k of STORAGE_KEYS_TO_CHECK) {
        let raw = null;
        try {
          raw = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
        } catch {
          raw = null;
        }
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loaded = parsed;
            break;
          }
        } catch {
          // ignore parse error
        }
      }
      if (!loaded) {
        loaded = Array.isArray(DEFAULT_DEPTS) && DEFAULT_DEPTS.length > 0 ? DEFAULT_DEPTS : [];
      }
      const safeLoaded = (loaded || []).filter((x) => x && (typeof x.id === "string" || typeof x.id === "number"));
      setDepts(safeLoaded);
    } catch (err) {
      console.error("Procurement init error:", err);
      setDepts(DEFAULT_DEPTS || []);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_WRITE, JSON.stringify(depts));
      }
    } catch (e) {
      console.error("Failed to persist departments:", e);
    }
  }, [depts]);

  const openAdd = () => {
    setForm(emptyForm);
    setAddOpen(true);
  };
  const closeAdd = () => setAddOpen(false);

  const handleAddSubmit = () => {
    if (!form.name || !form.yearBudget) {
      alert("Please enter department name and year budget");
      return;
    }
    const newDept = {
      id: `dept-${Date.now()}`,
      name: safeToString(form.name, ""),
      description: safeToString(form.description, ""),
      yearBudget: safeNumber(form.yearBudget, 0),
      monthBudget: safeNumber(form.monthBudget, 0),
    };
    setDepts((s) => [newDept, ...(Array.isArray(s) ? s : [])]);
    setAddOpen(false);
  };

  const openEdit = (dept) => {
    if (!dept || (!dept.id && dept.id !== 0)) return;
    setEditingDept(dept);
    setForm({
      name: safeToString(dept.name, ""),
      description: safeToString(dept.description, ""),
      yearBudget: safeNumber(dept.yearBudget, ""),
      monthBudget: safeNumber(dept.monthBudget, ""),
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditingDept(null);
    setEditOpen(false);
  };

  const handleEditSubmit = () => {
    if (!editingDept) return;
    const updated = (Array.isArray(depts) ? depts : []).map((d) =>
      d && (d.id === editingDept.id)
        ? {
            ...d,
            name: safeToString(form.name, ""),
            description: safeToString(form.description, ""),
            yearBudget: safeNumber(form.yearBudget, 0),
            monthBudget: safeNumber(form.monthBudget, 0),
          }
        : d
    );
    setDepts(updated);
    closeEdit();
  };

  const handleDelete = (id) => {
    try {
      if (!window.confirm("Delete this department?")) return;
      setDepts((s) => (Array.isArray(s) ? s.filter((d) => d && d.id !== id) : []));
    } catch (e) {
      console.error("Error deleting department:", e);
    }
  };

  const columns = [
    { accessorKey: "name", header: "Department" },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "yearBudget",
      header: "Yearly Budget",
      Cell: ({ row }) => formatCurrencyINR(row.original.yearBudget),
    },
    {
      accessorKey: "monthBudget",
      header: "Monthly Budget",
      Cell: ({ row }) => formatCurrencyINR(row.original.monthBudget),
    },
    {
      accessorKey: "trackBudget",
      header: "Track Budget",
      Cell: ({ row }) => (
        <ProgressBarCell value={row.original.monthBudget} yearBudget={row.original.yearBudget} />
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      Cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton onClick={() => openEdit(row.original)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={() => handleDelete(row.original.id)} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: "1.3rem", md: "1.7rem" }, fontWeight: 700 }}>
            Procurement Departments
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.4 }}>
            Manage department budgets for the year and month. Click Update to modify values.
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{
              textTransform: "none",
              backgroundColor: "var(--primary)",
              "&:hover": { filter: "brightness(0.92)" },
              fontSize: "0.85rem",
              py: 0.6,
              px: 1.4,
            }}
          >
            Add Department
          </Button>
        </Box>
      </Box>

      {(!Array.isArray(depts) || depts.length === 0) ? (
        <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="h6">No departments found</Typography>
          <Typography sx={{ mt: 1 }}>Click Add Department to create the first department.</Typography>
        </Box>
      ) : (
        <ReusableTable
          columns={columns}
          data={depts}
        />
      )}

      <Dialog open={addOpen} onClose={closeAdd} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: "1.02rem" }}>Add Department</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Department Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Short Description"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <TextField
              label="Year Budget (number)"
              value={form.yearBudget}
              onChange={(e) => setForm((s) => ({ ...s, yearBudget: e.target.value }))}
              type="number"
              fullWidth
              size="small"
            />
            <TextField
              label="Month Budget (number)"
              value={form.monthBudget}
              onChange={(e) => setForm((s) => ({ ...s, monthBudget: e.target.value }))}
              type="number"
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdd} size="small">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddSubmit} size="small">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: "1.02rem" }}>
          {editingDept ? `Update Budget — ${safeToString(editingDept.name, "Department")}` : "Update Budget"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Department Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Short Description"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <TextField
              label="Year Budget (number)"
              value={form.yearBudget}
              onChange={(e) => setForm((s) => ({ ...s, yearBudget: e.target.value }))}
              type="number"
              fullWidth
              size="small"
            />
            <TextField
              label="Month Budget (number)"
              value={form.monthBudget}
              onChange={(e) => setForm((s) => ({ ...s, monthBudget: e.target.value }))}
              type="number"
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} size="small">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEditSubmit} size="small">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
