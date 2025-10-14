// CHANGES: handleSave no longer re-fetches entries after create/update — prevents overwriting newly added row.

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

import Loader from "../../components/common/Loader";
import VendorViewModal from "../../components/common/VendorViewModal";

import {
  fetchSubcontractorEntries,
  createSubcontractorEntry,
  updateSubcontractorEntry,
  deleteSubcontractorEntry,
  setSelectedPeriod,
} from "./subContractorSlice";

import { fetchVendors } from "../vendorMaster/VendorSlice";
import { replayPaidPaymentsForPeriod } from "../payments/paymentSlice"; // NEW: replay paid payments into entries

const ReusableTable = lazy(() => import("../../components/common/ReusableTable"));
const MonthlyEntryModal = lazy(() => import("./MonthlyEntryModal"));

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const SubContractor = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { entries = [], loading, error, selectedYear, selectedMonth } =
    useSelector((s) => s.subcontractor);
  const { items: vendors = [], loading: vendorsLoading = false } = useSelector((s) => s.vendors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const isAdmin = user?.role === "admin";

  // --- Vendor history modal state & cache ---
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorModalVendor, setVendorModalVendor] = useState(null);
  const [vendorHistoryCache, setVendorHistoryCache] = useState({}); // keyed by vendor_code or vendor id

  useEffect(() => {
    // initial load for the selected period, then replay any paid payments for that period
    dispatch(fetchSubcontractorEntries({ year: selectedYear, month: selectedMonth }))
      .then(() => {
        dispatch(replayPaidPaymentsForPeriod({ year: selectedYear, month: selectedMonth }));
      })
      .catch((err) => {
        console.warn("Failed to load subcontractor entries", err);
      });

    if (!vendors || vendors.length === 0) {
      dispatch(fetchVendors());
    }
  }, [dispatch, selectedYear, selectedMonth, vendors]);

  const scVendors = useMemo(() => vendors.filter((v) => v.type === "SC"), [vendors]);

  const formatCurrency = useCallback((a) => (a || a === 0 ? `₹${Number(a).toLocaleString("en-IN")}` : "₹0"), []);

  const tableData = useMemo(
    () =>
      (entries || []).map((e) => {
        const v = vendors.find((v) => v.vendor_code === e.vendor_code);
        return {
          ...e,
          vendor_name: v?.vendor_name || e.vendor_code,
          work_type: v?.work_type || "",
          // ensure these always exist
          invoice_date: e.invoice_date ? String(e.invoice_date) : "",
          ra_bill_no: e.ra_bill_no ? String(e.ra_bill_no) : "",
        };
      }),
    [entries, vendors]
  );

  const handleEdit = useCallback((entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!id) return;
      if (window.confirm("Are you sure you want to delete this entry?")) {
        const res = await dispatch(deleteSubcontractorEntry(id));
        if (res?.payload || res?.meta?.requestStatus === "fulfilled") {
          // Re-fetch after delete to sync with source of truth
          dispatch(fetchSubcontractorEntries({ year: selectedYear, month: selectedMonth }));
        }
      }
    },
    [dispatch, selectedYear, selectedMonth]
  );

  const handleAdd = useCallback(() => {
    setEditingEntry(null);
    setModalOpen(true);
  }, []);

  /**
   * handleSave
   * - For create: dispatch createSubcontractorEntry. The slice's fulfilled reducer already adds (unshift) the new entry to state.entries.
   * - For update: dispatch updateSubcontractorEntry. The slice's fulfilled reducer will replace the item.
   * - IMPORTANT: DO NOT re-fetch immediately afterwards — re-fetch overwrites the slice state (which may come from dummy initialMonthlyEntries).
   */
  const handleSave = useCallback(
    async (entryData) => {
      if (editingEntry) {
        const res = await dispatch(updateSubcontractorEntry({ id: editingEntry.id, ...entryData }));
        // optional: check res.meta.requestStatus for error handling
      } else {
        const res = await dispatch(createSubcontractorEntry({ ...entryData, year: selectedYear, month: selectedMonth }));
        // The slice's createSubcontractorEntry.fulfilled handler unshifts the payload into state.entries,
        // so the UI will update from the store — no need to dispatch fetchSubcontractorEntries here.
        // If your backend is the real source-of-truth, you'd typically await API create and then re-fetch,
        // but in this mocked setup re-fetching pulls from initialMonthlyEntries and overwrites the new entry.
      }
      setModalOpen(false);
      setEditingEntry(null);

      // Do NOT fetch entries here. If you truly need to re-sync from server/backend, call fetchSubcontractorEntries,
      // but when using the local slice unshift approach, avoid re-fetch to prevent overwriting.
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

  // ---------------------
  // Vendor modal helpers
  // ---------------------
  const openVendorModal = useCallback((vendorObj) => {
    setVendorModalVendor(vendorObj);
    setVendorModalOpen(true);
  }, []);

  const closeVendorModal = useCallback(() => {
    setVendorModalOpen(false);
    setVendorModalVendor(null);
  }, []);

  // fetchVendorHistory is passed to VendorViewModal. Replace fetch URL or wire a redux action as needed.
  const fetchVendorHistory = useCallback(
    async (vendorIdOrCode) => {
      // Determine key: prefer vendor_code, fallback to id
      const key = vendorIdOrCode;
      if (!key) return { subcontracts: [], hiring: [] };

      // Return cached if available
      if (vendorHistoryCache[key]) return vendorHistoryCache[key];

      // Example: try to fetch from API endpoint (replace with your real API)
      try {
        // If your vendors use vendor_code as identifier, pass that.
        const resp = await fetch(`/api/vendors/${encodeURIComponent(key)}/history`);
        if (resp.ok) {
          const json = await resp.json();
          setVendorHistoryCache((s) => ({ ...s, [key]: json }));
          return json;
        }
      } catch (err) {
        // fetch failed — we'll fallback below
        console.warn("Vendor history fetch failed (will fallback to local entries):", err);
      }

      // Fallback: build history from currently loaded entries in store.
      // Note: this only includes the currently loaded period (selectedYear/Month) unless you load all entries in your slice.
      const matched = (entries || []).filter((row) => row.vendor_code === key || row.vendor_name === key);

      // Map matched to subcontract shape and group to subcontracts/hiring if you have type flag.
      // Here we treat all as subcontracts for fallback — adapt as needed.
      const fallback = {
        subcontracts: matched.map((m, idx) => ({
          id: m.id ?? `${key}-fallback-${idx}`,
          vendor_name: m.vendor_name,
          particular: m.particular,
          bill_type: m.bill_type,
          gross_amount: m.gross_amount,
          gst18: m.gst_amount ?? 0,
          total: m.total_amount ?? 0,
          tds: m.tds ?? 0,
          debit: m.debit_deduction ?? 0,
          retn_money: m.retention ?? 0,
          gst_hold: m.gst_hold ?? 0,
          with_hold: m.with_hold ?? 0,
          net_total: m.net_total ?? 0,
          advances: m.advances ?? 0,
          part_paid: m.part_paid ?? 0,
          payables: m.payables ?? 0,
        })),
        hiring: [], // fallback empty - replace with real hiring data if available
      };
      setVendorHistoryCache((s) => ({ ...s, [key]: fallback }));
      return fallback;
    },
    [vendorHistoryCache, entries]
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "vendor_code",
        header: "Vendor Code",
        minSize: 80,
        maxSize: 140,
        muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
        Cell: ({ row }) => <Chip label={row.original.vendor_code} color="primary" size="small" />,
      },
      {
        accessorKey: "vendor_name",
        header: "Vendor Name",
        minSize: 180,
        size: 250,
        grow: 2,
        muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
        Cell: ({ row }) => {
          const v = row.original;
          // Clicking the name opens the vendor history modal
          return (
            <Typography
              sx={{ cursor: "pointer",  display: "inline-block" }}
              onClick={() => openVendorModal({ id: v.id ?? v.vendor_code, vendor_code: v.vendor_code, vendor_name: v.vendor_name })}
            >
              {v.vendor_name}
            </Typography>
          );
        },
      },
      {
        accessorKey: "particular",
        header: "Particular",
        minSize: 180,
        grow: 2,
        muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
      },
     {
      accessorKey: "invoice_date",
      header: "Invoice Date",
      minSize: 120,
      size: 130,
      muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
      Cell: ({ row }) => {
        const raw = row.original.invoice_date;
        if (!raw) return <Box sx={{ textAlign: "left" }}>{''}</Box>;
        const parsed = Date.parse(raw);
        const display = !Number.isNaN(parsed)
          ? new Date(parsed).toLocaleDateString()
          : raw;
        return <Box sx={{ textAlign: "left" }}>{display}</Box>;
      },
    },
    {
      accessorKey: "ra_bill_no",
      header: "RA Bill No",
      minSize: 130,
      size: 150,
      muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
      Cell: ({ row }) => (
        <Box sx={{ textAlign: "left" }}>{row.original.ra_bill_no || ""}</Box>
      ),
    },

      { accessorKey: "bill_type", header: "Bill Type", minSize: 120, size: 120 },
      ...[
        { key: "gross_amount", header: "GROSS" },
        { key: "gst_amount", header: "GST 18%" },
        { key: "total_amount", header: "TOTAL" },
        { key: "tds", header: "TDS" },
        { key: "debit_deduction", header: "Debit/Deduction" },
        { key: "retention", header: "Retention 5%" },
        { key: "gst_hold", header: "GST Hold" },
        { key: "net_total", header: "NET TOTAL" },
        { key: "advances", header: "Advances" },
        { key: "part_paid", header: "Part Paid" },
        { key: "payables", header: "Payables" },
      ].map((col) => ({
        accessorKey: col.key,
        header: col.header,
        minSize: 120,
        size: 130,
        muiTableBodyCellProps: {
          sx: {
            textAlign: "right",
            whiteSpace: "nowrap",
            fontWeight: col.key === "net_total" || col.key === "payables" ? 700 : 500,
            color:
              col.key === "gst_amount"
                ? "orange.main"
                : col.key === "tds"
                ? "error.main"
                : col.key === "retention"
                ? "warning.main"
                : col.key === "net_total"
                ? "success.main"
                : undefined,
          },
        },
        Cell: ({ row }) => {
          if (col.key === "payables") {
            const v = row.original.payables || 0;
            return (
              <Box sx={{ textAlign: "right", fontWeight: 700, color: v > 0 ? "error.main" : "success.main" }}>
                {formatCurrency(v)}
              </Box>
            );
          }
          return <Box sx={{ textAlign: "right" }}>{formatCurrency(row.original[col.key])}</Box>;
        },
      })),
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              enableSorting: false,
              minSize: 100,
              size: 100,
              muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
              Cell: ({ row }) => (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <IconButton size="small" color="primary" onClick={() => handleEdit(row.original)} aria-label="edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.original.id)} aria-label="delete">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ),
            },
          ]
        : []),
    ],
    [isAdmin, handleEdit, handleDelete, formatCurrency, openVendorModal]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600, color: "primary.main", mb: 1 }}
        >
          Sub Contractor Monthly Entries
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(e) => handlePeriodChange("year", e.target.value)}>
                {[2024, 2025, 2026].map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, overflow: "hidden", boxShadow: 1 }}>
        <Suspense fallback={<Loader message="Loading table..." />}>
          <ReusableTable
            columns={columns}
            data={tableData}
            options={{
              getRowId: (row) => row.id ?? `${row.vendor_code}-${row.particular ?? ""}`,
              maxHeight: "60vh",
              enableColumnResizing: true,
              columnResizeMode: "onEnd",
              layoutMode: "grid",
              enableStickyHeader: true,
              enablePagination: true,
              enableSorting: true,
              enableColumnFilters: true,
              enableGlobalFilter: true,
              initialState: { pagination: { pageSize: 15 }, density: "compact" },
              state: { isLoading: loading },
              muiTableContainerProps: { sx: { maxHeight: "calc(100vh - 260px)", overflowX: "auto" } },
              muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
              muiTableProps: { sx: { tableLayout: "fixed", "& .MuiTableCell-root": { fontSize: "0.875rem", px: 1 } } },
            }}
          />
        </Suspense>
      </Box>

      <Suspense fallback={<Loader message="Loading dialog..." />}>
        <MonthlyEntryModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingEntry(null);
          }}
          type="SC"
          vendors={scVendors}
          vendorsLoading={vendorsLoading}
          initialData={editingEntry || {}}
          onSave={handleSave}
        />
      </Suspense>

      {/* Vendor view modal */}
      {/* <VendorViewModal
        open={vendorModalOpen}
        onClose={closeVendorModal}
        vendor={vendorModalVendor}
        vendorId={vendorModalVendor?.vendor_code ?? vendorModalVendor?.id}
        historyData={vendorModalVendor ? vendorHistoryCache[vendorModalVendor.vendor_code ?? vendorModalVendor.id] : undefined}
        fetchHistory={fetchVendorHistory}
        allowTabs={true}
      /> */}
    </Box>
  );
};

export default React.memo(SubContractor);
