// VendorViewModal_and_Table_examples.jsx
// Two components in one file for easy copy-paste:
// 1) default export: VendorViewModal (reusable modal component)
// 2) VendorTable (example of usage in a table - click vendor name to open modal)

import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Styling box for modal content
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 1200,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 8,
  p: 2,
  overflow: 'auto',
};

// Utility: format number
const fmt = (v) => (v == null ? '-' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));

// Utility: safe parse possible date strings / numbers
function tryParseDate(v) {
  if (!v && v !== 0) return null;
  // if it's a Date already
  if (v instanceof Date && !isNaN(v)) return v;
  // handle numeric timestamps (seconds or ms)
  if (typeof v === 'number') {
    // heuristic: if timestamp looks like seconds (10 digits), convert to ms
    if (v.toString().length === 10) return new Date(v * 1000);
    return new Date(v);
  }
  // strings
  if (typeof v === 'string') {
    // trim
    const s = v.trim();
    // try ISO directly
    const d = new Date(s);
    if (!isNaN(d)) return d;
    // try replacing common separators
    const s2 = s.replace(/\//g, '-').replace(/\./g, '-');
    const d2 = new Date(s2);
    if (!isNaN(d2)) return d2;
  }
  return null;
}

// Utility: find earliest date in history (searches common keys)
function getEarliestDate(history = {}) {
  const candidates = [];
  const keysToCheck = ['date', 'bill_date', 'invoice_date', 'created_at', 'entry_date', 'billDate', 'invoiceDate'];
  (history.subcontracts || []).forEach((row) => {
    for (const k of keysToCheck) {
      if (row[k]) {
        const d = tryParseDate(row[k]);
        if (d) candidates.push(d);
        break;
      }
    }
    // also check any value that looks like a date (fallback)
    Object.values(row).forEach((val) => {
      if (typeof val === 'string' && /\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}/.test(val)) {
        const d = tryParseDate(val);
        if (d) candidates.push(d);
      }
    });
  });
  (history.hiring || []).forEach((row) => {
    for (const k of keysToCheck) {
      if (row[k]) {
        const d = tryParseDate(row[k]);
        if (d) candidates.push(d);
        break;
      }
    }
    Object.values(row).forEach((val) => {
      if (typeof val === 'string' && /\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}/.test(val)) {
        const d = tryParseDate(val);
        if (d) candidates.push(d);
      }
    });
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a - b);
  return candidates[0];
}

