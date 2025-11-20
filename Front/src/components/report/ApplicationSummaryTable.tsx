// src/components/report/ApplicationSummaryTable.tsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  AppBar,
  Tabs,
  Tab,
} from "@mui/material";
import {alpha, useTheme} from "@mui/material/styles";

interface GroupedApplication {
  accountType: string;
  riskType: string;
  accountBalance: number | string;
  accountPhase: string;
  total: number;
  approved: number;
  rejected: number;
}

interface ApplicationSummaryTableProps {
  filteredGroupedApplications: GroupedApplication[];
  activeFilters: { field: string; value: string }[];
  setActiveFilters: React.Dispatch<
    React.SetStateAction<{ field: string; value: string }[]>
  >;
  exportGroupedCSV: () => void;
}

const ApplicationSummaryTable: React.FC<ApplicationSummaryTableProps> = ({
  filteredGroupedApplications,
  activeFilters,
  setActiveFilters,
  exportGroupedCSV,
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Hardcoded filter options
  const accountTypes = ["LEGEND", "PEAK_SCALP", "BLACK", "FLASH"];
  const accountBalances = [
    "5000",
    "10000",
    "25000",
    "50000",
    "100000",
    "200000",
    "400000",
  ];
  const phases = ["phase1", "phase2", "funded"];

  // Define tabs in the desired order
  const tabs = [...accountTypes, ...accountBalances, ...phases, "Total"];

  const handleTabChange = (_: React.SyntheticEvent, newVal: number) => {
    setTabValue(newVal);
    const selected = tabs[newVal];
    if (selected === "Total") {
      setActiveFilters([]);
    } else if (accountTypes.includes(selected)) {
      setActiveFilters([{ field: "accountType", value: selected }]);
    } else if (accountBalances.includes(selected)) {
      setActiveFilters([{ field: "accountBalance", value: selected }]);
    } else if (phases.includes(selected)) {
      setActiveFilters([{ field: "accountPhase", value: selected }]);
    }
  };

  // Filter the data based on activeFilters
  const displayedApplications = filteredGroupedApplications.filter(
    (item) =>
      activeFilters.length === 0 ||
      activeFilters.every((f) => String((item as any)[f.field]) === f.value),
  );

  const summary = filteredGroupedApplications.reduce(
    (acc, item) => {
      acc.total += item.total;
      acc.approved += item.approved;
      acc.rejected += item.rejected;
      return acc;
    },
    { total: 0, approved: 0, rejected: 0, payment: 0 },
  );

  const phase1TotalHandled = filteredGroupedApplications
    .filter((item) => item.accountPhase === "phase1")
    .reduce((acc, item) => acc + item.total, 0);
  const phase2TotalHandled = filteredGroupedApplications
    .filter((item) => item.accountPhase === "phase2")
    .reduce((acc, item) => acc + item.total, 0);
  const fundedTotalHandled = filteredGroupedApplications
    .filter((item) => item.accountPhase === "funded")
    .reduce((acc, item) => acc + item.total, 0);
  const approvedFundedTotal = filteredGroupedApplications
    .filter((item) => item.accountPhase === "funded")
    .reduce((acc, item) => acc + item.approved, 0);

  const phase1Pct = summary.total
    ? Math.round((phase1TotalHandled / summary.total) * 100)
    : 0;
  const phase2Pct = summary.total
    ? Math.round((phase2TotalHandled / summary.total) * 100)
    : 0;
  const fundedPct = summary.total
    ? Math.round((fundedTotalHandled / summary.total) * 100)
    : 0;
  const approvedFundedPct = fundedTotalHandled
    ? Math.round((approvedFundedTotal / fundedTotalHandled) * 100)
    : 0;

  const arrowItems = [
    { label: "Phase 1", count: phase1TotalHandled, pct: phase1Pct },
    { label: "Phase 2", count: phase2TotalHandled, pct: phase2Pct },
    { label: "Funded", count: fundedTotalHandled, pct: fundedPct },
    {
      label: "Payout",
      count: approvedFundedTotal,
      pct: approvedFundedPct,
    },
  ];

  const theme = useTheme();

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, width: "100%" ,backgroundColor: alpha(theme.palette.background.paper, 0.7) }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Application Summary
        </Typography>
        <Box sx={{ position: "relative",  mb: 2 }}>
          <AppBar position="static" color="default">
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabs.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </AppBar>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Button variant="contained" onClick={exportGroupedCSV}>
            Export
          </Button>
        </Box>
        {/* Arrow summary card */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                overflowX: "auto",
              }}
            >
              {arrowItems.map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    px: 3,
                    py: 1,
                    mx: 1,
                    minWidth: 120,
                    clipPath:
                      "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="subtitle2">{item.label}</Typography>
                  <Typography variant="h6">{item.count}</Typography>
                  <Typography variant="caption">{item.pct}%</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
        <TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Account Type</TableCell>
                <TableCell>Risk Type</TableCell>
                <TableCell>Account Balance</TableCell>
                <TableCell>Phase</TableCell>
                <TableCell>Total Handled</TableCell>
                <TableCell>Approved</TableCell>
                <TableCell>Rejected</TableCell>
                <TableCell>Accept Ratio</TableCell>
                <TableCell>Payment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedApplications.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.accountType}</TableCell>
                  <TableCell>{item.riskType}</TableCell>
                  <TableCell>{item.accountBalance}</TableCell>
                  <TableCell>{item.accountPhase}</TableCell>
                  <TableCell>{item.total}</TableCell>
                  <TableCell>{item.approved}</TableCell>
                  <TableCell>{item.rejected}</TableCell>
                  <TableCell>
                    {item.total > 0
                      ? Math.round((item.approved / item.total) * 100)
                      : 0}
                    %
                  </TableCell>
                  <TableCell>
                    {item.accountPhase.toLowerCase() === "funded" ? "" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default ApplicationSummaryTable;
