import React, { useState, useEffect, useMemo } from "react";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Typography,
  Box,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import {getBackendPayouts, Payout} from "../utils/api";
import { API_URL } from "./settings.ts";
import { v4 as uuidv4 } from "uuid";
import {alpha, useTheme} from "@mui/material/styles";
import { useOpoAuth } from "../OpoAuth";

interface NewPayoutData {
  fullName: string;
  email: string;
  login: string;
  accountId: string;
  amount: number;
  transferAmount: number;
  profitSplit: number;
  payoutDetails: {
    currency: string;
    walletAddress: string;
  };
  state: string;
  rejectionReason: string | null;
  userId: string;
  type: string;
  paymentAgent?: string | null;
}

const Payouts: React.FC = () => {
  const { isAuthenticated, isLoading } = useOpoAuth(); // Add auth check
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>("");

  const [newPayout, setNewPayout] = useState<NewPayoutData>({
    fullName: "",
    email: "",
    login: "",
    accountId: "",
    amount: 0,
    transferAmount: 0,
    profitSplit: 0,
    payoutDetails: { currency: "", walletAddress: "" },
    state: "Pending",
    rejectionReason: null,
    userId: "",
    type: "",
    paymentAgent: null,
  });

  const [openDialog, setOpenDialog] = useState(false);
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpenDialog(false);
  };

  useEffect(() => {
    const loadPayouts = async () => {
      // Don't make API calls if still loading auth or not authenticated
      if (isLoading || !isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('🔄 Loading payouts...');
        const data = await getBackendPayouts();
        setPayouts(data);
        console.log('✅ Payouts loaded successfully');
      } catch (err) {
        console.error('❌ Error loading payouts:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An error occurred while fetching payouts");
        }
      } finally {
        setLoading(false);
      }
    };

    loadPayouts();
  }, [isAuthenticated, isLoading]); // Add dependencies

  const filtered = useMemo(
      () =>
          payouts.filter((p) =>
              [p.fullName, p.email, p.login].some((field) =>
                  field?.toLowerCase().includes(searchTerm.toLowerCase()),
              ),
          ),
      [payouts, searchTerm],
  );

  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const displayed = filtered.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
  );

  const formatDate = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return `${d.toLocaleString("en-US", opts)}`;
  };

  const handleEdit = (payout: Payout) => {
    setEditingId(payout.id);
    setEditingAmount(payout.amount.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingAmount("");
  };

  const handleSave = async (id: string) => {
    const newAmount = parseFloat(editingAmount);
    try {
      // Fixed fetch call with proper credentials
      await fetch(`${API_URL}/payouts/${id}`, {
        method: "PATCH",
        credentials: 'include', // Fixed: moved credentials to proper place
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ amount: newAmount }),
      });
      // Update local state
      setPayouts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, amount: newAmount } : p)),
      );
    } catch (e) {
      console.error("Failed to save payout:", e);
    } finally {
      handleCancel();
    }
  };

  const addPayout = async () => {
    const payload: Payout = {
      id: uuidv4(),
      ...newPayout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const response = await fetch(`${API_URL}/payouts`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const created: Payout = await response.json();
      setPayouts((prev) => [created, ...prev]);
      setNewPayout({
        fullName: "",
        email: "",
        login: "",
        accountId: "",
        amount: 0,
        transferAmount: 0,
        profitSplit: 0,
        payoutDetails: { currency: "", walletAddress: "" },
        state: "Pending",
        rejectionReason: null,
        userId: "",
        type: "",
        paymentAgent: null,
      });
    } else {
      console.error("Failed to add payout:", response.statusText);
    }
  };

  const handleStateChange = async (id: string, newState: string) => {
    try {
      await fetch(`${API_URL}/payouts/${id}`, {
        method: "PATCH",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ state: newState }),
      });
      setPayouts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, state: newState } : p)),
      );
    } catch (err) {
      console.error("Failed to update state:", err);
    }
  };

  const theme = useTheme();

  // Show loading while checking authentication
  if (isLoading) {
    return <div style={{ padding: 16 }}>Checking authentication...</div>;
  }

  // Show message if not authenticated (shouldn't happen due to ProtectedRoute, but good safety)
  if (!isAuthenticated) {
    return <div style={{ padding: 16 }}>Please log in to view payouts.</div>;
  }

  if (loading) return <div style={{ padding: 16 }}>Loading payouts...</div>;
  if (error)
    return <div style={{ padding: 16, color: "red" }}>Error: {error}</div>;

  return (
      <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.background.paper, 0.7), color: "grey.100" }}>
        <Box mb={2} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ flexGrow: 1, maxWidth: "33.333%" }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Search for accounts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: "grey.400" }} />,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "grey.800",
                  },
                  "& .MuiInputBase-input": {
                    color: "grey.100",
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: "grey.400",
                  },
                }}
            />
          </Box>
          <Button
              variant="contained"
              color="success"
              sx={{ borderRadius: "20px" }}
              onClick={handleOpenDialog}
          >
            Add New Payout
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "grey.800" }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Transaction Details</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.map((p) => (
                  <TableRow
                      key={p.id}
                      sx={{ "&:hover": { backgroundColor: "grey.800" } }}
                  >
                    <TableCell>
                      <Typography variant="subtitle1">{p.fullName}</Typography>
                      <Typography variant="body2" color="grey.400">
                        {p.email}
                      </Typography>
                      <Typography variant="body2" color="grey.400">
                        Account ID: {p.login}
                      </Typography>
                      <Typography variant="body2" color="grey.400">
                        Requested On: {formatDate(p.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {p.type
                          ? p.type.replace(/([a-z])([A-Z])/g, "$1 $2")
                          : p.payoutDetails.currency}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">
                        Currency: {p.payoutDetails.currency}
                      </Typography>
                      <Typography variant="body2" color="grey.400">
                        Address: {p.payoutDetails.walletAddress}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <TextField
                                size="small"
                                value={editingAmount}
                                onChange={(e) => setEditingAmount(e.target.value)}
                                sx={{ width: 80 }}
                            />
                            <IconButton onClick={() => handleSave(p.id)}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={handleCancel}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                      ) : (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="subtitle1">
                              ${p.amount.toLocaleString()}
                            </Typography>
                            <IconButton onClick={() => handleEdit(p)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                          value={p.state}
                          size="small"
                          onChange={(e) => handleStateChange(p.id, e.target.value)}
                          sx={{
                            width: "150px",
                            borderRadius: 1,
                            color: "common.white",
                            backgroundColor:
                                p.state === "Pending"
                                    ? "warning.main"
                                    : p.state === "Approved"
                                        ? "success.main"
                                        : "error.main",
                          }}
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Approved">Approved</MenuItem>
                        <MenuItem value="Rejected">Rejected</MenuItem>
                      </Select>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            sx={{
              color: "grey.100",
              "& .MuiTablePagination-actions": { color: "grey.100" },
            }}
            ActionsComponent={(subprops) => {
              const { page, onPageChange } = subprops;
              const handleBackButtonClick = (
                  event: React.MouseEvent<HTMLButtonElement>,
              ) => {
                onPageChange(event, page - 1);
              };
              const handleNextButtonClick = (
                  event: React.MouseEvent<HTMLButtonElement>,
              ) => {
                onPageChange(event, page + 1);
              };
              return (
                  <Box
                      sx={{
                        flexShrink: 0,
                        ml: 2.5,
                        display: "flex",
                        alignItems: "center",
                      }}
                  >
                    <Box
                        component="button"
                        onClick={handleBackButtonClick}
                        disabled={page === 0}
                        aria-label="previous page"
                        style={{
                          border: "none",
                          background: "none",
                          color: page === 0 ? "grey" : "inherit",
                          cursor: page === 0 ? "default" : "pointer",
                          fontSize: 20,
                        }}
                    >
                      ‹
                    </Box>
                    <Box component="span" mx={1} sx={{ color: "grey.100" }}>
                      {page + 1}
                    </Box>
                    <Box component="span" mx={1} sx={{ color: "grey.100" }}>
                      of {Math.ceil(filtered.length / rowsPerPage)}
                    </Box>
                    <Box
                        component="button"
                        onClick={handleNextButtonClick}
                        disabled={(page + 1) * rowsPerPage >= filtered.length}
                        aria-label="next page"
                        style={{
                          border: "none",
                          background: "none",
                          color:
                              (page + 1) * rowsPerPage >= filtered.length
                                  ? "grey"
                                  : "inherit",
                          cursor:
                              (page + 1) * rowsPerPage >= filtered.length
                                  ? "default"
                                  : "pointer",
                          fontSize: 20,
                        }}
                    >
                      ›
                    </Box>
                  </Box>
              );
            }}
        />
        <Dialog
            open={openDialog}
            onClose={handleCloseDialog}
            fullWidth
            maxWidth="sm"
        >
          <DialogTitle>Add New Payout</DialogTitle>
          <DialogContent
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <TextField
                label="Full Name"
                size="small"
                value={newPayout.fullName}
                onChange={(e) =>
                    setNewPayout((p) => ({ ...p, fullName: e.target.value }))
                }
            />
            <TextField
                label="Email"
                size="small"
                value={newPayout.email}
                onChange={(e) =>
                    setNewPayout((p) => ({ ...p, email: e.target.value }))
                }
            />
            <TextField
                label="Login"
                size="small"
                value={newPayout.login}
                onChange={(e) =>
                    setNewPayout((p) => ({ ...p, login: e.target.value }))
                }
            />
            <TextField
                label="Account ID"
                size="small"
                value={newPayout.accountId}
                onChange={(e) =>
                    setNewPayout((p) => ({ ...p, accountId: e.target.value }))
                }
            />
            <TextField
                label="Amount"
                size="small"
                type="number"
                value={newPayout.amount}
                onChange={(e) =>
                    setNewPayout((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value),
                    }))
                }
            />
            <TextField
                label="Currency"
                size="small"
                value={newPayout.payoutDetails.currency}
                onChange={(e) =>
                    setNewPayout((p) => ({
                      ...p,
                      payoutDetails: {
                        ...p.payoutDetails!,
                        currency: e.target.value,
                      },
                    }))
                }
            />
            <TextField
                label="Wallet Address"
                size="small"
                value={newPayout.payoutDetails.walletAddress}
                onChange={(e) =>
                    setNewPayout((p) => ({
                      ...p,
                      payoutDetails: {
                        ...p.payoutDetails!,
                        walletAddress: e.target.value,
                      },
                    }))
                }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
                variant="contained"
                onClick={() => {
                  void addPayout();
                  handleCloseDialog();
                }}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
  );
};

export default Payouts;