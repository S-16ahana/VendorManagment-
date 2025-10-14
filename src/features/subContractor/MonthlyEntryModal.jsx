// src/components/MonthlyEntryModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Box, Typography, TextField, Button, IconButton, Stack, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, Chip, Divider, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';
import { calculateEntryTotals } from '../subContractor/subContractorSlice'; // adjust import path if needed

const parsePercentInput = (input) => {
  if (input === '' || input == null) return '';
  const s = String(input).trim().replace(/[,\s%]+/g, '');
  const n = Number(s);
  return Number.isNaN(n) ? '' : n;
};

const modalStyle = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: '92vw', maxWidth: 900, maxHeight: '90vh', bgcolor: 'background.paper', borderRadius: 2,
  boxShadow: 24, p: 0, outline: 'none', overflow: 'hidden'
};

export default function MonthlyEntryModal({ open, onClose, type = 'SC', vendors = [], initialData = {}, onSave }) {
  const vendorMap = useMemo(() => {
    const m = new Map();
    (vendors || []).forEach(v => {
      if (!v) return;
      if (v.vendor_code) m.set(String(v.vendor_code).toUpperCase(), v);
      if (v.pan_no) m.set(String(v.pan_no).toUpperCase(), v);
      if (v.contact_no) m.set(String(v.contact_no).toUpperCase(), v);
      if (v.vendor_name) m.set(String(v.vendor_name).toUpperCase(), v);
    });
    return m;
  }, [vendors]);

  const [formData, setFormData] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorLookupError, setVendorLookupError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaults = {
      vendor_code: '', particular: '', bill_type: 'Softcopy', gross_amount: '', gst_rate: 5, tds_rate: 1,
      debit_deduction: '', gst_hold: '', other_deductions: '', advances: '', part_paid: '', notes: '',
      invoice_date: '', ra_bill_no: '',
      ...initialData
    };
    setFormData(defaults);

    if (initialData && initialData.vendor_code) {
      const v = vendorMap.get(String(initialData.vendor_code).toUpperCase());
      setSelectedVendor(v || null);
      setVendorLookupError(v ? '' : 'Vendor not found in Vendor Master');
    } else {
      setSelectedVendor(null);
      setVendorLookupError('');
    }
  }, [open, initialData, vendorMap]);

  // Determine if Hiring Service to hide retention and pass retention_rate=0 to calculator
  const isHiringService = useMemo(() => type === 'HS' || selectedVendor?.work_type === 'Hiring Service', [type, selectedVendor]);

  // Before calling calculateEntryTotals, build a normalized values object that always provides numeric gst_hold
  const normalizedForCalc = useMemo(() => {
    const gross = formData.gross_amount === '' ? '' : Number(formData.gross_amount) || 0;
    const gst_rate = formData.gst_rate === '' ? '' : Number(formData.gst_rate) || 0;
    const tds_rate = formData.tds_rate === '' ? '' : Number(formData.tds_rate) || 0;
    const debit_deduction = formData.debit_deduction === '' ? 0 : Number(formData.debit_deduction) || 0;
    const other_deductions = formData.other_deductions === '' ? 0 : Number(formData.other_deductions) || 0;
    const advances = formData.advances === '' ? 0 : Number(formData.advances) || 0;
    const part_paid = formData.part_paid === '' ? 0 : Number(formData.part_paid) || 0;

    // compute gst_amount local so gst_hold can default to it if empty
    const gst_amount_local = (gross && gst_rate) ? Math.round(gross * (Number(gst_rate) / 100)) : 0;

    const gst_hold = (formData.gst_hold === '' || formData.gst_hold === null || formData.gst_hold === undefined)
      ? gst_amount_local
      : Number(formData.gst_hold) || 0;

    return {
      gross_amount: gross,
      gst_rate,
      tds_rate,
      debit_deduction,
      other_deductions,
      advances,
      part_paid,
      gst_hold,
      workType: selectedVendor?.work_type || (type === 'HS' ? 'Hiring Service' : ''),
      retention_rate: isHiringService ? 0 : (formData.retention_rate !== undefined ? formData.retention_rate : undefined)
    };
  }, [formData, selectedVendor, isHiringService, type]);

  const calculatedValues = useMemo(() => {
    if (normalizedForCalc.gross_amount === '' || normalizedForCalc.gross_amount == null) return {};
    try {
      return calculateEntryTotals(normalizedForCalc) || {};
    } catch (err) {
      console.error('Calculation error', err);
      return {};
    }
  }, [normalizedForCalc]);

  const setField = useCallback((field, value) => setFormData(prev => ({ ...prev, [field]: value })), []);

  const lookupVendorByRaw = useCallback((raw) => {
    const r = String(raw || '').trim();
    if (!r) return null;
    const key = r.toUpperCase();

    let v = vendorMap.get(key) || (vendors || []).find(opt =>
      (opt.vendor_code && String(opt.vendor_code).toUpperCase() === key) ||
      (opt.vendor_name && String(opt.vendor_name).toUpperCase() === key) ||
      (opt.pan_no && String(opt.pan_no).toUpperCase() === key) ||
      (opt.contact_no && String(opt.contact_no).toUpperCase() === key)
    );

    if (!v) {
      const iv = r.toLowerCase();
      v = (vendors || []).find(opt =>
        (opt.vendor_code && String(opt.vendor_code).toLowerCase().includes(iv)) ||
        (opt.vendor_name && String(opt.vendor_name).toLowerCase().includes(iv)) ||
        (opt.pan_no && String(opt.pan_no).toLowerCase().includes(iv)) ||
        (opt.contact_no && String(opt.contact_no).toLowerCase().includes(iv))
      );
    }
    return v || null;
  }, [vendorMap, vendors]);

  const handleVendorKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = String(formData.vendor_code || '').trim();
      if (!raw) return;
      const v = lookupVendorByRaw(raw);
      if (v) {
        setSelectedVendor(v);
        setVendorLookupError('');
        if (!initialData.id && v.work_type) setField('particular', v.work_type);
        // ensure field shows the canonical vendor_code
        setField('vendor_code', v.vendor_code || v.vendor_name || raw);
      } else {
        setSelectedVendor(null);
        setVendorLookupError('Vendor not found in Vendor Master');
      }
    }
  }, [formData.vendor_code, lookupVendorByRaw, setField, initialData.id]);

  const handleVendorBlur = useCallback(() => {
    const raw = String(formData.vendor_code || '').trim();
    if (!raw) return;
    const v = lookupVendorByRaw(raw);
    if (v) {
      setSelectedVendor(v);
      setVendorLookupError('');
      if (!initialData.id && v.work_type) setField('particular', v.work_type);
      // set canonical code
      setField('vendor_code', v.vendor_code || v.vendor_name || raw);
    } else {
      setSelectedVendor(null);
      setVendorLookupError('Vendor not found in Vendor Master');
    }
  }, [formData.vendor_code, lookupVendorByRaw, setField, initialData.id]);

  const handleInputChange = useCallback((field) => (e) => setField(field, e.target.value), [setField]);
  const handleNumberChange = useCallback((field) => (e) => {
    const raw = e.target.value;
    const value = raw === '' ? '' : Number(raw) || 0;
    setField(field, value);
  }, [setField]);
  const handlePercentChange = useCallback((field) => (e) => {
    const parsed = parsePercentInput(e.target.value);
    setField(field, parsed);
  }, [setField]);

  const formatCurrency = useCallback((amount) => {
    if (amount === '' || amount == null || Number.isNaN(amount)) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }, []);

  const handleParticularChange = useCallback((e) => setField('particular', e.target.value), [setField]);

  const handleVendorSelect = useCallback((vendorId) => {
    const v = (vendors || []).find(x => String(x.id) === String(vendorId)) || null;
    if (v) {
      setSelectedVendor(v);
      setVendorLookupError('');
      setField('vendor_code', v.vendor_code || v.vendor_name || '');
      if (!initialData.id && v.work_type) setField('particular', v.work_type);
    } else {
      setSelectedVendor(null);
      setVendorLookupError('Vendor not found');
    }
  }, [vendors, setField, initialData.id]);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    let vendorToUse = selectedVendor;
    if (!vendorToUse) {
      const raw = String(formData.vendor_code || '').trim();
      if (raw) vendorToUse = lookupVendorByRaw(raw);
    }
    if (!vendorToUse) {
      setVendorLookupError('Please select a valid vendor');
      return;
    }
    if (formData.gross_amount === '' || formData.gross_amount == null) {
      alert('Please fill in Gross Amount');
      return;
    }

    // Build final payload to send to onSave / createSubcontractorEntry
    const payload = {
      ...formData,
      vendor_id: vendorToUse.id,
      vendor_code: vendorToUse.vendor_code,
      workType: vendorToUse.work_type,
      // include normalized gst_hold and other numeric fields to ensure slice gets numbers
      gst_hold: normalizedForCalc.gst_hold,
      gross_amount: normalizedForCalc.gross_amount,
      gst_rate: normalizedForCalc.gst_rate,
      tds_rate: normalizedForCalc.tds_rate,
      debit_deduction: normalizedForCalc.debit_deduction,
      other_deductions: normalizedForCalc.other_deductions,
      advances: normalizedForCalc.advances,
      part_paid: normalizedForCalc.part_paid,
      retention_rate: normalizedForCalc.retention_rate,
      // include calculated values so backend/display will see same numbers
      ...calculatedValues
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
  }, [selectedVendor, formData, lookupVendorByRaw, normalizedForCalc, calculatedValues, onSave, onClose]);

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Box sx={modalStyle}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{initialData.id ? 'Edit' : 'Add'} {type === 'SC' ? 'Subcontractor' : 'Hiring Service'} Entry</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ maxHeight: 'calc(90vh - 140px)', overflow: 'auto', p: 3 }} component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Vendor Information</Typography>
              <Stack spacing={2}>
                {/* Simple searchable TextField (no dropdown) */}
                <TextField
                  label="Vendor (code / name / PAN / contact)"
                  size="small"
                  placeholder={`Search ${type}_XX or name`}
                  required
                  value={String(formData.vendor_code || '')}
                  onChange={(e) => {
                    setField('vendor_code', e.target.value);
                    // clear previous lookup errors when typing
                    if (vendorLookupError) setVendorLookupError('');
                  }}
                  onKeyDown={handleVendorKeyDown}
                  onBlur={handleVendorBlur}
                  error={!!vendorLookupError}
                  helperText={vendorLookupError || `Type vendor code or name and press Enter or blur to lookup.`}
                  InputProps={{
                    endAdornment: selectedVendor ? <InputAdornment position="end"><Chip label="Found" size="small" color="success" /></InputAdornment> : null
                  }}
                />

                {selectedVendor && (
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2"><strong>Vendor:</strong> {selectedVendor.vendor_name}</Typography>
                    <Typography variant="body2"><strong>Work Type:</strong> {selectedVendor.work_type}</Typography>
                    <Typography variant="body2"><strong>PAN:</strong> {selectedVendor.pan_no || 'Not provided'}</Typography>
                    <Typography variant="body2"><strong>Contact:</strong> {selectedVendor.contact_no || 'Not provided'}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Invoice Details</Typography>
              <Stack spacing={2}>
                <TextField
                  label={type === 'SC' ? 'Particular' : 'Machinery/Vehicle'}
                  size="small"
                  value={formData.particular || ''}
                  onChange={handleParticularChange}
                  placeholder={type === 'SC' ? 'Work description (e.g., APP Membrane - Layer A)' : 'Vehicle/Equipment details'}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Invoice Date"
                    type="date"
                    size="small"
                    value={formData.invoice_date || ''}
                    onChange={handleInputChange('invoice_date')}
                    InputLabelProps={{ shrink: true }}
                    helperText="Invoice date (optional)"
                  />
                  <TextField
                    label="RA Bill No"
                    size="small"
                    value={formData.ra_bill_no || ''}
                    onChange={handleInputChange('ra_bill_no')}
                    placeholder="Enter RA Bill Number"
                  />
                </Box>

                <FormControl size="small">
                  <InputLabel>Bill Type</InputLabel>
                  <Select value={formData.bill_type || 'Softcopy'} label="Bill Type" onChange={handleInputChange('bill_type')}>
                    <MenuItem value="Softcopy">Softcopy</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }} gutterBottom>
                <CalculateIcon fontSize="small" /> Financial Calculations
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Gross Amount"
                    type="number"
                    size="small"
                    required
                    value={formData.gross_amount || ''}
                    onChange={handleNumberChange('gross_amount')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                  <TextField
                    label="GST Rate"
                    size="small"
                    value={formData.gst_rate === '' || formData.gst_rate == null ? '' : String(formData.gst_rate)}
                    onChange={handlePercentChange('gst_rate')}
                    placeholder="e.g. 5 or 5%"
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="GST Amount"
                    size="small"
                    value={formatCurrency(calculatedValues.gst_amount)}
                    InputProps={{ readOnly: true }}
                    sx={{ '& input': { color: 'orange.main', fontWeight: 500 } }}
                  />
                  <TextField
                    label="Total Amount"
                    size="small"
                    value={formatCurrency(calculatedValues.total_amount)}
                    InputProps={{ readOnly: true }}
                    sx={{ '& input': { color: 'primary.main', fontWeight: 600 } }}
                  />
                  <FormControl size="small">
                    <InputLabel>TDS Rate</InputLabel>
                    <Select value={formData.tds_rate || 1} label="TDS Rate" onChange={(e) => setField('tds_rate', Number(e.target.value))}>
                      <MenuItem value={1}>1%</MenuItem>
                      <MenuItem value={2}>2%</MenuItem>
                      <MenuItem value={10}>10%</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Deductions & Withholdings</Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="TDS"
                    size="small"
                    value={formatCurrency(calculatedValues.tds)}
                    InputProps={{ readOnly: true }}
                    sx={{ '& input': { color: 'error.main', fontWeight: 500 } }}
                  />
                  <TextField
                    label="Debit/Deduction"
                    type="number"
                    size="small"
                    value={formData.debit_deduction || ''}
                    onChange={handleNumberChange('debit_deduction')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />

                  {!isHiringService && (
                    <TextField
                      label="Retention (5%)"
                      size="small"
                      value={formatCurrency(calculatedValues.retention)}
                      InputProps={{ readOnly: true }}
                      sx={{ '& input': { color: 'warning.main', fontWeight: 500 } }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="GST Hold"
                    type="number"
                    size="small"
                    value={formData.gst_hold === '' ? (calculatedValues.gst_amount || '') : formData.gst_hold}
                    onChange={handleNumberChange('gst_hold')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                  <TextField
                    label="Other Deductions"
                    type="number"
                    size="small"
                    value={formData.other_deductions || ''}
                    onChange={handleNumberChange('other_deductions')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Final Settlement</Typography>
              <Stack spacing={2}>
                <TextField
                  label="NET TOTAL"
                  size="small"
                  value={formatCurrency(calculatedValues.net_total)}
                  InputProps={{ readOnly: true }}
                  sx={{ '& input': { color: 'success.main', fontWeight: 700, fontSize: '1.05rem' } }}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Advances"
                    type="number"
                    size="small"
                    value={formData.advances || ''}
                    onChange={handleNumberChange('advances')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                  <TextField
                    label="Part Paid"
                    type="number"
                    size="small"
                    value={formData.part_paid || ''}
                    onChange={handleNumberChange('part_paid')}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                  <TextField
                    label="PAYABLES"
                    size="small"
                    value={formatCurrency(calculatedValues.payables)}
                    InputProps={{ readOnly: true }}
                    sx={{
                      '& input': {
                        color: (calculatedValues && calculatedValues.payables > 0 ? 'error.main' : 'success.main'),
                        fontWeight: 700, fontSize: '1.05rem'
                      }
                    }}
                  />
                </Box>

                <TextField
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange('notes')}
                  multiline rows={2}
                  size="small"
                  placeholder="Optional notes or comments"
                />
              </Stack>
            </Box>

            {calculatedValues && (calculatedValues.payables < 0 || calculatedValues.payables === undefined) && (
              <Alert severity="warning"><strong>Warning:</strong> Payable amount is negative or not computed. Please check advances and part paid amounts.</Alert>
            )}

          </Stack>
        </Box>

        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : initialData.id ? 'Update Entry' : 'CREATE ENTRY'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

MonthlyEntryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['SC','HS']),
  vendors: PropTypes.array,
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired
};
