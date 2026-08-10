import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface ToastProps {
  open: boolean;
  message: string;
  severity?: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  open,
  message,
  severity = 'success',
  onClose,
  autoHideDuration = 3500,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        elevation={4}
        sx={{
          width: '100%',
          fontWeight: 700,
          borderRadius: 2,
          fontFamily: 'Cairo, Segoe UI, sans-serif',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
