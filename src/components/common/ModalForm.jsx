// src/components/common/ModalForm.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import CloseIcon from "@mui/icons-material/Close";
import Stack from "@mui/material/Stack";


export default function ModalForm({
  open,
  onClose,
  title = "Form",
  fields = [],
  initialValues = {},
  onSubmit,
  submitText = "Save",
  maxWidth = 600,
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const wasOpen = useRef(false);

  // compute defaults only on open transition -> true
  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    const defaults = (fields || []).reduce((acc, f) => {
      acc[f.name] = f.default ?? "";
      return acc;
    }, {});
    setValues({ ...defaults, ...(initialValues || {}) });
    setErrors({});
    wasOpen.current = true;
    // intentionally do not depend on `fields` to avoid frequent re-inits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  const validate = useCallback(() => {
    const next = {};
    (fields || []).forEach((f) => {
      const v = values[f.name];
      if (f.required && (v === "" || v === undefined || v === null)) next[f.name] = `${f.label || f.name} is required`;
      else if (typeof f.validate === "function") {
        const msg = f.validate(v, values);
        if (msg) next[f.name] = msg;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [fields, values]);

  const handleChange = useCallback((name) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((s) => {
      if (!s[name]) return s;
      const copy = { ...s };
      delete copy[name];
      return copy;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!validate()) return;
      try {
        setSubmitting(true);
        await onSubmit?.(values);
        setSubmitting(false);
        onClose?.();
      } catch (err) {
        console.error(err);
        setSubmitting(false);
        setErrors((s) => ({ ...s, _form: err?.message || "Submit failed" }));
      }
    },
    [onSubmit, validate, values, onClose]
  );

  const renderField = useCallback(
    (field, idx) => {
      const val = values[field.name] ?? "";
      if (field.type === "select") {
        return (
          <FormControl key={field.name} fullWidth margin="dense" size="small" error={!!errors[field.name]}>
            <InputLabel required={!!field.required} id={`lbl-${field.name}`}>
              {field.label ?? field.name}
            </InputLabel>
            <Select
              labelId={`lbl-${field.name}`}
              value={val}
              onChange={handleChange(field.name)}
              label={field.label}
              autoFocus={idx === 0}
            >
              {(field.options || []).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {(errors[field.name] || field.helperText) && (
              <Typography variant="caption" color={errors[field.name] ? "error" : "text.secondary"} sx={{ ml: 1.5, mt: 0.5 }}>
                {errors[field.name] ?? field.helperText}
              </Typography>
            )}
          </FormControl>
        );
      }

      return (
        <TextField
          key={field.name}
          name={field.name}
          label={field.label ?? field.name}
          value={val}
          onChange={handleChange(field.name)}
          fullWidth
          margin="dense"
          size="small"
          error={!!errors[field.name]}
          helperText={errors[field.name] ?? field.helperText}
          placeholder={field.placeholder || ""}
          required={!!field.required}
          type={field.type || "text"}
          multiline={!!field.multiline}
          rows={field.rows}
          inputProps={{ ...(field.inputProps || {}), readOnly: false }}
          autoFocus={idx === 0}
        />
      );
    },
    [values, errors, handleChange]
  );

  const boxSx = useMemo(
    () => ({
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "calc(100% - 48px)",
      maxWidth,
      bgcolor: "background.paper",
      borderRadius: 2,
      boxShadow: 24,
      p: 0,
      outline: "none",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
    }),
    [maxWidth]
  );

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="modal-form-title" closeAfterTransition disableEnforceFocus>
      <Box sx={boxSx}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
          <Typography id="modal-form-title" variant="h6" component="h2">
            {title}
          </Typography>
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        <form onSubmit={handleSubmit} noValidate style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ p: 3, flex: 1, overflow: "auto" }}>
            {errors._form && <Box sx={{ mb: 2, color: "error.main", fontSize: 14 }}>{errors._form}</Box>}
            <Stack spacing={2}>{(fields || []).map((f, i) => renderField(f, i))}</Stack>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ p: 3, borderTop: 1, borderColor: "divider" }}>
            <Button onClick={onClose} variant="outlined" type="button">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Saving..." : submitText}
            </Button>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
}

ModalForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  fields: PropTypes.array,
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func,
  submitText: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