// Utility: human readable date & diff
function formatDate(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}
function diffYMD(from, to = new Date()) {
  if (!from || isNaN(from)) return null;
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  let years = t.getFullYear() - f.getFullYear();
  let months = t.getMonth() - f.getMonth();
  let days = t.getDate() - f.getDate();
  if (days < 0) {
    months -= 1;
    // borrow days from previous month
    const prevMonth = new Date(t.getFullYear(), t.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}
function formatDuration(d) {
  if (!d) return '-';
  const parts = [];
  if (d.years) parts.push(`${d.years} yr${d.years > 1 ? 's' : ''}`);
  if (d.months) parts.push(`${d.months} mo${d.months > 1 ? 's' : ''}`);
  if (d.days && parts.length < 2) parts.push(`${d.days} day${d.days > 1 ? 's' : ''}`); // show days only when short
  if (parts.length === 0) return '0 days';
  return parts.join(' ');
}

// VendorViewModal
// Props:
// - open (bool)
// - onClose (fn)
// - vendorId or vendor (object with id/name)
// - fetchHistory: async function (vendorId) => { subcontracts: [...], hiring: [...] }
// - historyData: optional pre-fetched object { subcontracts: [], hiring: [] }
// - allowTabs: bool (default true) show separate tabs for Subcontracts / Hiring Service
export default function VendorViewModal({ open, onClose, vendor, vendorId, fetchHistory, historyData, allowTabs = true }) {
  const id = vendor ? vendor.id : vendorId;
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(historyData || { subcontracts: [], hiring: [] });
  const [activeTab, setActiveTab] = useState(0);
  const vendorName = vendor ? vendor.vendor_name || vendor.name : 'Vendor';

  useEffect(() => {
    // When modal opens, fetch if needed
    let mounted = true;
    async function load() {
      if (!id) return;
      if (historyData) {
        setHistory(historyData);
        return; // already provided
      }
      if (!fetchHistory) return; // nothing to do
      try {
        setLoading(true);
        const res = await fetchHistory(id);
        if (!mounted) return;
        // Expecting object { subcontracts: [...], hiring: [...] }
        setHistory(res || { subcontracts: [], hiring: [] });
      } catch (err) {
        console.error('Vendor history load failed', err);
        if (mounted) setHistory({ subcontracts: [], hiring: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (open) load();
    return () => (mounted = false);
  }, [open, id, fetchHistory, historyData]);

  useEffect(() => {
    if (!open) {
      setActiveTab(0);
    }
  }, [open]);

  const hasSub = history && history.subcontracts && history.subcontracts.length > 0;
  const hasHire = history && history.hiring && history.hiring.length > 0;

  // compute earliest date and duration
  const earliestDate = useMemo(() => getEarliestDate(history), [history]);
  const duration = useMemo(() => (earliestDate ? diffYMD(earliestDate, new Date()) : null), [earliestDate]);

  const renderSubcontractsTable = useMemo(() => {
    const rows = history.subcontracts || [];
    return (
      <Paper elevation={0} sx={{ width: '100%', overflowX: 'auto', mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sl.No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Vendor name</TableCell>
              <TableCell>Particular</TableCell>
              <TableCell>Bill Type</TableCell>
              <TableCell align="right">Gross Amount</TableCell>
              <TableCell align="right">GST18%</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">TDS 1%/2%</TableCell>
              <TableCell align="right">Debit/Deduction</TableCell>
              <TableCell align="right">Retn Money 5%</TableCell>
              <TableCell align="right">GST Hold</TableCell>
              <TableCell align="right">With Hold</TableCell>
              <TableCell align="right">NET TOTAL</TableCell>
              <TableCell align="right">Advances</TableCell>
              <TableCell align="right">Part paid</TableCell>
              <TableCell align="right">Payables</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => {
              const d = tryParseDate(r.date || r.bill_date || r.invoice_date || r.created_at || r.entry_date);
              return (
                <TableRow key={r.id || idx} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{d ? formatDate(d) : '-'}</TableCell>
                  <TableCell>{r.vendor_name || vendorName}</TableCell>
                  <TableCell>{r.particular}</TableCell>
                  <TableCell>{r.bill_type}</TableCell>
                  <TableCell align="right">{fmt(r.gross_amount)}</TableCell>
                  <TableCell align="right">{fmt(r.gst18)}</TableCell>
                  <TableCell align="right">{fmt(r.total)}</TableCell>
                  <TableCell align="right">{fmt(r.tds)}</TableCell>
                  <TableCell align="right">{fmt(r.debit)}</TableCell>
                  <TableCell align="right">{fmt(r.retn_money)}</TableCell>
                  <TableCell align="right">{fmt(r.gst_hold)}</TableCell>
                  <TableCell align="right">{fmt(r.with_hold)}</TableCell>
                  <TableCell align="right">{fmt(r.net_total)}</TableCell>
                  <TableCell align="right">{fmt(r.advances)}</TableCell>
                  <TableCell align="right">{fmt(r.part_paid)}</TableCell>
                  <TableCell align="right">{fmt(r.payables)}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={17} align="center">No subcontract history found for this vendor.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    );
  }, [history, vendorName]);

  const renderHiringTable = useMemo(() => {
    const rows = history.hiring || [];
    return (
      <Paper elevation={0} sx={{ width: '100%', overflowX: 'auto', mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sl.No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Vendor name</TableCell>
              <TableCell>Particular</TableCell>
              <TableCell>Bill Type</TableCell>
              <TableCell align="right">Gross Amount</TableCell>
              <TableCell align="right">GST18%</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">TDS @ 2%/1%</TableCell>
              <TableCell align="right">GST Hold</TableCell>
              <TableCell align="right">With Hold</TableCell>
              <TableCell align="right">Oth with Hold</TableCell>
              <TableCell align="right">Payable Amount</TableCell>
              <TableCell align="right">Advance Paid</TableCell>
              <TableCell align="right">Payable</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => {
              const d = tryParseDate(r.date || r.bill_date || r.invoice_date || r.created_at || r.entry_date);
              return (
                <TableRow key={r.id || idx} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{d ? formatDate(d) : '-'}</TableCell>
                  <TableCell>{r.vendor_name || vendorName}</TableCell>
                  <TableCell>{r.particular}</TableCell>
                  <TableCell>{r.bill_type}</TableCell>
                  <TableCell align="right">{fmt(r.gross_amount)}</TableCell>
                  <TableCell align="right">{fmt(r.gst18)}</TableCell>
                  <TableCell align="right">{fmt(r.total)}</TableCell>
                  <TableCell align="right">{fmt(r.tds)}</TableCell>
                  <TableCell align="right">{fmt(r.gst_hold)}</TableCell>
                  <TableCell align="right">{fmt(r.with_hold)}</TableCell>
                  <TableCell align="right">{fmt(r.oth_with_hold)}</TableCell>
                  <TableCell align="right">{fmt(r.payable_amount)}</TableCell>
                  <TableCell align="right">{fmt(r.advance_paid)}</TableCell>
                  <TableCell align="right">{fmt(r.payable)}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={15} align="center">No hiring-service history found for this vendor.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    );
  }, [history, vendorName]);

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="vendor-history-modal">
      <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Typography id="vendor-history-modal" variant="h6">{vendorName} — Full History</Typography>
            {/* NEW: show earliest date and duration */}
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {earliestDate ? (
                <>
                  With us since <strong>{formatDate(earliestDate)}</strong> &nbsp;•&nbsp; {formatDuration(duration)} (approx)
                </>
              ) : (
                'No date information available to determine "With us since".'
              )}
            </Typography>
          </div>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ my: 1 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            {/* Tabs if both kinds exist or allowTabs true */}
            {allowTabs && (hasSub || hasHire) ? (
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} aria-label="history-type-tabs">
                <Tab label={`Subcontracts (${history.subcontracts ? history.subcontracts.length : 0})`} />
                <Tab label={`Hiring Service (${history.hiring ? history.hiring.length : 0})`} />
              </Tabs>
            ) : null}

            <Box sx={{ mt: 1 }}>
              {/* Decide which table to show based on activeTab or available data */}
              {(!allowTabs && hasSub) || (allowTabs && activeTab === 0) ? renderSubcontractsTable : null}
              {(allowTabs && activeTab === 1) ? renderHiringTable : null}

              {/* If no data at all */}
              {!(hasSub || hasHire) && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography>No history available for this vendor.</Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
}

VendorViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vendor: PropTypes.object,
  vendorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fetchHistory: PropTypes.func, // async fn
  historyData: PropTypes.object,
  allowTabs: PropTypes.bool,
};


// ------------------ Example usage: VendorTable ------------------
// This example demonstrates how to open the modal when clicking on a vendor name in a table row.
// Replace fetchHistoryWithApi with your real API or redux action as needed.

export function VendorTable({ vendors }) {
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [historyCache, setHistoryCache] = useState({}); // cache by vendorId
  const [loadingVendorId, setLoadingVendorId] = useState(null);

  // Example fetcher - replace with your API call or redux dispatch that returns the same shape
  async function fetchHistoryWithApi(id) {
    // Example: call your backend endpoint e.g. /api/vendors/:id/history
    // This stub returns mocked empty arrays after a short delay. Replace as required.
    await new Promise((r) => setTimeout(r, 400));
    // MOCKED DATA SHAPE
    return {
      subcontracts: [
        {
          id: 'sub-1',
          date: '2022-02-10',
          particular: 'Site work',
          bill_type: 'Softcopy',
          gross_amount: 100000,
          gst18: 18000,
          total: 118000,
          tds: 2000,
          debit: 0,
          retn_money: 0,
          gst_hold: 0,
          with_hold: 0,
          net_total: 116000,
          advances: 10000,
          part_paid: 50000,
          payables: 56000,
        },
      ],
      hiring: [
        {
          id: 'hire-1',
          date: '2023-06-05',
          particular: 'Crane Hire',
          bill_type: 'Hardcopy',
          gross_amount: 50000,
          gst18: 9000,
          total: 59000,
          tds: 1000,
          gst_hold: 0,
          with_hold: 0,
          oth_with_hold: 0,
          payable_amount: 58000,
          advance_paid: 0,
          payable: 58000,
        },
      ],
    };
  }

  const openModalForVendor = async (vendorObj) => {
    setSelectedVendor(vendorObj);
    setOpen(true);
    const id = vendorObj.id;
    // If not cached, fetch and cache
    if (!historyCache[id]) {
      try {
        setLoadingVendorId(id);
        const data = await fetchHistoryWithApi(id);
        setHistoryCache((s) => ({ ...s, [id]: data }));
      } catch (err) {
        console.error('Failed to fetch vendor history', err);
      } finally {
        setLoadingVendorId(null);
      }
    }
  };

  return (
    <>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sl.No</TableCell>
              <TableCell>Vendor name</TableCell>
              <TableCell>Particular</TableCell>
              <TableCell>Bill Type</TableCell>
              <TableCell>Gross Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((v, idx) => (
              <TableRow key={v.id} hover>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <Typography
                    sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => openModalForVendor(v)}
                  >
                    {v.vendor_name || v.name}
                  </Typography>
                </TableCell>
                <TableCell>{v.particular}</TableCell>
                <TableCell>{v.bill_type}</TableCell>
                <TableCell>{v.gross_amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Pass cached historyData if available, and a fetchHistory function as fallback */}
      <VendorViewModal
        open={open}
        onClose={() => setOpen(false)}
        vendor={selectedVendor}
        vendorId={selectedVendor?.id}
        historyData={selectedVendor ? historyCache[selectedVendor.id] : undefined}
        fetchHistory={async (id) => {
          // If cached, return
          if (historyCache[id]) return historyCache[id];
          // else fetch via API
          const d = await fetchHistoryWithApi(id);
          setHistoryCache((s) => ({ ...s, [id]: d }));
          return d;
        }}
      />
    </>
  );
}

VendorTable.propTypes = {
  vendors: PropTypes.array.isRequired,
};

// ------------------ USAGE NOTES ------------------
// 1) Copy this file into your components folder, and split into separate files if you prefer.
// 2) Replace `fetchHistoryWithApi` with your real API call or redux action. The modal expects
//    the result shape: { subcontracts: Array, hiring: Array } where each array contains objects
//    whose properties are read in the table columns shown above. You can adapt fields as needed.
// 3) The modal is intentionally flexible: you can pass `historyData` directly (if already loaded)
//    OR pass `fetchHistory` so the modal (or parent) will fetch when opened.
// 4) The VendorTable example demonstrates wiring the click on vendor name to open the modal.
//
// If you want the "With us since" to prefer a vendor-level field (e.g. vendor.joined_at) before scanning history,
// tell me the field name (or paste one vendor object) and I'll make it prefer that.
