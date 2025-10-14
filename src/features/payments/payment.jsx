// src/features/payments/Payments.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Typography, Button, IconButton, Alert, Tooltip, Chip } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import ReusableTable from "../../components/common/ReusableTable";
import PaymentModal from "./paymentModal";
import {
  fetchPayments,
  createPayment,
  updatePayment,
  deletePayment,
  markPaymentPaid
} from "./paymentSlice";
import { fetchVendors } from "../vendorMaster/VendorSlice";

const toCsvRow = (arr) =>
  arr
    .map((cell) => {
      if (cell == null) return "";
      const str = String(cell);
      const needsQuotes = /[,"\n\r]/.test(str);
      const escaped = str.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    })
    .join(",");

const downloadFile = (filename, content, mime = "text/csv;charset=utf-8;") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const Payments = () => {
  const dispatch = useDispatch();
  const { payments = [], loading, error } = useSelector((s) => s.payments || {});
  const { items: vendors = [], loading: vendorsLoading } = useSelector(
    (s) => s.vendors || { items: [], loading: false }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchPayments());
  }, [dispatch]);

  const formatCurrency = (a) =>
    a || a === 0 ? `₹${Number(a).toLocaleString("en-IN")}` : "₹0";

  const formatDate = (date) => {
    if (!date) return "";
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (Number.isNaN(d.getTime && d.getTime())) return String(date);
    return d.toLocaleDateString("en-IN");
  };

  const tableData = useMemo(() => payments || [], [payments]);

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    await dispatch(deletePayment(id));
  };

  const handleMarkPaid = async (id) => {
    await dispatch(markPaymentPaid(id));
  };

  const handleAdd = () => {
    setEditingPayment(null);
    setModalOpen(true);
  };

  const handleSave = async (paymentData) => {
    try {
      if (editingPayment) {
        await dispatch(updatePayment({ id: editingPayment.id, ...paymentData }));
      } else {
        await dispatch(createPayment(paymentData));
      }
      setModalOpen(false);
      setEditingPayment(null);
    } catch (err) {
      console.error("Failed to save payment", err);
    }
  };

  const exportCsv = useCallback(() => {
    if (!tableData || tableData.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Month",
      "Vendor",
      "Amount",
      "IFSC",
      "Account Number",
      "Narration",
      "Site",
      "Requested By",
      "Status",
    ];

    const rows = tableData.map((r) => [
      r.date ? formatDate(r.date) : "",
      r.month || "",
      r.vendorName || "",
      r.amount != null ? Number(r.amount).toString() : "",
      r.ifsc || "",
      r.accountNo || "",
      r.narration || "",
      r.site || "",
      r.reqBy || "",
      r.status || "",
    ]);

    const csvContent = [toCsvRow(headers), ...rows.map(toCsvRow)].join("\r\n");
    const filename = `payments_export_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    downloadFile(filename, csvContent);
  }, [tableData]);

  const renderWithTooltip = (value, maxLen = 50) => {
    if (!value && value !== 0) return "";
    const str = String(value);
    if (str.length <= maxLen) return str;
    const truncated = `${str.slice(0, maxLen - 3)}...`;
    return (
      <Tooltip title={str} arrow>
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "inline-block",
            maxWidth: 400,
          }}
        >
          {truncated}
        </span>
      </Tooltip>
    );
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        size: 110,
        Cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "month",
        header: "Month",
        size: 140,
        Cell: ({ row }) => row.original.month || "",
      },
      {
        accessorKey: "vendorName",
        header: "Vendor",
        size: 200,
        Cell: ({ row }) => renderWithTooltip(row.original.vendorName, 30),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 130,
        Cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: "ifsc",
        header: "IFSC",
        size: 130,
        Cell: ({ row }) => row.original.ifsc || "",
      },
      {
        accessorKey: "accountNo",
        header: "Account No",
        size: 150,
        Cell: ({ row }) => row.original.accountNo || "",
      },
      {
        accessorKey: "narration",
        header: "Narration",
        size: 300,
        Cell: ({ row }) => renderWithTooltip(row.original.narration, 60),
      },
      {
        accessorKey: "site",
        header: "Site",
        size: 120,
        Cell: ({ row }) => row.original.site || "",
      },
      {
        accessorKey: "reqBy",
        header: "Requested By",
        size: 140,
        Cell: ({ row }) => row.original.reqBy || "",
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        Cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Chip
              label={status === "paid" ? "Paid" : "Unpaid"}
              color={status === "paid" ? "success" : "warning"}
              size="small"
            />
          );
        },
      },
      {
        accessorKey: "actions",
        header: "Actions",
        size: 160,
        enableSorting: false,
        Cell: ({ row }) => {
          const p = row.original;
          return (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleEdit(p)}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(p.id)}
                title="Delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color={p.status === "paid" ? "default" : "success"}
                onClick={() => handleMarkPaid(p.id)}
                title={p.status === "paid" ? "Mark as Unpaid" : "Mark as Paid"}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [handleEdit, handleDelete, handleMarkPaid]
  );

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: 600,
            color: "primary.main",
            mb: 0,
          }}
        >
          Vendor Payments
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            Manage payments to vendors and subcontractors
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" onClick={handleAdd}>
              + Add Payment
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 1,
        }}
      >
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
            initialState: {
              pagination: { pageSize: 20 },
              density: "compact",
              sorting: [{ id: "date", desc: true }],
            },
            state: { isLoading: loading || vendorsLoading },
            muiTableContainerProps: {
              sx: { maxHeight: "calc(100vh - 260px)", overflowX: "auto" },
            },
          }}
        />
      </Box>

      <PaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPayment(null);
        }}
        vendors={vendors}
        payments={payments}      
        initialData={editingPayment || {}}
        onSave={handleSave}
      />
    </Box>
  );
};

export default Payments;
