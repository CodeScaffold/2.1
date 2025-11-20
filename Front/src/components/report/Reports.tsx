import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
import { getReports } from "../../utils/api";
import MonthSelector from "./MonthSelector";
import SummaryCards from "./SummaryCards";
import ApplicationSummaryTable from "./ApplicationSummaryTable";
import FullStatementsTable from "./FullStatementsTable";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import AgentPerformanceChart from "./AgentPerformanceChart";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
// import { enqueueSnackbar } from "notistack";
import useMediaQuery from "@mui/material/useMediaQuery";
import { API_URL } from "../settings.ts";
import { enqueueSnackbar } from "notistack";
import {alpha, useTheme} from "@mui/material/styles";

const getMonthYear = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
};

export interface Report {
  id: number;
  accountLogin: string;
  violations: string[];
  stabilityRuleViolations?: string[];
  agentDecision: string;
  agent: string;
  createdAt: string;
  accountPhase: string;
  metaTraderVersion: string;
  note: string;
  accountType?: string;
  riskType?: string;
  accountBalance?: number;
}

const agentName = (agent: string | null): string => {
  return agent ? (agent.includes("@") ? agent.split("@")[0] : agent) : "";
};

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [activeFilters, setActiveFilters] = useState<
    { field: string; value: string }[]
  >([]);

  const currentMonthYear = getMonthYear(selectedMonth.toISOString());

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports();
        const transformedReports: Report[] = data.map((report: any) => {
          let violations: string[] = [];
          if (
            report.ThirtySecondTrades === true ||
            report.ThirtySecondTrades === "true" ||
            report.ThirtySecondTrades === "yes"
          ) {
            violations.push("Under 30 Seconds");
          }
          if (
            report.Rule80Percent === true ||
            report.Rule80Percent === "true" ||
            report.Rule80Percent === "yes"
          ) {
            violations.push("80% Profit Target");
          }
          if (
            report.MarginViolations === true ||
            report.MarginViolations === "true" ||
            report.MarginViolations === "yes"
          ) {
            violations.push("50% Margin");
          }
          if (
            report.NewsHedgeTrades === true ||
            report.NewsHedgeTrades === "true" ||
            report.NewsHedgeTrades === "yes"
          ) {
            violations.push("Hedge Trade Violation");
          }

          let stabilityRuleViolations: string[] = [];
          if (
            report.StabilityRule === true ||
            report.StabilityRule === "true" ||
            report.StabilityRule === "yes"
          ) {
            stabilityRuleViolations.push("SR");
          }

          return {
            id: report.id,
            accountLogin: report.tradingLogin || report.accountLogin,
            violations,
            stabilityRuleViolations,
            agentDecision: report.Decision,
            agent: report.Agent,
            createdAt: report.createdAt,
            accountPhase: report.AccountPhase,
            metaTraderVersion: report.MetaTraderVersion,
            note: report.Note,
            accountType: report.accountType,
            riskType: report.riskType,
            accountBalance: report.accountBalance,
          };
        });
        setReports(transformedReports);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      }
    };
    fetchReports();
  }, []);

  // Filter reports by selected month
  const filteredReportsByMonth = reports.filter(
    (report) => getMonthYear(report.createdAt) === currentMonthYear,
  );
  const totalStatements = filteredReportsByMonth.length;
  const approvedCount = filteredReportsByMonth.filter(
    (report) => report.agentDecision === "Approved",
  ).length;
  const rejectedCount = filteredReportsByMonth.filter(
    (report) => report.agentDecision === "Rejected",
  ).length;
  const approvedRatio = totalStatements
    ? (approvedCount / totalStatements) * 100
    : 0;
  const rejectedRatio = totalStatements
    ? (rejectedCount / totalStatements) * 100
    : 0;

  const agentCounts = filteredReportsByMonth.reduce(
    (acc: { [key: string]: number }, report) => {
      const name = agentName(report.agent);
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    },
    {},
  );
  const agents = Object.keys(agentCounts);
  const totalCasesSeries = agents.map((agent) => agentCounts[agent]);

  const totalCasesOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 400,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "14px",
      },
    },
    tooltip: {
      theme: "dark",
      style: {
        fontSize: "14px",
      },
    },
    xaxis: {
      categories: agents,
      labels: {
        style: {
          colors: "#fff",
          fontSize: "14px",
        },
      },
    },
  };

  const totalCasesSeriesData = [
    {
      name: "Total Cases",
      data: totalCasesSeries,
    },
  ];
  Object.keys(agentCounts).map((name) => name.toUpperCase());
  Object.keys(agentCounts).map((name) =>
    totalStatements
      ? Math.round((agentCounts[name] / totalStatements) * 100)
      : 0,
  );

  const filteredReports = filteredReportsByMonth.filter((report) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      (report.accountLogin &&
          report.accountLogin
          .toString()
          .toLowerCase()
          .includes(searchLower)) ||
      (report.agentDecision &&
        report.agentDecision.toLowerCase().includes(searchLower)) ||
      (report.accountBalance != null &&
        report.accountBalance.toString().toLowerCase().includes(searchLower)) ||
      (report.violations &&
        report.violations.join(" ").toLowerCase().includes(searchLower)) ||
      (report.note && report.note.toLowerCase().includes(searchLower)) ||
      (report.metaTraderVersion &&
        report.metaTraderVersion.toLowerCase().includes(searchLower)) ||
      (report.createdAt &&
        new Date(report.createdAt)
          .toLocaleDateString()
          .toLowerCase()
          .includes(searchLower))
    );
  });

  // Group applications for Application Summary Table
  const groupedApplications = filteredReportsByMonth.reduce(
    (acc: { [key: string]: any }, report) => {
      const accountType = report.accountType || "N/A";
      const riskType = report.riskType || "N/A";
      const accountBalance =
        report.accountBalance != null ? report.accountBalance : "N/A";
      const accountPhase = report.accountPhase || "N/A";
      const key = `${accountType}|${riskType}|${accountBalance}|${accountPhase}`;
      if (!acc[key]) {
        acc[key] = {
          accountType,
          riskType,
          accountBalance,
          accountPhase,
          total: 0,
          approved: 0,
          rejected: 0,
        };
      }
      acc[key].total += 1;
      if (report.agentDecision === "Approved") {
        acc[key].approved += 1;
      } else if (report.agentDecision === "Rejected") {
        acc[key].rejected += 1;
      }
      return acc;
    },
    {},
  );
  const groupedApplicationsArray = Object.values(groupedApplications);
  // Filtered grouped applications based on active filters and search query
  const filteredGroupedApplications = groupedApplicationsArray.filter((item) =>
    activeFilters.every((filter) => {
      switch (filter.field) {
        case "accountType":
          return item.accountType.toLowerCase() === filter.value.toLowerCase();
        case "riskType":
          return item.riskType.toLowerCase() === filter.value.toLowerCase();
        case "accountBalance":
          return (
            item.accountBalance.toString().toLowerCase() ===
            filter.value.toLowerCase()
          );
        case "accountPhase":
          return item.accountPhase.toLowerCase() === filter.value.toLowerCase();
        default:
          return true;
      }
    }),
  );

  // Sorting & pagination for full statements
  let sortedAllReports = [...filteredReports];
  if (sortColumn) {
    sortedAllReports.sort((a, b) => {
      let valA = "";
      let valB = "";
      switch (sortColumn) {
        case "agent":
          valA = a.agent ? a.agent.toUpperCase() : "";
          valB = b.agent ? b.agent.toUpperCase() : "";
          break;
        case "decision":
          valA = a.agentDecision ? a.agentDecision.toUpperCase() : "";
          valB = b.agentDecision ? b.agentDecision.toUpperCase() : "";
          break;
        case "phase":
          valA = a.accountPhase ? a.accountPhase.toUpperCase() : "";
          valB = b.accountPhase ? b.accountPhase.toUpperCase() : "";
          break;
        case "violations":
          valA = a.violations ? a.violations.join(", ").toUpperCase() : "";
          valB = b.violations ? b.violations.join(", ").toUpperCase() : "";
          break;
        case "version":
          valA = a.metaTraderVersion ? a.metaTraderVersion.toUpperCase() : "";
          valB = b.metaTraderVersion ? b.metaTraderVersion.toUpperCase() : "";
          break;
        case "Date":
          valA = a.createdAt ? a.createdAt.toUpperCase() : "";
          valB = b.createdAt ? b.createdAt.toUpperCase() : "";
          break;
        default:
          break;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  } else {
    sortedAllReports.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  const rowsPerPage = useMediaQuery("(max-height:600px)") ? 10 : 20;
  const paginatedReports = sortedAllReports.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const exportCSV = () => {
    // Create an array to hold CSV rows
    const csvRows: string[] = [];

    // Define the header row for full statements
    const headers = [
      "Statement Number",
      "Agent",
      "Decision",
      "Phase",
      "Violations",
      "Version",
      "Date",
      "Notes",
    ];
    csvRows.push(headers.join(","));

    // Loop through sortedAllReports (ensure this variable exists in your scope)
    sortedAllReports.forEach((report) => {
      const row = [
        report.accountLogin,
        report.agent,
        report.agentDecision,
        report.accountPhase,
        report.violations.join(" | "),
        report.metaTraderVersion,
        new Date(report.createdAt).toLocaleDateString(),
        report.note || "",
      ];
      csvRows.push(row.join(","));
    });

    // Create and download the CSV file
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "full_statements.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportGroupedCSV = () => {
    const csvRows: string[] = [];

    // Define the header row for grouped application summary
    const headers = [
      "Account Type",
      "Risk Type",
      "Account Balance",
      "Phase",
      "Total Handled",
      "Approved",
      "Rejected",
      "Accept Ratio",
    ];
    csvRows.push(headers.join(","));

    // Loop through filteredGroupedApplications (ensure this variable exists in your scope)
    filteredGroupedApplications.forEach((item) => {
      const acceptRatio =
        item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0;
      const row = [
        item.accountType,
        item.riskType,
        item.accountBalance,
        item.accountPhase,
        item.total,
        item.approved,
        item.rejected,
        `${acceptRatio}%`,
      ];
      csvRows.push(row.join(","));
    });

    // Create and download the CSV file
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "application_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDeleteRow = (id: number) => {
    setRowToDelete(id);
    setDeleteConfirmationOpen(true);
  };

  // Delete function
  const removeRow = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/forfxreports/${id}`, {
        credentials: 'include',
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMessage = "An error occurred";
        try {
          const result = await response.json();
          errorMessage = result.message || errorMessage;
        } catch (error: any) {
          enqueueSnackbar(error.message || "Deletion failed", {
            variant: "error",
          });
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      enqueueSnackbar("Row deleted successfully", { variant: "success" });

      setReports((prevReports) =>
        prevReports.filter((report) => report.id !== id),
      );
    } catch (error: any) {
      enqueueSnackbar(error.message || "Deletion failed", {
        variant: "error",
      });
    }
  };

  const theme = useTheme();

  return (
    <Box>
      <MonthSelector
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
      />
      <SummaryCards
        totalStatements={totalStatements}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        approvedRatio={approvedRatio}
        rejectedRatio={rejectedRatio}
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400, boxShadow: 3, borderRadius: 2, mb: 3,backgroundColor: alpha(theme.palette.background.paper, 0.5) }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total
              </Typography>
              <Chart
                options={totalCasesOptions}
                series={totalCasesSeriesData}
                type="bar"
                height={340}
                width="100%"
                className="custom-legend"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8} mb={1}>
          <Card sx={{ height: 400, boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <AgentPerformanceChart reports={filteredReportsByMonth} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <FullStatementsTable
            paginatedReports={paginatedReports}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            handleSort={handleSort}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            exportCSV={exportCSV}
            confirmDeleteRow={confirmDeleteRow}
            page={page}
            rowsPerPage={rowsPerPage}
            totalReports={filteredReports.length}
            onPageChange={handleChangePage}
          />
        </Grid>
        <Grid item xs={12}>
          <ApplicationSummaryTable
            filteredGroupedApplications={filteredGroupedApplications}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            exportGroupedCSV={exportGroupedCSV}
          />
        </Grid>
      </Grid>
      <DeleteConfirmationDialog
        open={deleteConfirmationOpen}
        onClose={() => setDeleteConfirmationOpen(false)}
        onConfirm={() => {
          if (rowToDelete !== null) {
            removeRow(rowToDelete);
          }
          setDeleteConfirmationOpen(false);
          setRowToDelete(null);
        }}
      />
    </Box>
  );
};

export default Reports;
