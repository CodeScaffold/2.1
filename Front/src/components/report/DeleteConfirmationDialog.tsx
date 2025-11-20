// src/components/report/DeleteConfirmationDialog.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import Slide from "@mui/material/Slide";
import { TransitionProps } from "@mui/material/transitions";

const nodeRef = React.createRef<HTMLDivElement>();

const Transition = React.forwardRef<
  HTMLDivElement,
  TransitionProps & { children: React.ReactElement }
>(function Transition(props, ref) {
  const { children, ...other } = props;
  return (
    <Slide direction="up" ref={ref} {...(other as any)} nodeRef={nodeRef}>
      {children}
    </Slide>
  );
});

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const handleDialogClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleDialogClose}
      aria-describedby="alert-dialog-slide-description"
      PaperProps={{ style: { backgroundColor: "#121212" } }}
    >
      <DialogTitle>{"Confirm Deletion"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          Are you sure you want to delete this row?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          style={{ color: "red" }}
          color="primary"
          autoFocus
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
