// src/features/reports/Reports.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button, Paper, Chip } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ReusableTable from '../../components/common/ReusableTable';
import { fetchReportEntries } from './reportsSlice'; // <-- new

const MONTH_NAMES = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
const MONTH_NUMS = [7,8,9,10,11,12,1,2,3,4,5,6];

const formatCurrency = (amount) => amount ? `₹${Number(amount).toLocaleString('en-IN')}` : '₹0';

// Aggregate entries once per year (O(n))
const aggregateEntries = (entries, year) => {
  const map = new Map();
  for (const e of entries || []) {
    if (e.year !== year) continue;
    const key = e.vendor_code;
    if (!map.has(key)) map.set(key, { months: {}, totalPayables: 0, totalGST: 0, totalRetention: 0 });
    const rec = map.get(key);
    const mn = e.month;
    if (!rec.months[mn]) rec.months[mn] = { payables: 0, gst: 0, retention: 0 };
    rec.months[mn].payables += +(e.payables || 0);
    rec.months[mn].gst += +(e.gst_hold || 0);
    rec.months[mn].retention += +((e.retention || 0) + (e.other_deductions || 0));
    rec.totalPayables += +(e.payables || 0);
    rec.totalGST += +(e.gst_hold || 0);
    rec.totalRetention += +((e.retention || 0) + (e.other_deductions || 0));
  }
  return map;
};

const buildReport = (vendors = [], entriesMap, type) => {
  return vendors
    .filter(v => v.type === type)
    .map(v => {
      const agg = entriesMap.get(v.vendor_code) || { months: {}, totalPayables: 0, totalGST: 0, totalRetention: 0 };
      const row = { vendor_code: v.vendor_code, vendor_name: v.vendor_name, work_type: v.work_type };
      MONTH_NUMS.forEach(m => {
        row[m] = +(agg.months[m]?.payables || 0);
      });
      row.totalPayables = MONTH_NUMS.reduce((s, m) => s + (agg.months[m]?.payables || 0), 0);
      row.totalGST = MONTH_NUMS.reduce((s, m) => s + (agg.months[m]?.gst || 0), 0);
      row.totalRetention = MONTH_NUMS.reduce((s, m) => s + (agg.months[m]?.retention || 0), 0);
      row.grandTotal = row.totalPayables + row.totalGST + row.totalRetention;
      return row;
    });
};

const createColumns = (type) => {
  const base = [
    {
      accessorKey: 'vendor_code', header: 'Vendor Code', size: 150,
      Cell: ({ row }) => <Chip label={row.original.vendor_code} color={type === 'SC' ? 'primary' : 'secondary'} size="small" />
    },
    { accessorKey: 'vendor_name', header: 'Vendor Name', size: 320 },
    { accessorKey: 'work_type', header: 'Work Type', size: 220 }
  ];

  const months = MONTH_NUMS.map((m, i) => ({
    accessorKey: m.toString(), header: MONTH_NAMES[i], size: 80,
    Cell: ({ row }) => <Box sx={{ textAlign: 'right', fontSize: '0.875rem' }}>{(row.original[m] > 0) ? formatCurrency(row.original[m]) : '-'}</Box>
  }));

  const totals = [
    { accessorKey: 'totalPayables', header: 'Total Payables', size: 150, Cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: 'error.main' }}>{formatCurrency(row.original.totalPayables)}</Box> },
    { accessorKey: 'totalGST', header: 'GST Payables', size: 130, Cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500, color: 'warning.main' }}>{formatCurrency(row.original.totalGST)}</Box> },
    { accessorKey: 'totalRetention', header: 'Retention & Others', size: 160, Cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500, color: 'info.main' }}>{formatCurrency(row.original.totalRetention)}</Box> },
    { accessorKey: 'grandTotal', header: 'Grand Total', size: 150, Cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 700, color: 'success.main' }}>{formatCurrency(row.original.grandTotal)}</Box> }
  ];

  return [...base, ...months, ...totals];
};

