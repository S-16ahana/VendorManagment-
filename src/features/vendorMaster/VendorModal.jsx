// src/features/vendorMaster/VendorModal.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { WORK_TYPES } from "./dummyData";
import ModalForm from "../../components/common/ModalForm";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90vw",
  maxWidth: 700,
  maxHeight: "90vh",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 0,
  outline: "none",
  overflow: "hidden",
};

const VendorModal = ({ open, onClose, initialData = {}, onSave }) => {
  const [formData, setFormData] = useState({
    type: "",
    vendor_name: "",
    work_type: "",
    pan_no: "",
    bank_ac_no: "",
    ifsc: "",
    contact_no: "",
    address: "",
    notes: "",
    ...initialData,
  });

  // sync when initialData changes (preserve behavior)
  useEffect(() => {
    setFormData((prev) => ({ ...prev, ...initialData }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [availableWorkTypes, setAvailableWorkTypes] = useState(() => [...WORK_TYPES]);

  // state for Add Work Type modal (replaces prompt/alert)
  const [addWorkOpen, setAddWorkOpen] = useState(false);

  const setField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const validateField = useCallback((name, value) => {
    switch (name) {
      case "pan_no":
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          return "Invalid PAN format (e.g., XXXXX1234X)";
        }
        break;
      case "ifsc":
        if (value && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
          return "Invalid IFSC format (e.g., SBIN0000123)";
        }
        break;
      case "contact_no":
        if (value && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(value)) {
          return "Invalid phone number format";
        }
        break;
      default:
        break;
    }
    return null;
  }, []);

  const handleInputChange = useCallback(
    (field) => (e) => {
      const value = e?.target?.value ?? "";
      setField(field, value);
      const error = validateField(field, value);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [setField, validateField]
  );

  const handleWorkTypeChange = useCallback(
    (event, newValue) => {
      setField("work_type", newValue || "");
    },
    [setField]
  );

  // open the Add Work Type modal (replaces prompt)
  const handleAddWorkOpen = useCallback(() => {
    setAddWorkOpen(true);
  }, []);

  const handleAddWorkClose = useCallback(() => {
    setAddWorkOpen(false);
  }, []);

  // this will be passed to ModalForm as onSubmit
  const handleAddWorkSubmit = useCallback(
    async (values) => {
      const newWorkType = (values.work_type || "").trim();
      if (!newWorkType) {
        // ModalForm validation should cover this, but guard anyway
        throw new Error("Work type is required");
      }
      // check duplicate (case-insensitive)
      const exists = availableWorkTypes.some((w) => w.toLowerCase() === newWorkType.toLowerCase());
      if (exists) {
        // return an error to ModalForm by throwing
        throw new Error("This work type already exists");
      }
      setAvailableWorkTypes((prev) => [...prev, newWorkType].sort());
      setField("work_type", newWorkType);
      setAddWorkOpen(false);
    },
    [availableWorkTypes, setField]
  );

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.type) newErrors.type = "Vendor type is required";
    if (!formData.vendor_name?.trim()) newErrors.vendor_name = "Vendor name is required";
    if (!formData.work_type?.trim()) newErrors.work_type = "Work type is required";

    // Validate other fields
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const handleSubmit = useCallback(
    async (e) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();

      if (!validateForm()) {
        return;
      }

      try {
        setSubmitting(true);
        await onSave(formData);
        onClose();
      } catch (err) {
        console.error("Save failed", err);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, onSave, onClose, validateForm]
  );

  return (
    <>
      <Modal open={open} onClose={onClose} closeAfterTransition>
        <Box sx={modalStyle}>
          {/* Header */}
          <Box
            sx={{
              p: 3,
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              {initialData.id ? "Edit Vendor" : "Add New Vendor"}
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Form */}
          <Box
            sx={{ maxHeight: "calc(90vh - 140px)", overflow: "auto", p: 3 }}
            component="form"
            onSubmit={handleSubmit}
          >
            <Stack spacing={3}>
              {/* Vendor Type */}
              <FormControl size="small" required error={!!errors.type}>
                <InputLabel>Vendor Type</InputLabel>
                <Select
                  value={formData.type || ""}
                  label="Vendor Type"
                  onChange={handleInputChange("type")}
                >
                  <MenuItem value="SC">Subcontractor (SC)</MenuItem>
                  <MenuItem value="HS">Hiring Service (HS)</MenuItem>
                </Select>
                {errors.type && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.type}
                  </Typography>
                )}
              </FormControl>

              {/* Vendor Name */}
              <TextField
                label="Vendor Name"
                size="small"
                required
                value={formData.vendor_name || ""}
                onChange={handleInputChange("vendor_name")}
                error={!!errors.vendor_name}
                helperText={errors.vendor_name || "Enter vendor company name"}
                placeholder="Enter vendor company name"
              />

              {/* Work Type with Autocomplete + Add New (now opens modal) */}
              <Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Autocomplete
                    fullWidth
                    freeSolo
                    size="small"
                    options={availableWorkTypes}
                    value={formData.work_type || ""}
                    onChange={handleWorkTypeChange}
                    onInputChange={(event, newInputValue) => {
                      setField("work_type", newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Work Type"
                        required
                        error={!!errors.work_type}
                        helperText={errors.work_type || "Select or type work type"}
                        placeholder="e.g., APP Membrane, Tractor-115"
                      />
                    )}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddWorkOpen}
                    sx={{ minWidth: 120, height: 40 }}
                  >
                    Add New
                  </Button>
                </Box>
              </Box>

              {/* PAN Number */}
              <TextField
                label="PAN Number"
                size="small"
                value={formData.pan_no || ""}
                onChange={handleInputChange("pan_no")}
                error={!!errors.pan_no}
                helperText={errors.pan_no || "e.g., XXXXX1234X"}
                placeholder="e.g., XXXXX1234X"
              />

              {/* Bank Details */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  label="Bank Account Number"
                  size="small"
                  value={formData.bank_ac_no || ""}
                  onChange={handleInputChange("bank_ac_no")}
                  placeholder="Enter bank account number"
                />
                <TextField
                  label="IFSC Code"
                  size="small"
                  value={formData.ifsc || ""}
                  onChange={handleInputChange("ifsc")}
                  error={!!errors.ifsc}
                  helperText={errors.ifsc || "e.g., SBIN0000123"}
                  placeholder="e.g., SBIN0000123"
                />
              </Box>

              {/* Contact Number */}
              <TextField
                label="Contact Number"
                type="tel"
                size="small"
                value={formData.contact_no || ""}
                onChange={handleInputChange("contact_no")}
                error={!!errors.contact_no}
                helperText={errors.contact_no || "+91 98765 43210"}
                placeholder="+91 98765 43210"
              />

              {/* Address */}
              <TextField
                label="Address"
                multiline
                rows={3}
                size="small"
                value={formData.address || ""}
                onChange={handleInputChange("address")}
                placeholder="Enter complete address with city, state, pincode"
              />

              {/* Notes */}
              <TextField
                label="Notes"
                multiline
                rows={2}
                size="small"
                value={formData.notes || ""}
                onChange={handleInputChange("notes")}
                placeholder="Optional notes or additional information"
              />
            </Stack>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 3,
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button onClick={onClose} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
              {submitting
                ? "Saving..."
                : initialData.id
                ? "Update Vendor"
                : "Create Vendor"}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Add Work Type Modal (uses your ModalForm component) */}
      <ModalForm
        open={addWorkOpen}
        onClose={handleAddWorkClose}
        title="Add Work Type"
        submitText="Add"
        maxWidth={480}
        fields={[
          {
            name: "work_type",
            label: "Work Type",
            required: true,
            placeholder: "e.g., APP Membrane",
            validate: (v) => {
              if (!v || !v.trim()) return "Work type is required";
              const exists = availableWorkTypes.some(
                (w) => w.toLowerCase() === v.trim().toLowerCase()
              );
              if (exists) return "This work type already exists";
              return null;
            },
          },
        ]}
        initialValues={{ work_type: "" }}
        onSubmit={handleAddWorkSubmit}
      />
    </>
  );
};

VendorModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};

export default VendorModal;
