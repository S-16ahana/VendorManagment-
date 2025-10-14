import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Box, Typography, TextField, Button, IconButton, Stack,
  InputAdornment, Chip, Divider, Autocomplete, FormControl,
  InputLabel, Select, MenuItem, Input, InputAdornment as IA
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { initialMonthlyEntries } from '../vendorMaster/dummyData';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '92vw',
  maxWidth: 800,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 0,
  outline: 'none',
  overflow: 'hidden'
};
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const generateMonthOptions = () => {
  const options = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= currentYear - 2; year--) {
    MONTHS.forEach(month => {
      options.push(`${month} ${year}`);
    });
  }
  return options;
};

// helper to parse "July 2025" -> { year: 2025, month: 7 }
const parseMonthLabel = (label) => {
  if (!label || typeof label !== 'string') return { year: null, month: null };
  const parts = label.trim().split(/\s+/);
  const yearStr = parts[parts.length - 1];
  const monthName = parts.slice(0, parts.length - 1).join(' ');
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  const year = Number(yearStr) || null;
  return { year: year || null, month: monthIndex >= 0 ? monthIndex + 1 : null };
};

export default function PaymentModal({ open, onClose, vendors = [], payments = [], initialData = {}, onSave }) {
  const vendorMap = useMemo(() => {
    const m = new Map();
    (vendors || []).forEach(v => {
      if (v && v.vendor_code) m.set(String(v.vendor_code).toUpperCase(), v);
      if (v && v.vendor_name) m.set(String(v.vendor_name).toUpperCase(), v);
    });
    return m;
  }, [vendors]);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const [formData, setFormData] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [vendorLookupError, setVendorLookupError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deductAmount, setDeductAmount] = useState(''); // the user-entered "Deduct" value
  const [originalAmountPayable, setOriginalAmountPayable] = useState(''); // immutable base for current month

  const normalizeAmount = (v) => {
    if (v === '' || v == null) return '';
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const cleaned = String(v).replace(/[^\d.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : '';
  };

  // compute payable for a vendor for a specific year+month using Redux payments (passed as prop)
  const computeVendorPayableForMonth = useCallback(
    (vendor, year, month) => {
      if (!vendor || !year || !month) return 0;
      try {
        // 1) Base from monthly entries
        const entries = (initialMonthlyEntries || []).filter((e) => {
          if (!e) return false;
          if (Number(e.year) !== Number(year) || Number(e.month) !== Number(month)) return false;
          const matchesId = vendor.id && e.vendor_id && String(e.vendor_id) === String(vendor.id);
          const matchesCode = vendor.vendor_code && e.vendor_code && String(e.vendor_code) === String(vendor.vendor_code);
          return matchesId || matchesCode;
        });

        const base = entries.length === 0
          ? Number(vendor.vendor_payable ?? vendor.vendorPayable ?? vendor.payable ?? 0) || 0
          : entries.reduce((sum, e) => sum + (Number(e.payables ?? e.payable ?? e.net_total ?? 0) || 0), 0);

        // 2) Subtract paid payments from Redux payments array
        const paidForVendorMonth = (payments || []).filter((p) => {
          if (!p || p.status !== "paid") return false;
          const parsed = parseMonthLabel(p.month || "");
          if (!parsed.year || !parsed.month) return false;
          const sameVendor =
            (p.vendorCode && vendor.vendor_code && String(p.vendorCode) === String(vendor.vendor_code)) ||
            (p.vendorName && vendor.vendor_name && String(p.vendorName) === String(vendor.vendor_name));
          return sameVendor && Number(parsed.year) === Number(year) && Number(parsed.month) === Number(month);
        });

        const paidSum = paidForVendorMonth.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const remaining = Number(base) - Number(paidSum);
        return Number.isFinite(remaining) ? remaining : 0;
      } catch {
        return Number(vendor.vendor_payable ?? vendor.vendorPayable ?? vendor.payable ?? 0) || 0;
      }
    },
    [payments]
  );

  useEffect(() => {
    if (!open) return;
    const currentMonth = MONTHS[new Date().getMonth()];
    const currentYear = new Date().getFullYear();
    const defaults = {
      date: new Date().toISOString().split('T')[0],
      month: `${currentMonth} ${currentYear}`,
      vendorCode: '',
      vendorName: '',
      amount: '',
      ifsc: '',
      accountNo: '',
      amountPayable: '',
      narration: '',
      site: '',
      reqBy: '',
      status: 'unpaid',
      ...initialData
    };

    defaults.amountPayable = normalizeAmount(defaults.amountPayable);
    defaults.amount = normalizeAmount(defaults.amount);

    setFormData(defaults);
    setVendorSearchTerm(initialData.vendorName || initialData.vendorCode || '');
    setDeductAmount('');

    // If initial vendor provided, attempt to find and set vendor + originalAmountPayable based on month
    if (initialData.vendorCode || initialData.vendorName) {
      const searchKey = (initialData.vendorCode || initialData.vendorName).toUpperCase();
      const v = vendorMap.get(searchKey);
      if (v) {
        setSelectedVendor(v);
        setVendorLookupError('');
        const { year, month } = parseMonthLabel(defaults.month);
        const payable = computeVendorPayableForMonth(v, year, month);
        const numeric = normalizeAmount(payable);
        setFormData(prev => ({
          ...prev,
          vendorCode: v.vendor_code || prev.vendorCode,
          vendorName: v.vendor_name || prev.vendorName,
          ifsc: v.ifsc || prev.ifsc || '',
          accountNo: v.bank_ac_no || prev.accountNo || '',
          amountPayable: numeric,
          amount: numeric === '' ? '' : Number(numeric) // default amount = full payable unless deduct used
        }));
        setOriginalAmountPayable(numeric);
      } else {
        setSelectedVendor(null);
        setVendorLookupError('Vendor not found in Vendor Master');
        setOriginalAmountPayable('');
      }
    } else {
      setSelectedVendor(null);
      setVendorLookupError('');
      setOriginalAmountPayable('');
    }
  }, [open, initialData, vendorMap, computeVendorPayableForMonth]);

  // Recompute originalAmountPayable when selectedVendor OR selected month OR payments change
  useEffect(() => {
    if (!selectedVendor) return;
    const { year, month } = parseMonthLabel(formData.month);
    const payable = computeVendorPayableForMonth(selectedVendor, year, month);
    const numeric = normalizeAmount(payable);
    setOriginalAmountPayable(numeric);

    // If deductAmount is empty -> amount = base (full payable)
    // If deductAmount provided -> amount = deductAmount, amountPayable = base - deduct
    if (deductAmount === '' || deductAmount == null) {
      setFormData(prev => ({ ...prev, amountPayable: numeric, amount: numeric === '' ? '' : Number(numeric) }));
    } else {
      const deduct = Number(String(deductAmount).replace(/[^\d.-]/g, '')) || 0;
      const newPayable = Number(numeric || 0) - Number(deduct);
      const finalPayable = Number.isFinite(newPayable) ? newPayable : 0;
      setFormData(prev => ({ ...prev, amountPayable: finalPayable, amount: deduct }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendor, formData.month, payments]);

  const setField = useCallback((field, value) =>
    setFormData(prev => ({ ...prev, [field]: value })),
  []);

  const handleVendorSearch = useCallback((vendor) => {
    if (!vendor) {
      setSelectedVendor(null);
      setVendorLookupError('');
      setField('vendorCode', '');
      setField('vendorName', '');
      setField('ifsc', '');
      setField('accountNo', '');
      setField('amountPayable', '');
      setField('amount', '');
      setOriginalAmountPayable('');
      setDeductAmount('');
      return;
    }
    setSelectedVendor(vendor);
    setVendorLookupError('');
    setField('vendorCode', vendor.vendor_code || '');
    setField('vendorName', vendor.vendor_name || '');
    setField('ifsc', vendor.ifsc || '');
    setField('accountNo', vendor.bank_ac_no || '');
    // compute payable for currently selected month
    const { year, month } = parseMonthLabel(formData.month || '');
    const payable = computeVendorPayableForMonth(vendor, year, month);
    const numeric = normalizeAmount(payable);
    // reset deduct when vendor changes
    setDeductAmount('');
    setField('amountPayable', numeric);
    setField('amount', numeric === '' ? '' : Number(numeric));
    setOriginalAmountPayable(numeric);
  }, [setField, computeVendorPayableForMonth, formData.month]);

  const vendorOptions = useMemo(() => {
    return (vendors || []).map(v => ({
      label: `${v.vendor_name} (${v.vendor_code})`,
      value: v,
      vendor_code: v.vendor_code,
      vendor_name: v.vendor_name
    }));
  }, [vendors]);

  const handleInputChange = useCallback((field) => (e) =>
    setField(field, e.target.value),
  [setField]);

  const handleNumberChange = useCallback((field) => (e) => {
    const raw = e.target.value;
    const value = raw === '' ? '' : Number(raw) || 0;
    setField(field, value);
  }, [setField]);

  const formatCurrency = useCallback((amount) => {
    const num = normalizeAmount(amount);
    if (num === '' || num == null || Number.isNaN(Number(num))) return '₹0';
    return `₹${Number(num).toLocaleString('en-IN')}`;
  }, []);

  // >>> UPDATED: when deduct input changes, amount should be the deducted payment value,
  // and amountPayable should be base - deduct.
  const handleDeductInputChange = useCallback((e) => {
    const raw = e.target.value;
    if (raw === '' || raw == null) {
      // clear deduct: amount becomes full base payable
      setDeductAmount('');
      const base = normalizeAmount(originalAmountPayable) || '';
      setField('amountPayable', base);
      setField('amount', base === '' ? '' : Number(base));
      return;
    }

    // user entered a deduct amount: this is the payment amount to be made
    const deduct = Number(String(raw).replace(/[^\d.-]/g, '')) || 0;
    setDeductAmount(raw);

    const base = normalizeAmount(originalAmountPayable) || 0;
    const newPayable = Number(base) - Number(deduct);
    const finalPayable = Number.isFinite(newPayable) ? newPayable : 0;

    setField('amountPayable', finalPayable); // remaining after paying deduct
    setField('amount', deduct); // amount to be paid = deduct
  }, [originalAmountPayable, setField]);

  // --- MAIN SUBMIT: send canonical numeric amountPayable and amount only; allow slice to infer status ---
  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedVendor) {
      setVendorLookupError('Please select a valid vendor');
      return;
    }
    if (formData.amount === '' || formData.amount == null) {
      alert('Please fill in Amount');
      return;
    }
    if (!formData.narration) {
      alert('Please fill in Narration');
      return;
    }
    if (!formData.month) {
      alert('Please select the payment month');
      return;
    }

    // numeric values
    const amountNum = Number(formData.amount) || 0;
    // use the computed original base (which already subtracts previously paid saved payments)
    const basePayable = normalizeAmount(originalAmountPayable);
    const canonicalAmountPayable = (basePayable === '' || basePayable == null) ? '' : Number(basePayable);

    // Build payload - do not forcibly set status here.
    // Let the paymentSlice decide status (we updated decideStatus to treat amountPayable === 0 as paid).
    const payload = {
      ...formData,
      vendorCode: selectedVendor.vendor_code || formData.vendorCode,
      vendorName: selectedVendor.vendor_name || formData.vendorName,
      amount: amountNum,
      amountPayable: canonicalAmountPayable,
      // omit status to let slice infer
    };

    try {
      setSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedVendor, formData, onSave, onClose, originalAmountPayable, normalizeAmount]);

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Box sx={modalStyle}>
        <Box sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon />
            {initialData.id ? 'Edit' : 'Add'} Payment
          </Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Box
          sx={{ maxHeight: 'calc(90vh - 140px)', overflow: 'auto', p: 3 }}
          component="form"
          onSubmit={handleSubmit}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                Vendor Information
              </Typography>
              <Stack spacing={2}>
                <Autocomplete
                  options={vendorOptions}
                  getOptionLabel={(option) => option.label || ''}
                  value={vendorOptions.find(opt =>
                    opt.value.vendor_code === selectedVendor?.vendor_code
                  ) || null}
                  onChange={(e, newValue) => {
                    if (newValue) {
                      handleVendorSearch(newValue.value);
                    } else {
                      handleVendorSearch(null);
                    }
                  }}
                  inputValue={vendorSearchTerm}
                  onInputChange={(e, newInputValue) => {
                    setVendorSearchTerm(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Vendor"
                      placeholder="Type vendor name or code"
                      required
                      error={!!vendorLookupError}
                      helperText={vendorLookupError || 'Search by vendor name or code'}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                            {selectedVendor && (
                              <IA position="end">
                                <Chip label="Found" size="small" color="success" />
                              </IA>
                            )}
                          </>
                        ),
                      }}
                    />
                  )}
                  size="small"
                />
                {selectedVendor && (
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2"><strong>Vendor:</strong> {selectedVendor.vendor_name}</Typography>
                    <Typography variant="body2"><strong>Code:</strong> {selectedVendor.vendor_code}</Typography>
                    <Typography variant="body2"><strong>Type:</strong> {selectedVendor.type === 'HS' ? 'Hiring Service' : 'Subcontractor'}</Typography>
                    <Typography variant="body2"><strong>Contact:</strong> {selectedVendor.contact_no || 'Not provided'}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                Payment Details
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Date"
                    type="date"
                    size="small"
                    value={formData.date || ''}
                    onChange={handleInputChange('date')}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                  <FormControl size="small" required>
                    <InputLabel>Payment Month</InputLabel>
                    <Select
                      value={formData.month || ''}
                      label="Payment Month"
                      onChange={(e) => {
                        // update month and recompute payable in the effect
                        setField('month', e.target.value);
                      }}
                    >
                      {monthOptions.map((month) => (
                        <MenuItem key={month} value={month}>{month}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Amount Payable"
                  size="small"
                  value={formatCurrency(formData.amountPayable)}
                  InputProps={{
                    readOnly: true,
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    endAdornment: (
                      <IA position="end">
                        <Typography sx={{ mx: 1 }}>-</Typography>
                        <Input
                          type="number"
                          value={deductAmount}
                          onChange={handleDeductInputChange}
                          placeholder="Deduct"
                          sx={{ width: 80, padding: 0.5 }}
                        />
                      </IA>
                    ),
                  }}
                  helperText={selectedVendor ? 'Fetched from monthly entries (fallback: vendor field) and reduced by saved paid payments' : 'Will be populated when vendor is selected'}
                />

                <TextField
                  label="Amount"
                  type="number"
                  size="small"
                  required
                  value={formData.amount || ''}
                  onChange={handleNumberChange('amount')}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  helperText="Enter the payment amount (if you used Deduct, this will be the deducted amount)"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                Bank Details
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="IFSC Code"
                    size="small"
                    value={formData.ifsc || ''}
                    onChange={handleInputChange('ifsc')}
                    placeholder="e.g., SBIN0000123"
                    InputProps={{ readOnly: !!selectedVendor }}
                    helperText={selectedVendor ? 'Auto-filled from vendor' : ''}
                  />
                  <TextField
                    label="Account Number"
                    size="small"
                    value={formData.accountNo || ''}
                    onChange={handleInputChange('accountNo')}
                    InputProps={{ readOnly: !!selectedVendor }}
                    helperText={selectedVendor ? 'Auto-filled from vendor' : ''}
                  />
                </Box>
                <TextField
                  label="Narration"
                  value={formData.narration || ''}
                  onChange={handleInputChange('narration')}
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Brief description of payment purpose"
                  required
                  helperText="Describe the payment purpose (e.g., 'Lab payment + Oxygen Cylinder')"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                Additional Information
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField label="Site" size="small" value={formData.site || ''} onChange={handleInputChange('site')} placeholder="Project site or location" />
                  <TextField label="Requested By" size="small" value={formData.reqBy || ''} onChange={handleInputChange('reqBy')} placeholder="Person who requested payment" />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Box sx={{
          p: 3,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2
        }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting || !selectedVendor}>
            {submitting ? 'Saving...' : initialData.id ? 'Update Payment' : 'Create Payment'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

PaymentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vendors: PropTypes.array,
  payments: PropTypes.array,           // <- NEW: payments prop from Redux
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired
};
