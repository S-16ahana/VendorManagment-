import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import {
  Box,
  Button,
  Menu,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Updated ProgressBarCell with red (used) and green (remaining) sections, plus tooltips
const ProgressBarCell = ({ value, yearBudget }) => {
  const percentage = (value / yearBudget) * 100;
  const remainingPercentage = 100 - percentage;

 return (
  <Box
    sx={{
      width: "100%",
      height: 20,
      bgcolor: "var(--gray-bg)", // 🩶 light gray background from root
      borderRadius: 1,
      overflow: "hidden",
      display: "flex",
    }}
  >
    <Tooltip title={`Used: ${percentage.toFixed(1)}% (₹${value})`} arrow>
      <Box
        sx={{
          width: `${percentage}%`,
          height: "100%",
          bgcolor: "#1976d2", // 🔵 Blue for used (primary)
          transition: "width 0.3s ease",
        }}
      />
    </Tooltip>
    <Tooltip title={`Remaining: ${remainingPercentage.toFixed(1)}% (₹${yearBudget - value})`} arrow>
      <Box
        sx={{
          width: `${remainingPercentage}%`,
          height: "100%",
          bgcolor: "#9e9e9e", // 🩶 Gray for remaining
          transition: "width 0.3s ease",
        }}
      />
    </Tooltip>
  </Box>
);

};

const flattenColumns = (cols = []) => {
  const res = [];
  cols.forEach((c) => {
    if (c.columns) {
      res.push(...flattenColumns(c.columns));
    } else {
      res.push(c);
    }
  });
  return res;
};

const ReusableTable = ({ columns, data, options = {} }) => {
  const memoizedColumns = useMemo(() => columns || [], [columns]);
  const {
    maxHeight = "60vh",
    topToolbar,
    enableVirtualization = false,
    rowVirtualizerProps = {},
    exportColumns: exportColumnsFromOptions = null,
    searchPlaceholder = "Search",
    searchCollapsedWidth = 40,
    searchExpandedWidth = 320,
    searchTransition = "180ms",
    searchDebounceMs = 220,
    preserveOrder = false,
    ...mrtOptions
  } = options;

  const defaultMuiTableContainerProps = {
    sx: { maxHeight, overflowY: "auto", overflowX: "auto" },
  };
  const mergedMuiTableContainerProps = {
    ...defaultMuiTableContainerProps,
    ...(mrtOptions.muiTableContainerProps || {}),
    sx: {
      ...defaultMuiTableContainerProps.sx,
      ...(mrtOptions.muiTableContainerProps?.sx || {}),
    },
  };
  const defaultMuiPaperProps = { sx: { width: "100%", overflow: "hidden" } };
  const mergedMuiPaperProps = {
    ...defaultMuiPaperProps,
    ...(mrtOptions.muiPaperProps || {}),
    sx: { ...defaultMuiPaperProps.sx, ...(mrtOptions.muiPaperProps?.sx || {}) },
  };

  const readValueFromObject = useCallback((obj, key) => {
    if (!obj || !key) return undefined;
    if (!key.includes(".")) return obj[key];
    return key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
  }, []);

  const handleExportObjects = useCallback(async (objs, filename = "export.csv") => {
    if (!objs || objs.length === 0) return;
    try {
      const { mkConfig, generateCsv, download } = await import("export-to-csv");
      const csvConfig = mkConfig({
        fieldSeparator: ",",
        decimalSeparator: ".",
        useKeysAsHeaders: true,
      });
      const csv = generateCsv(csvConfig)(objs);
      download(csvConfig)(csv);
    } catch (err) {
      const keys = objs.length ? Object.keys(objs[0]) : [];
      const rows = objs.map((o) =>
        keys
          .map((k) => {
            const val = o[k] ?? "";
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      );
      const csv = [keys.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const link = document.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = link;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(link);
    }
  }, []);

  const [tableData, setTableData] = useState(() => {
    if (!Array.isArray(data)) return [];
    return [...data];
  });
  const prevDataRef = useRef(Array.isArray(data) ? data.slice() : []);
  const [highlightedRowKey, setHighlightedRowKey] = useState(null);

  useEffect(() => {
    const incoming = Array.isArray(data) ? data.slice() : [];
    const prev = prevDataRef.current || [];
    const keyOf = (item) => {
      if (!item) return undefined;
      if (item.id !== undefined && item.id !== null) return String(item.id);
      if (item.vendor_code) return `vc:${String(item.vendor_code)}`;
      if (item.vendor_name) return `vn:${String(item.vendor_name)}`;
      try {
        return `raw:${JSON.stringify(item)}`;
      } catch {
        return `obj:${Object.keys(item || {}).join("|")}`;
      }
    };
    const prevKeys = prev.map(keyOf);
    const incomingKeys = incoming.map(keyOf);
    if (preserveOrder) {
      setTableData(incoming);
      prevDataRef.current = incoming.slice();
      if (highlightedRowKey && !incomingKeys.includes(highlightedRowKey)) setHighlightedRowKey(null);
      return;
    }
    const addedKeys = incomingKeys.filter((k) => k && !prevKeys.includes(k));
    if (addedKeys.length > 0) {
      const addedItems = incoming.filter((it) => addedKeys.includes(keyOf(it)));
      const otherItems = incoming.filter((it) => !addedKeys.includes(keyOf(it)));
      const newTop = [...addedItems, ...otherItems];
      setTableData(newTop);
      setHighlightedRowKey(addedKeys[0]);
    } else {
      setTableData(incoming);
      if (highlightedRowKey && !incomingKeys.includes(highlightedRowKey)) setHighlightedRowKey(null);
    }
    prevDataRef.current = incoming.slice();
  }, [data, preserveOrder]);

  const baseTableOptions = useMemo(
    () => ({
      columns: memoizedColumns,
      data: tableData || [],
      enableColumnFilterModes: true,
      enableColumnOrdering: true,
      enableGrouping: true,
      enableColumnPinning: true,
      enableColumnResizing: true,
      columnResizeMode: "onEnd",
      layoutMode: "grid",
      paginationDisplayMode: "pages",
      positionToolbarAlertBanner: "bottom",
      enableStickyHeader: true,
      initialState: { density: "compact", pagination: { pageSize: 15 }, ...mrtOptions.initialState },
      muiTableContainerProps: mergedMuiTableContainerProps,
      muiPaperProps: mergedMuiPaperProps,
      muiTableBodyCellProps: {
        sx: { whiteSpace: "normal", wordBreak: "break-word" },
        ...(mrtOptions.muiTableBodyCellProps || {}),
      },
      muiTableBodyRowProps: ({ row }) => {
        const computeKey = (item) => {
          if (!item) return undefined;
          if (item.id !== undefined && item.id !== null) return String(item.id);
          if (item.vendor_code) return `vc:${String(item.vendor_code)}`;
          if (item.vendor_name) return `vn:${String(item.vendor_name)}`;
          try {
            return `raw:${JSON.stringify(item)}`;
          } catch {
            return `obj:${Object.keys(item || {}).join("|")}`;
          }
        };
        const rowKey = computeKey(row.original);
        const isHighlighted = highlightedRowKey && rowKey === highlightedRowKey;
        return {
          onMouseEnter: () => {
            if (isHighlighted) setHighlightedRowKey(null);
          },
          onClick: () => {
            if (isHighlighted) setHighlightedRowKey(null);
          },
          sx: isHighlighted
            ? {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(25,118,210,0.06)",
                transition: "background-color 180ms ease",
              }
            : {},
        };
      },
      ...(enableVirtualization
        ? {
            enableRowVirtualization: true,
            rowVirtualizerProps: { overscan: 5, ...rowVirtualizerProps },
          }
        : {}),
      ...mrtOptions,
    }),
    [
      memoizedColumns,
      tableData,
      mergedMuiTableContainerProps,
      mergedMuiPaperProps,
      enableVirtualization,
      rowVirtualizerProps,
      mrtOptions,
      highlightedRowKey,
    ]
  );

  const { allColumnKeys, columnKeyToHeader } = useMemo(() => {
    const flat = flattenColumns(memoizedColumns);
    const keys = [];
    const map = {};
    flat.forEach((c) => {
      const key = c.accessorKey ?? c.id;
      if (!key) return;
      keys.push(key);
      const headerText =
        typeof c.header === "function" ? key : c.header ?? (c.header === undefined ? key : c.header);
      map[key] = headerText;
    });
    return { allColumnKeys: keys, columnKeyToHeader: map };
  }, [memoizedColumns]);

  const [selectedExportColumns, setSelectedExportColumns] = useState(() =>
    Array.isArray(exportColumnsFromOptions) && exportColumnsFromOptions.length ? exportColumnsFromOptions : []
  );

  useEffect(() => {
    if ((!selectedExportColumns || selectedExportColumns.length === 0) && allColumnKeys.length > 0) {
      setSelectedExportColumns(allColumnKeys);
    } else {
      setSelectedExportColumns((prev) => prev.filter((k) => allColumnKeys.includes(k)));
    }
  }, [allColumnKeys.join("|")]);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleOpenMenu = (e) => setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);
  const toggleColumnSelection = (key) =>
    setSelectedExportColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const selectAllColumns = () => setSelectedExportColumns([...allColumnKeys]);
  const clearAllColumns = () => setSelectedExportColumns([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const openPreviewModal = (toolbarTable, useAllRows = false) => {
    const mrtRows = useAllRows ? toolbarTable.getPrePaginationRowModel().rows : toolbarTable.getRowModel().rows;
    setPreviewRows(mrtRows.map((r) => r.original ?? r));
    setPreviewOpen(true);
  };
  const closePreviewModal = () => setPreviewOpen(false);

  const exportSelectedFromTable = useCallback(
    (opts = { filename: "export.csv", useAllRows: false }, toolbarTable) => {
      const keysToExport = selectedExportColumns;
      if (!keysToExport || keysToExport.length === 0) return;
      const mrtRows = opts.useAllRows ? toolbarTable.getPrePaginationRowModel().rows : toolbarTable.getRowModel().rows;
      const originals = mrtRows.map((r) => r.original ?? r);
      const filteredObjs = originals.map((orig) => {
        const obj = {};
        keysToExport.forEach((k) => {
          obj[k] = readValueFromObject(orig, k);
        });
        return obj;
      });
      handleExportObjects(filteredObjs, opts.filename);
      handleCloseMenu();
    },
    [handleExportObjects, readValueFromObject, selectedExportColumns]
  );

  const [searchExpanded, setSearchExpanded] = useState(false);
  const lastTypedRef = useRef("");
  const debounceTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const defaultTopToolbar = useCallback(
    ({ table: toolbarTable }) => {
      const currentGlobalFilter = toolbarTable.getState().globalFilter ?? "";
      const applyFilterDebounced = (value) => {
        lastTypedRef.current = value;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          toolbarTable.setGlobalFilter(lastTypedRef.current || "");
        }, searchDebounceMs);
      };
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            p: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                transition: `width ${searchTransition} ease`,
                width: searchExpanded ? `${searchExpandedWidth}px` : `${searchCollapsedWidth}px`,
                minWidth: searchCollapsedWidth,
                borderRadius: 1,
              }}
            >
              {!searchExpanded ? (
                <IconButton
                  size="small"
                  onClick={() => setSearchExpanded(true)}
                  aria-label="Open search"
                  sx={{
                    background: "transparent",
                    color: "inherit",
                    "&:hover": { background: "rgba(0,0,0,0.06)" },
                  }}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              ) : (
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder={searchPlaceholder}
                  defaultValue={currentGlobalFilter}
                  onChange={(e) => applyFilterDebounced(e.target.value)}
                  autoFocus
                  fullWidth
                  InputProps={{
                    sx: {
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (debounceTimer.current) clearTimeout(debounceTimer.current);
                            toolbarTable.setGlobalFilter("");
                            setSearchExpanded(false);
                          }}
                          aria-label="Clear search"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      background: "transparent",
                      height: 36,
                    },
                  }}
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box>
              <Button
                size="small"
                variant="contained"
                startIcon={<FileDownloadIcon />}
                endIcon={<ExpandMoreIcon />}
                onClick={handleOpenMenu}
              >
                Export Columns
              </Button>
              <Menu anchorEl={anchorEl} open={open} onClose={handleCloseMenu} PaperProps={{ sx: { minWidth: 420 } }}>
                <Box sx={{ p: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1">Select Columns</Typography>
                    <Box>
                      <Button size="small" onClick={selectAllColumns}>
                        All
                      </Button>
                      <Button size="small" onClick={clearAllColumns}>
                        Clear
                      </Button>
                    </Box>
                  </Box>
                  <FormGroup sx={{ maxHeight: 260, overflowY: "auto" }}>
                    {allColumnKeys.map((key) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox
                            checked={selectedExportColumns.includes(key)}
                            onChange={() => toggleColumnSelection(key)}
                            size="small"
                          />
                        }
                        label={columnKeyToHeader[key] ?? key}
                        sx={{ ml: 0 }}
                      />
                    ))}
                  </FormGroup>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button size="small" variant="outlined" onClick={() => openPreviewModal(toolbarTable, false)}>
                      Preview
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => exportSelectedFromTable({ useAllRows: false }, toolbarTable)}
                    >
                      Export
                    </Button>
                  </Box>
                </Box>
              </Menu>
              <Dialog open={previewOpen} onClose={closePreviewModal} fullWidth maxWidth="lg">
                <DialogTitle>Export Preview</DialogTitle>
                <DialogContent dividers sx={{ p: 1 }}>
                  <Box sx={{ width: "100%", overflow: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {selectedExportColumns.map((k) => (
                            <TableCell key={k} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                              {columnKeyToHeader[k] ?? k}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={Math.max(1, selectedExportColumns.length)}>
                              <Typography variant="body2">No rows to preview.</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          previewRows.map((orig, i) => (
                            <TableRow key={orig.id ?? i}>
                              {selectedExportColumns.map((k) => (
                                <TableCell
                                  key={k}
                                  sx={{ whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                                >
                                  {String(readValueFromObject(orig, k) ?? "")}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      const objs = previewRows.map((r) => {
                        const obj = {};
                        selectedExportColumns.forEach((k) => {
                          obj[k] = readValueFromObject(r, k);
                        });
                        return obj;
                      });
                      handleExportObjects(objs, "preview-export.csv");
                    }}
                  >
                    Export Preview
                  </Button>
                  <Button onClick={closePreviewModal} variant="contained">
                    Close
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          </Box>
        </Box>
      );
    },
    [
      anchorEl,
      allColumnKeys,
      clearAllColumns,
      columnKeyToHeader,
      exportSelectedFromTable,
      handleOpenMenu,
      handleCloseMenu,
      open,
      selectAllColumns,
      selectedExportColumns,
      toggleColumnSelection,
      previewOpen,
      previewRows,
      handleExportObjects,
      readValueFromObject,
      searchCollapsedWidth,
      searchExpandedWidth,
      searchTransition,
      searchPlaceholder,
      searchExpanded,
      searchDebounceMs,
    ]
  );

  const finalRenderTopToolbar =
    mrtOptions.renderTopToolbar || topToolbar === null ? mrtOptions.renderTopToolbar : topToolbar ? topToolbar : defaultTopToolbar;

  const finalTable = useMaterialReactTable({
    ...baseTableOptions,
    renderTopToolbar: finalRenderTopToolbar,
    ...mrtOptions,
  });

  return <MaterialReactTable table={finalTable} />;
};

export default ReusableTable;
