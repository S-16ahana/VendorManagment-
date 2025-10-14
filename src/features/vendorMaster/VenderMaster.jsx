// src/features/vendorMaster/VendorMaster.jsx
import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Loader from "../../components/common/Loader"; // local loader as suspense fallback

import { fetchVendors, createVendor, updateVendor, deleteVendor } from "./VendorSlice";

// Lazy load heavy components so they don't inflate initial bundle
const ReusableTable = lazy(() => import("../../components/common/ReusableTable"));
const VendorModal = lazy(() => import("./VendorModal"));

const VendorMaster = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { items: vendors = [], loading, error } = useSelector((s) => s.vendors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    dispatch(fetchVendors());
  }, [dispatch]);

  // memoized transformed data for table
  const tableData = useMemo(
    () =>
      (vendors || []).map((vendor) => ({
        ...vendor,
        typeDisplay: vendor.type === "SC" ? "Subcontractor" : "Hiring Service",
      })),
    [vendors]
  );

  // stable callbacks
  const handleAdd = useCallback(() => {
    setEditingVendor(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((vendor) => {
    setEditingVendor(vendor);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (vendorData) => {
      if (editingVendor) {
        // update - slice will update state.items on fulfilled
        await dispatch(updateVendor({ id: editingVendor.id, ...vendorData }));
      } else {
        // create - slice will unshift the new vendor into state.items on fulfilled
        await dispatch(createVendor(vendorData));
      }

      // DON'T re-fetch here (fetchVendors returns dummy initialVendors and would overwrite the new item)
      setModalOpen(false);
      setEditingVendor(null);
    },
    [dispatch, editingVendor]
  );

  const handleDelete = useCallback(
    async (vendorId) => {
      if (!vendorId) return;
      if (window.confirm("Are you sure you want to delete this vendor?")) {
        const res = await dispatch(deleteVendor(vendorId));
        // slice already removes the item on fulfilled; no need to re-fetch the dummy dataset
        // you can still handle errors if res.error exists
        if (res?.error) {
          // optional: show a toast/alert — your slice exposes state.error too
          console.error("Delete failed", res.error);
        }
      }
    },
    [dispatch]
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingVendor(null);
  }, []);

  // stats memo
  const stats = useMemo(() => {
    const scCount = (vendors || []).filter((v) => v.type === "SC").length;
    const hsCount = (vendors || []).filter((v) => v.type === "HS").length;
    return { total: (vendors || []).length, subcontractor: scCount, hiring: hsCount };
  }, [vendors]);

  // columns memo — uses stable handlers
  const columns = useMemo(
    () => [
      {
        accessorKey: "vendor_code",
        header: "Vendor Code",
        minSize: 100,
        maxSize: 160,
        muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
        Cell: ({ row }) => (
          <Chip
            label={row.original.vendor_code}
            color={row.original.type === "SC" ? "primary" : "secondary"}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        accessorKey: "vendor_name",
        header: "Vendor Name",
        minSize: 200,
        size: 260,
        grow: 2,
        muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
      },
      {
        accessorKey: "work_type",
        header: "Work Type",
        minSize: 160,
        grow: 1,
        muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
      },
      {
        accessorKey: "typeDisplay",
        header: "Type",
        minSize: 120,
        size: 140,
        Cell: ({ row }) => (
          <Chip
            label={row.original.typeDisplay}
            color={row.original.type === "SC" ? "info" : "warning"}
            size="small"
          />
        ),
      },
      {
        accessorKey: "pan_no",
        header: "PAN No",
        minSize: 140,
        size: 150,
        muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
      },
      {
        accessorKey: "contact_no",
        header: "Contact No",
        minSize: 140,
        size: 150,
        muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
      },
      // admin actions
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              enableSorting: false,
              minSize: 120,
              size: 120,
              muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } },
              Cell: ({ row }) => {
                const vendor = row.original;
                return (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton size="small" color="primary" onClick={() => handleEdit(vendor)} title="Edit Vendor">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(vendor.id)} title="Delete Vendor">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [handleEdit, handleDelete, isAdmin]
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography
            variant="h5"
            component="h1"
            sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600, color: "primary.main", mb: 0 }}
          >
            Vendor Master
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your vendor database - Subcontractors and Hiring Services
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={`Total: ${stats.total}`} variant="outlined" />
            <Chip label={`SC: ${stats.subcontractor}`} color="primary" variant="outlined" />
            <Chip label={`HS: ${stats.hiring}`} color="secondary" variant="outlined" />
          </Box>

          {isAdmin && (
            <Button variant="contained" onClick={handleAdd} sx={{ minWidth: 140 }}>
              + Add Vendor
            </Button>
          )}
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table (lazy) */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, overflow: "hidden", boxShadow: 1 }}>
        <Suspense fallback={<Loader message="Loading table..." />}>
          <ReusableTable
            columns={columns}
            data={tableData}
            options={{
              enableColumnResizing: true,
              columnResizeMode: "onEnd",
              layoutMode: "grid",
              enableStickyHeader: true,

              enablePagination: true,
              enableSorting: true,
              enableColumnFilters: true,
              enableGlobalFilter: true,
              getRowId: (row) => row.id ?? row.vendor_code, // stable id
              initialState: { pagination: { pageSize: 10 }, sorting: [{ id: "vendor_code", desc: false }] },
              state: { isLoading: loading },

              // layout / wrapping
              muiTableContainerProps: { sx: { maxHeight: "calc(100vh - 260px)", overflowX: "auto" } },
              muiTableBodyCellProps: { sx: { whiteSpace: "normal", wordBreak: "break-word" } },
              muiTableProps: { sx: { tableLayout: "fixed", "& .MuiTableCell-root": { fontSize: "0.9rem", px: 1 } } },

              muiCircularProgressProps: { color: "primary", thickness: 5, size: 55 },
              muiTopToolbarProps: { sx: { backgroundColor: "#f8fafc", "& .MuiInputBase-root": { backgroundColor: "white" } } },

              // optional: enable virtualization for large datasets
              // enableVirtualization: true,
            }}
          />
        </Suspense>
      </Box>

      {/* Vendor Modal (lazy) */}
      <Suspense fallback={<Loader message="Loading dialog..." />}>
        <VendorModal open={modalOpen} onClose={handleCloseModal} initialData={editingVendor || {}} onSave={handleSave} />
      </Suspense>
    </Box>
  );
};

export default React.memo(VendorMaster);