export default function Reports() {
  const dispatch = useDispatch(); // <-- new
  const { items: vendors } = useSelector(s => s.vendors || {});
  const reportState = useSelector((s) => s.reports || {}); // <-- new
  const { entries: reportEntries = [], loading: reportsLoading } = reportState; // use reportEntries instead of local file

  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedYear, setSelectedYear] = useState(2025);

  // fetch reports when selectedYear changes
  useEffect(() => {
    dispatch(fetchReportEntries({ year: selectedYear }));
  }, [dispatch, selectedYear]);

  // aggregate entries once per selected year — IMPORTANT: use `reportEntries`
  const entriesMap = useMemo(() => aggregateEntries(reportEntries, selectedYear), [reportEntries, selectedYear]);

  const subcontractorData = useMemo(() => buildReport(vendors, entriesMap, 'SC'), [vendors, entriesMap]);
  const hiringData = useMemo(() => buildReport(vendors, entriesMap, 'HS'), [vendors, entriesMap]);

  const scColumns = useMemo(() => createColumns('SC'), []);
  const hsColumns = useMemo(() => createColumns('HS'), []);

  const currentData = selectedTab === 0 ? subcontractorData : hiringData;
  const currentColumns = selectedTab === 0 ? scColumns : hsColumns;

  const totals = useMemo(() => currentData.reduce((acc, r) => ({ payables: acc.payables + r.totalPayables, gst: acc.gst + r.totalGST, retention: acc.retention + r.totalRetention, grand: acc.grand + r.grandTotal }), { payables: 0, gst: 0, retention: 0, grand: 0 }), [currentData]);

  const handleExport = (data, name) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(d => Object.values(d).map(val => typeof val === 'string' ? `"${String(val).replace(/"/g,'""')}"` : val).join(','));
    const blob = new Blob([[headers].concat(rows).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${name}_${selectedYear}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: 'primary.main', mb: 2 }}>
          <AssessmentIcon /> Yearly Reports
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
                <MenuItem value={2024}>2024-25</MenuItem>
                <MenuItem value={2025}>2025-26</MenuItem>
                <MenuItem value={2026}>2026-27</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="h6">Financial Year {selectedYear}-{(selectedYear + 1).toString().slice(-2)}</Typography>
          </Box>

          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => handleExport(currentData, selectedTab === 0 ? 'subcontractor_yearly_report' : 'hiring_yearly_report')}>
            Export CSV
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Total Payables</Typography>
          <Typography variant="h6" color="error.main">{formatCurrency(totals.payables)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">GST Payables</Typography>
          <Typography variant="h6" color="warning.main">{formatCurrency(totals.gst)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Retention & Others</Typography>
          <Typography variant="h6" color="info.main">{formatCurrency(totals.retention)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Grand Total</Typography>
          <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>{formatCurrency(totals.grand)}</Typography>
        </Paper>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
          <Tab label="Subcontractor Yearly Report" />
          <Tab label="Hiring Service Yearly Report" />
        </Tabs>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
        <ReusableTable
          columns={currentColumns}
          data={currentData}
          options={{
            enablePagination: true,
            enableSorting: true,
            enableColumnFilters: false,
            enableGlobalFilter: true,
            initialState: { pagination: { pageSize: 20 }, density: 'compact' },
            muiTableProps: {
              sx: {
                tableLayout: 'auto',
                minWidth: 1100,
                '& .MuiTableCell-root': { fontSize: '0.85rem', padding: '8px 6px' },
                '& .MuiTableCell-head': { fontWeight: 600, backgroundColor: 'grey.50', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2 },
                '& .MuiTableCell-root:nth-of-type(1), & .MuiTableCell-root:nth-of-type(2), & .MuiTableCell-root:nth-of-type(3)': { whiteSpace: 'normal' }
              }
            },
            muiTopToolbarProps: { sx: { backgroundColor: '#f8fafc' } }
          }}
        />
      </Box>
    </Box>
  );
}
