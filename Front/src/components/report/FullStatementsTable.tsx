// src/components/report/FullStatementsTable.tsx
import React from "react";
import {
  Card,
  CardContent,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
} from "@mui/material";
import { DeleteIcon } from "lucide-react";
import {alpha, useTheme} from "@mui/material/styles";

export interface Report {
  id: number;
  accountLogin: string;
  agent: string;
  agentDecision: string;
  accountPhase: string;
  accountType?: string;
  riskType?: string;
  accountBalance?: number;
  email?: string;
  violations: string[];
  stabilityRuleViolations?: string[];
  metaTraderVersion: string;
  createdAt: string;
  note: string;
}

interface FullStatementsTableProps {
  paginatedReports: Report[];
  sortColumn: string;
  sortDirection: "asc" | "desc";
  handleSort: (column: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  exportCSV: () => void;
  confirmDeleteRow: (id: number) => void;
  page: number;
  rowsPerPage: number;
  totalReports: number;
  onPageChange: (event: unknown, newPage: number) => void;
}

export const FullStatementsTable: React.FC<FullStatementsTableProps> = ({
  paginatedReports,
  sortColumn,
  sortDirection,
  handleSort,
  searchQuery,
  setSearchQuery,
  exportCSV,
  confirmDeleteRow,
  page,
  rowsPerPage,
  totalReports,
  onPageChange,
}) => {

  const theme = useTheme();
  console.log('paginatedReports', paginatedReports);
  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, width: "100%",backgroundColor: alpha(theme.palette.background.paper, 0.7) }}>
      <CardContent>
        <Box
          sx={{

            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <TextField
            label="Search Here"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="contained" onClick={exportCSV}>
            Export
          </Button>
        </Box>
        <TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Account Login</TableCell>
                <TableCell
                  onClick={() => handleSort("agent")}
                  style={{ cursor: "pointer" }}
                >
                  Agent{" "}
                  {sortColumn === "agent"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("decision")}
                  style={{ cursor: "pointer" }}
                >
                  Decision{" "}
                  {sortColumn === "decision"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("phase")}
                  style={{ cursor: "pointer" }}
                >
                  Phase{" "}
                  {sortColumn === "phase"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
                <TableCell>Account Type</TableCell>
                <TableCell>Risk Type</TableCell>
                <TableCell>Account Balance</TableCell>
                <TableCell sx={{ display: 'none' }}>Email</TableCell>
                <TableCell
                  onClick={() => handleSort("violations")}
                  style={{ cursor: "pointer" }}
                >
                  Violations / flagged{" "}
                  {sortColumn === "violations"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
                <TableCell>Notes</TableCell>
                <TableCell
                  onClick={() => handleSort("version")}
                  style={{ cursor: "pointer" }}
                >
                  Version{" "}
                  {sortColumn === "version"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("Date")}
                  style={{ cursor: "pointer" }}
                >
                  Date{" "}
                  {sortColumn === "Date"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.accountLogin}</TableCell>
                  <TableCell>
                    {report.agent ? report.agent.toUpperCase() : ""}
                  </TableCell>
                  <TableCell
                    style={{
                      color:
                        report.agentDecision === "Approved"
                          ? "green"
                          : report.agentDecision === "Rejected"
                            ? "red"
                            : "inherit",
                    }}
                  >
                    {report.agentDecision}
                  </TableCell>
                  <TableCell>{report.accountPhase}</TableCell>
                  <TableCell>{report.accountType || ""}</TableCell>
                  <TableCell>{report.riskType || ""}</TableCell>
                  <TableCell>
                    {report.accountBalance !== undefined
                      ? report.accountBalance
                      : ""}
                  </TableCell>
                  <TableCell sx={{ display: 'none' }}>{report.email || ""}</TableCell>
                  <TableCell style={{ color: "red" }}>
                    {[...(report.violations || []), ...(report.stabilityRuleViolations || [])].join(", ")}
                  </TableCell>
                  <TableCell>{report.note || ""}</TableCell>
                  <TableCell>
                    {report.metaTraderVersion
                      ? report.metaTraderVersion.toUpperCase()
                      : ""}
                  </TableCell>
                  <TableCell>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => confirmDeleteRow(report.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalReports}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[]}
        />
      </CardContent>
    </Card>
  );
};

export default FullStatementsTable;
