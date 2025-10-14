import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import Loader from "../../components/common/Loader"; // suspense fallback
import {
  fetchHiringEntries,
  createHiringEntry,
  updateHiringEntry,
  deleteHiringEntry,
  setSelectedPeriod,
} from "./hiringSlice";

import { fetchVendors } from "../vendorMaster/VendorSlice"; // ensure vendors slice exists
import { replayPaidPaymentsForPeriod } from "../payments/paymentSlice"; // NEW: replay paid payments into entries

// Lazy load heavy table & modal to reduce initial bundle
const ReusableTable = lazy(() => import("../../components/common/ReusableTable"));
const MonthlyEntryModal = lazy(() => import("../subContractor/MonthlyEntryModal"));

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function Hiring() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { entries = [], loading, error, selectedYear, selectedMonth } = useSelector((s) => s.hiring);
  // also take vendors loading flag
  const { items: vendors = [], loading: vendorsLoading = false } = useSelector((s) => s.vendors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // fetch hiring entries, then replay any paid payments stored in localStorage for the same period
    dispatch(fetchHiringEntries({ year: selectedYear, month: selectedMonth }))
      .then(() => {
        dispatch(replayPaidPaymentsForPeriod({ year: selectedYear, month: selectedMonth }));
      })
      .catch((err) => {
        console.warn("Failed to load hiring entries", err);
      });

    // ensure vendors are loaded if not already present
    if (!vendors || vendors.length === 0) {
      dispatch(fetchVendors());
    }
  }, [dispatch, selectedYear, selectedMonth, vendors]);

  const hsVendors = useMemo(() => vendors.filter((v) => v.type === "HS"), [vendors]);

  const formatCurrency = useCallback((amount) => (amount ? `₹${amount.toLocaleString("en-IN")}` : "₹0"), []);

  const tableData = useMemo(
    () =>
      (entries || []).map((entry) => {
        const vendor = vendors.find((v) => v.vendor_code === entry.vendor_code);
        return { ...entry, vendor_name: vendor?.vendor_name || entry.vendor_code, work_type: vendor?.work_type || "" };
      }),
    [entries, vendors]
  );

  // handlers (stable via useCallback)
  const handleEdit = useCallback((entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!id) return;
      if (window.confirm("Are you sure you want to delete this entry?")) {
        // dispatch delete and rely on slice reducer to remove from state.entries
        await dispatch(deleteHiringEntry(id));
        // DO NOT refetch here — refetch from static/dummy will overwrite local state
      }
    },
    [dispatch]
  );

  const handleAdd = useCallback(() => {
    setEditingEntry(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (entryData) => {
      // If editingEntry present -> update, else create
      if (editingEntry) {
        await dispatch(updateHiringEntry({ id: editingEntry.id, ...entryData }));
      } else {
        await dispatch(createHiringEntry({ ...entryData, year: selectedYear, month: selectedMonth }));
      }
      // close modal and rely on thunks' fulfilled reducers to update entries
      setModalOpen(false);
      setEditingEntry(null);
      // DO NOT re-fetch here to avoid overwriting state with static dummy source
    },
    [dispatch, editingEntry, selectedYear, selectedMonth]
  );

  const handlePeriodChange = useCallback(
    (field, value) =>
      dispatch(
        setSelectedPeriod({
          year: field === "year" ? value : selectedYear,
          month: field === "month" ? value : selectedMonth,
        })
      ),
    [dispatch, selectedYear, selectedMonth]
  );

  // columns: include handlers in deps so closures are fresh
  const columns = useMemo(
    () => [
      {
        accessorKey: "vendor_code",
        header: "Vendor Code",
        minSize: 90,
        muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
        Cell: ({ row }) => <Chip label={row.original.vendor_code} color="primary" size="small" />,
      },
      { accessorKey: "vendor_name", header: "Vendor Name", minSize: 180, grow: 2, muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } } },
      { accessorKey: "particular", header: "Machinery/Vehicle", minSize: 160, grow: 2, muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } } },
      // add in the columns array (e.g. after vendor_name or after particular)
    {
      accessorKey: "invoice_date",
      header: "Invoice Date",
      minSize: 120,
      Cell: ({ row }) => (row.original.invoice_date ? new Date(row.original.invoice_date).toLocaleDateString() : ""),
    },
    {
      accessorKey: "ra_bill_no",
      header: "RA Bill No",
      minSize: 130,
      Cell: ({ row }) => row.original.ra_bill_no || "",
    },

      { accessorKey: "bill_type", header: "Bill Type", minSize: 110 },
      {
        accessorKey: "gross_amount",
        header: "GROSS",
        minSize: 120,
        Cell: ({ row }) => <Box sx={{ textAlign: "right", fontWeight: 500 }}>{formatCurrency(row.original.gross_amount)}</Box>,
      },
      {
        accessorKey: "gst_amount",
        header: "GST 18%",
        minSize: 110,
        Cell: ({ row }) => <Box sx={{ textAlign: "right", color: "orange.main" }}>{formatCurrency(row.original.gst_amount)}</Box>,
      },
      {
        accessorKey: "total_amount",
        header: "TOTAL",
        minSize: 120,
        Cell: ({ row }) => <Box sx={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(row.original.total_amount)}</Box>,
      },
      {
        accessorKey: "tds",
        header: "TDS 2%",
        minSize: 100,
        Cell: ({ row }) => <Box sx={{ textAlign: "right", color: "error.main" }}>{formatCurrency(row.original.tds)}</Box>,
      },
      {
        accessorKey: "debit_deduction",
        header: "Debit/Deduction",
        minSize: 120,
        Cell: ({ row }) => <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original.debit_deduction)}</Box>,
      },
      {
        accessorKey: "gst_hold",
        header: "GST Hold",
        minSize: 110,
        Cell: ({ row }) => <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original.gst_hold)}</Box>,
      },
      {
        accessorKey: "other_deductions",
        header: "Others",
        minSize: 100,
        Cell: ({ row }) => <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original.other_deductions)}</Box>,
      },
      {
        accessorKey: "advances",
        header: "Advances",
        minSize: 110,
        Cell: ({ row }) => <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original.advances)}</Box>,
      },
      {
        accessorKey: "part_paid",
        header: "Bal/Part Paid",
        minSize: 120,
        Cell: ({ row }) => <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original.part_paid)}</Box>,
      },
      {
        accessorKey: "payables",
        header: "Payables",
        minSize: 130,
        Cell: ({ row }) => (
          <Box sx={{ textAlign: "right", fontWeight: 700, color: row.original.payables > 0 ? "error.main" : "success.main" }}>
            {formatCurrency(row.original.payables)}
          </Box>
        ),
      },
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              enableSorting: false,
              minSize: 100,
              muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
              Cell: ({ row }) => {
                const entry = row.original;
                return (
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton size="small" color="primary" onClick={() => handleEdit(entry)} title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)} title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [formatCurrency, handleEdit, handleDelete, isAdmin]
  );

  const totals = useMemo(
    () =>
      (entries || []).reduce(
        (acc, e) => ({
          gross: acc.gross + (e.gross_amount || 0),
          gst: acc.gst + (e.gst_amount || 0),
          total: acc.total + (e.total_amount || 0),
          net: acc.net + (e.net_total || 0),
          payables: acc.payables + (e.payables || 0),
        }),
        { gross: 0, gst: 0, total: 0, net: 0, payables: 0 }
      ),
    [entries]
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600, color: "primary.main", mb: 2 }}>
          Machinery/Vehicles Hiring Service
        </Typography>

        {/* Period Selection & Add */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(e) => handlePeriodChange("year", e.target.value)}>
                <MenuItem value={2024}>2024</MenuItem>
                <MenuItem value={2025}>2025</MenuItem>
                <MenuItem value={2026}>2026</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} label="Month" onChange={(e) => handlePeriodChange("month", e.target.value)}>
                {monthNames.map((m, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h6" sx={{ ml: 2 }}>
              {monthNames[selectedMonth - 1]} {selectedYear}
            </Typography>
          </Box>

          <Button variant="contained" onClick={handleAdd}>
            + Add Entry
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, overflow: "hidden", boxShadow: 1 }}>
        <Suspense fallback={<Loader message="Loading table..." />}>
          <ReusableTable
            columns={columns}
            data={tableData}
            options={{
              maxHeight: "55vh",
              enablePagination: true,
              enableSorting: true,
              enableColumnFilters: true,
              enableGlobalFilter: true,
              getRowId: (row) => row.id ?? `${row.vendor_code}-${row.particular ?? ""}`, // stable id fallback
              initialState: { pagination: { pageSize: 15 }, density: "compact" },
              state: { isLoading: loading },
              muiTableProps: { sx: { tableLayout: "fixed", "& .MuiTableCell-root": { fontSize: "0.875rem" } } },
              muiTableContainerProps: { sx: { maxHeight: "55vh", overflowX: "auto" } },
            }}
          />
        </Suspense>
      </Box>

      {/* Monthly Entry Modal */}
      <Suspense fallback={<Loader message="Loading dialog..." />}>
        <MonthlyEntryModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingEntry(null);
          }}
          type="HS"
          vendors={hsVendors}
          vendorsLoading={vendorsLoading} // <- pass the vendors loading flag
          initialData={editingEntry || { tds_rate: 0.02 }}
          onSave={handleSave}
        />
      </Suspense>
    </Box>
  );
}

export default React.memo(Hiring);
