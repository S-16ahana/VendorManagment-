// src/components/common/ReusableTable.jsx
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/**
 * Notes on optimizations:
 * - Single invocation of useMaterialReactTable (previous version created two table instances).
 * - Column keys/headers are derived from the `columns` prop by flattening columns,
 *   avoiding the need to call table.getAllLeafColumns() before the table exists.
 * - Debounced global filter application to reduce re-renders on typing.
 * - Search UI purposely stripped of white bg / box-shadow and uses minimal styles.
 *
 * Behavior change:
 * - The component maintains internal `tableData` state derived from `data` prop.
 * - It now detects newly-added rows (by `id` when present) and ensures those
 *   new rows are placed at the very top. The first newly-added row is highlighted.
 * - Highlight is cleared when user hovers over that row or clicks it.
 */

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
    // expandable search options
    searchPlaceholder = "Search",
    searchCollapsedWidth = 40, // px
    searchExpandedWidth = 320, // px
    searchTransition = "180ms", // CSS transition duration
    searchDebounceMs = 220,
    // preserveOrder: if true, rely on incoming order unchanged
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

  // helper to safely read nested values (supports accessor like "user.name")
  const readValueFromObject = useCallback((obj, key) => {
    if (!obj || !key) return undefined;
    if (!key.includes(".")) return obj[key];
    return key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
  }, []);

  // simple CSV exporter (dynamic import only on demand)
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
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }, []);

  // --- NEW: internal table data state so we can show newly added rows on top ---
  // We'll keep a prevDataRef to detect new items by id (fall back to JSON-string if id missing).
  const [tableData, setTableData] = useState(() => {
    if (!Array.isArray(data)) return [];
    // default initial ordering: use incoming as-is unless you want reverse behavior externally
    return [...data];
  });

  const prevDataRef = useRef(Array.isArray(data) ? data.slice() : []);
  const [highlightedRowKey, setHighlightedRowKey] = useState(null); // store id or fallback key for highlight

  useEffect(() => {
    const incoming = Array.isArray(data) ? data.slice() : [];
    const prev = prevDataRef.current || [];

    // Helper: compute stable key for item (prefer id)
    const keyOf = (item) => {
      if (!item) return undefined;
      if (item.id !== undefined && item.id !== null) return String(item.id);
      // fallback: try vendor_code or vendor_name if present (useful for your dataset)
      if (item.vendor_code) return `vc:${String(item.vendor_code)}`;
      if (item.vendor_name) return `vn:${String(item.vendor_name)}`;
      // final fallback: JSON string (not ideal but stable while item shape is stable)
      try {
        return `raw:${JSON.stringify(item)}`;
      } catch {
        return `obj:${Object.keys(item || {}).join("|")}`;
      }
    };

    const prevKeys = prev.map(keyOf);
    const incomingKeys = incoming.map(keyOf);

    // If preserveOrder is requested, just adopt incoming order (no reordering)
    if (preserveOrder) {
      setTableData(incoming);
      prevDataRef.current = incoming.slice();
      // clear highlight if incoming no longer contains previous highlighted item
      if (highlightedRowKey && !incomingKeys.includes(highlightedRowKey)) setHighlightedRowKey(null);
      return;
    }

    // Detect newly added keys (present in incoming but not in prev)
    const addedKeys = incomingKeys.filter((k) => k && !prevKeys.includes(k));

    if (addedKeys.length > 0) {
      // compute added items in incoming order
      const addedItems = incoming.filter((it) => addedKeys.includes(keyOf(it)));
      // others: incoming items excluding the addedKeys (preserve their incoming order)
      const otherItems = incoming.filter((it) => !addedKeys.includes(keyOf(it)));
      // Put newly added items at very top
      const newTop = [...addedItems, ...otherItems];
      setTableData(newTop);
      // highlight the first added item (user wanted "that row should be highlighted properly")
      setHighlightedRowKey(addedKeys[0]);
    } else {
      // No new items: adopt incoming (keeps any re-ordering from parent)
      setTableData(incoming);
      // if incoming no longer contains highlighted row -> clear highlight
      if (highlightedRowKey && !incomingKeys.includes(highlightedRowKey)) setHighlightedRowKey(null);
    }

    prevDataRef.current = incoming.slice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, preserveOrder]);

  // base MRT options (single table instance created later)
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
      // Row props: add highlight sx and interaction handlers that clear highlight when hovered/clicked
      muiTableBodyRowProps: ({ row }) => {
        // compute stable key for row.original similar to above
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
            if (isHighlighted) {
              // Clear highlight when user hovers the row (user "visits" / mouses over)
              setHighlightedRowKey(null);
            }
          },
          onClick: () => {
            if (isHighlighted) {
              // Clear highlight on click too
              setHighlightedRowKey(null);
            }
          },
          // Visual highlight: subtle background and transition
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

  // derive column keys & headers from columns prop (avoids building table early)
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

  // column selection state
  const [selectedExportColumns, setSelectedExportColumns] = useState(() =>
    Array.isArray(exportColumnsFromOptions) && exportColumnsFromOptions.length ? exportColumnsFromOptions : []
  );

  useEffect(() => {
    if ((!selectedExportColumns || selectedExportColumns.length === 0) && allColumnKeys.length > 0) {
      setSelectedExportColumns(allColumnKeys);
    } else {
      setSelectedExportColumns((prev) => prev.filter((k) => allColumnKeys.includes(k)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColumnKeys.join("|")]);

  // menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleOpenMenu = (e) => setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const toggleColumnSelection = (key) =>
    setSelectedExportColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const selectAllColumns = () => setSelectedExportColumns([...allColumnKeys]);
  const clearAllColumns = () => setSelectedExportColumns([]);

  // preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);

  const openPreviewModal = (toolbarTable, useAllRows = false) => {
    const mrtRows = useAllRows ? toolbarTable.getPrePaginationRowModel().rows : toolbarTable.getRowModel().rows;
    setPreviewRows(mrtRows.map((r) => r.original ?? r));
    setPreviewOpen(true);
  };
  const closePreviewModal = () => setPreviewOpen(false);

  // export using selectedExportColumns and current row model
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

  // --- search state & debounce ---
  const [searchExpanded, setSearchExpanded] = useState(false);
  const lastTypedRef = useRef("");
  const debounceTimer = useRef(null);

  // teardown debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // toolbar renderer (only created once)
  const defaultTopToolbar = useCallback(
    ({ table: toolbarTable }) => {
      const currentGlobalFilter = toolbarTable.getState().globalFilter ?? "";

      const applyFilterDebounced = (value) => {
        lastTypedRef.current = value;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          // only set when value equals lastTypedRef to avoid race
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
            {/* Expandable search - visually transparent background, no elevation */}
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
                      backgroundColor: "transparent", // remove white bg
                      boxShadow: "none",
                      // remove strong borders if you want totally minimal look:
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            // clear filter and collapse (also clear pending debounce)
                            if (debounceTimer.current) {
                              clearTimeout(debounceTimer.current);
                            }
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
                    // ensure there is no white background behind the input
                    "& .MuiInputBase-root": {
                      background: "transparent",
                      height: 36,
                    },
                  }}
                />
              )}
            </Box>

            {/* removed filter toggle + clear filters as requested */}
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            {/* Export / Preview controls remain */}
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

  // Respect user-provided toolbar override if present
  const finalRenderTopToolbar =
    mrtOptions.renderTopToolbar || topToolbar === null ? mrtOptions.renderTopToolbar : topToolbar ? topToolbar : defaultTopToolbar;

  // Final table instance (only one)
  const finalTable = useMaterialReactTable({
    ...baseTableOptions,
    renderTopToolbar: finalRenderTopToolbar,
    ...mrtOptions,
  });

  return <MaterialReactTable table={finalTable} />;
};

export default ReusableTable;
