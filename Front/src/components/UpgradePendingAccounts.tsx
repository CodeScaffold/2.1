import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Chip,
  Typography,
  Box,
  TextField, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import * as React from "react";
import { UpgradePendingAccount } from "../utils/types";
import {alpha, useTheme} from "@mui/material/styles";
import {Link as RouterLink} from "react-router-dom";
import LaunchIcon from "@mui/icons-material/Launch";

interface UpgradePendingAccountsProps {
  accounts: UpgradePendingAccount[];
}

export const UpgradePendingAccounts: React.FC<UpgradePendingAccountsProps> = ({
  accounts,
}) => {
  const [search, setSearch] = React.useState("");
  const processed = React.useMemo(() => {
    return accounts
      .map((acc) => ({
        ...acc,
        pendingDate: new Date(acc.updatedAt),
      }))
      .sort((a, b) => a.pendingDate.getTime() - b.pendingDate.getTime())
      .filter((acc) => {
        const term = search.toLowerCase();
        return (
          acc.login.includes(term) ||
          acc.firstName?.toLowerCase().includes(term) ||
          acc.lastName?.toLowerCase().includes(term) ||
          acc.email.toLowerCase().includes(term) ||
          (acc.programName ?? "").toLowerCase().includes(term)
        );
      });
  }, [accounts, search]);

  const [page, setPage] = React.useState(0);
  const rowsPerPage = 15;

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const displayed = processed.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );



  const theme = useTheme();

  return (
    <Paper
      sx={{
        padding: 2,
        marginTop: 5,
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
      }}
    >
      <Box mb={2} sx={{ width: "33.3333%" }}>
        <TextField
          fullWidth
          variant="outlined"
          size="medium"
          placeholder="Search for accounts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1 }} />,
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.background.default, 0.7),
            },
            "& .MuiInputBase-input": {
              fontSize: "1rem",
              padding: "10px",
            },
          }}
        />
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Current</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Pending Since</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayed.map((acc, idx) => {
              const programLower = (acc.programName ?? acc.programId ?? "").toString().toLowerCase();
              const isPhase2 =
                programLower.includes("phase2") ||
                programLower.includes("phase 2") ||
                programLower.includes("step2");
              const route = isPhase2 ? "/statement/phase2" : "/statement/phase1";
              return (
                <TableRow key={`${acc.id}-${idx}`}>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="h6">{acc.login}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {acc.programName ?? acc.programId} • {acc.version}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="subtitle1">
                      {acc.firstName} {acc.lastName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {acc.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="subtitle1">
                      {acc.balance != null
                        ? `$${acc.balance.toLocaleString()}`
                        : "-"}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Equity:{" "}
                      {acc.equity != null
                        ? `$${acc.equity.toLocaleString()}`
                        : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Chip label="Upgrade Pending" color="warning" size="medium" />
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    {!isNaN(acc.pendingDate.getTime())
                      ? acc.pendingDate.toLocaleString(undefined, { hour12: false })
                      : "N/A"}
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                      <Button
                        component={RouterLink}
                        to={route}
                        size="small"
                        variant="contained"
                        fullWidth
                        endIcon={<LaunchIcon />}
                        sx={{
                          backgroundColor: "#3f51b5",
                          textTransform: "none",
                          borderRadius: 2,
                        }}
                      >
                        Verify
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={processed.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[]}
      />
    </Paper>
  );
};
