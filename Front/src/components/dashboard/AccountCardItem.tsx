import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Stack,
} from "@mui/material";
import LaunchIcon from "@mui/icons-material/Launch";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { AccountType } from "../../utils/types";
import Divider from "@mui/material/Divider";
import { API_URL } from "../settings.ts";
import {alpha, useTheme} from "@mui/material/styles";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
);

export interface AccountDataType {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  balance: number;
  equity: number;
  programName: string;
  state: string;
  login: string;
  version: string;
  email: string;
  programId: string;
  updatedAt: string;
  invoiceId?: string;
  userId: string;
}

interface AccountCardProps {
  accountData: AccountDataType;
  onUpgrade: () => void;
}

const AccountCard: React.FC<AccountCardProps> = ({}) => {
  const [filterType, setFilterType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [pendingAccounts, setPendingAccounts] = useState<any[]>([]);

  // Fetch payouts from API
  const [payouts, setPayouts] = useState<
    Array<{ amount: number; createdAt: string; state: string }>
  >([]);

  useEffect(() => {
    async function loadPayouts() {
      try {
        const resp = await axios.get(`${API_URL}/payouts`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json'
          }
        });
        setPayouts(resp.data);
      } catch (err) {
        console.error("Failed to load payouts:", err);
        setPayouts([]);
      }
    }
    loadPayouts();
  }, []);

  // Fetch pending accounts from API
  useEffect(() => {
    async function loadPending() {
      try {
        const resp = await axios.get(`${API_URL}/upgrade-pending`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json'
          }
        });
        setPendingAccounts(resp.data);
      } catch (err) {
        console.error("Failed to load pending accounts:", err);
        setPendingAccounts([]);
      }
    }
    loadPending();
  }, []);

  // Only approved payouts for charts
  const approvedPayouts = useMemo(
    () => payouts.filter((p) => p.state === "Approved"),
    [payouts],
  );

  // Prepare line chart data: total approved amount per month, sorted chronologically
  const lineLabels = useMemo(() => {
    // Gather unique YYYY-MM strings, sort them
    const uniqueMonths = Array.from(
      new Set(approvedPayouts.map((p) => p.createdAt.slice(0, 7))),
    ).sort();
    // Convert to "Apr 2025" etc.
    return uniqueMonths.map((ym) => {
      const [year, month] = ym.split("-");
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleString("en-US", { month: "short", year: "numeric" });
    });
  }, [approvedPayouts]);

  const lineAmounts = useMemo(() => {
    return lineLabels.map((label) => {
      const [monthName, year] = label.split(" ");
      return approvedPayouts
        .filter((p) => {
          const d = new Date(p.createdAt);
          return (
            d.toLocaleString("en-US", { month: "short" }) === monthName &&
            d.getFullYear().toString() === year
          );
        })
        .reduce((sum, p) => sum + p.amount, 0);
    });
  }, [approvedPayouts, lineLabels]);

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: "Payout Amount",
        data: lineAmounts,
        borderColor: "#5572B2",
        backgroundColor: "transparent",
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // Prepare doughnut chart data: distribution by state
  const doughnutLabels = useMemo(() => {
    return Array.from(new Set(payouts.map((p) => p.state)));
  }, [payouts]);

  const doughnutAmounts = useMemo(() => {
    return doughnutLabels.map(
      (state) => payouts.filter((p) => p.state === state).length,
    );
  }, [payouts, doughnutLabels]);

  const doughnutData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutAmounts,
        backgroundColor: [
          "#5572B2",
          "#34497E",
          "#44506A",
          "#657F94",
          "#1D2129",
        ].slice(0, doughnutLabels.length),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  // Sort pending accounts by oldest updatedAt first
  const sortedByOldest = [...pendingAccounts].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  );

  // Apply search and type filters
  const filteredAccounts = sortedByOldest.filter((acc: any) => {
    const term = searchTerm.toLowerCase();
    const firstName = (acc.firstName || "").toString();
    const lastName = (acc.lastName || "").toString();
    const login = (acc.login || "").toString();
    const matchesSearch =
      firstName.toLowerCase().includes(term) ||
      lastName.toLowerCase().includes(term) ||
      login.toLowerCase().includes(term);
    const normalizedType = filterType.replace(/_/g, " ");
    const programName = (acc.programName || "").toString();
    const matchesType = !filterType || programName.includes(normalizedType);
    return matchesSearch && matchesType;
  });

  // Derive oldest Phase 1 and Phase 2 accounts
  const oldestPhase1Data = sortedByOldest.find((acc) => {
    const name = (acc.programName || "").toString().toLowerCase();
    return name.includes("phase1") || name.includes("step1");
  });
  const oldestPhase2Data = sortedByOldest.find((acc) => {
    const name = (acc.programName || "").toString().toLowerCase();
    return name.includes("phase2") || name.includes("step2");
  });
  // Shape them for the overview card
  const accountPhase1 = oldestPhase1Data
    ? {
        name: `${oldestPhase1Data.firstName} ${oldestPhase1Data.lastName}`,
        accountLogin: oldestPhase1Data.login,
        programName: oldestPhase1Data.programName,
        version: oldestPhase1Data.version,
        balance: oldestPhase1Data.balance,
        updatedAt: oldestPhase1Data.updatedAt,
      }
    : {
        name: "",
        accountLogin: "",
        programName: "",
        version: "",
        balance: 0,
      };
  const accountPhase2 = oldestPhase2Data
    ? {
        name: `${oldestPhase2Data.firstName} ${oldestPhase2Data.lastName}`,
        accountLogin: oldestPhase2Data.login,
        programName: oldestPhase2Data.programName,
        version: oldestPhase2Data.version,
        balance: oldestPhase2Data.balance,
        updatedAt: oldestPhase2Data.updatedAt,
      }
    : {
        name: "",
        accountLogin: "",
        programName: "",
        version: "",
        balance: 0,
      };

    const theme = useTheme();

  return (

    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          flexWrap: "wrap",
          gap: 2,
          width: "100%",
        }}
      >
        {/* Table Card */}
        <Card
          sx={{
            height: "auto",
            width: {
              xs: "100%", // full width on small
              md: "100%", // full width until md breakpoint
            },
            // At very large viewports (>2560px), shrink to allow three-per-row
            "@media (min-width:2560px)": {
              width: "60%", // three cards side by side
            },
            backgroundColor: alpha(theme.palette.background.default, 0.7),
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
          }}
        >
          <CardHeader
            variant="h5"
            sx={{ mb: 2 }}
            title="Upgrade Pending"
            titleTypographyProps={{ variant: "h5", color: "#fff" }}
            subheaderTypographyProps={{ variant: "subtitle2", color: "#ccc" }}
          />
          <Box sx={{ display: "flex", gap: 2, mb: 2, mx: 2, flexWrap: "wrap" }}>
            <TextField
              variant="outlined"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                backgroundColor: alpha(theme.palette.background.default, 0.7),
                borderRadius: 2,
                width: { xs: "100%", sm: "68%" },
                "& .MuiInputBase-input": { color: "#fff" },
                "& .MuiInputBase-input::placeholder": { color: "#ccc" },
              }}
            />
            <TextField
              select
              variant="outlined"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              SelectProps={{
                displayEmpty: true,
              }}
              sx={{
                  backgroundColor: alpha(theme.palette.background.default, 0.7),
                borderRadius: 2,
                width: { xs: "100%", sm: "30%" },
                "& .MuiSelect-select": { color: "#fff" },
              }}
            >
              <MenuItem value="">Account Type</MenuItem>
              {Object.values(AccountType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace("_", " ")}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                backgroundColor: "#494c52",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Typography sx={{ flex: 1, color: "#ccc", fontSize: 14 }}>
                Login
              </Typography>
              <Typography sx={{ flex: 1, color: "#ccc", fontSize: 14 }}>
                Name
              </Typography>
              <Typography sx={{ flex: 1, color: "#ccc", fontSize: 14 }}>
                Program
              </Typography>
              <Typography
                  sx={{ flex: 1, color: "#ccc", fontSize: 14 }}
              >
                Balance
              </Typography>
            </Box>

            {/* Rows */}
            <Stack spacing={1} mt={1}>
              {filteredAccounts.slice(0, 10).map((acc) => {
                // determine route based on phase1, phase 1, step1, phase2, phase 2, step2
                const programLower = (
                  acc.programName?.toString() ?? ""
                ).toLowerCase();
                const isPhase1 =
                  programLower.includes("phase1") ||
                  programLower.includes("phase 1") ||
                  programLower.includes("step1");
                const isPhase2 =
                  programLower.includes("phase2") ||
                  programLower.includes("phase 2") ||
                  programLower.includes("step2");
                const route = isPhase1
                  ? "/statement/phase1"
                  : isPhase2
                    ? "/statement/phase2"
                    : "/statement/phase1";
                return (
                  <Paper
                    key={acc.login}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 2,
                      overflow: "hidden",
                      p: 1.5,
                      backgroundColor: "#2a2a2a",
                      boxShadow: 1,
                      transition: "box-shadow 0.2s ease",
                      "&:hover": {
                        boxShadow: 4, // elevate slightly on hover
                        cursor: "default",
                      },
                      textDecoration: "none",
                    }}
                  >
                    <Typography
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        userSelect: "text",
                        pointerEvents: "auto",
                      }}
                    >
                      {acc.login}
                    </Typography>
                    <Typography sx={{ flex: 1, color: "#fff", fontSize: 14 }}>
                      {`${acc.firstName} ${acc.lastName}`}
                    </Typography>
                    <Typography sx={{ flex: 1, color: "#fff", fontSize: 14 }}>
                      {acc.programName}
                    </Typography>
                    <Typography
                      sx={{
                        flex: 1,

                        color: "#fff",
                        fontSize: 14,
                      }}
                    >
                      {acc.balance != null ? acc.balance.toLocaleString() : "—"}
                    </Typography>
                    {/* Statement Button */}
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
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Card>
        {/* middle Card */}
        <Card
          sx={{
            height: "auto",
            width: {
              xs: "100%", // full width on small
              md: "48%", // full width until md breakpoint
            },
            // At very large viewports (>2560px), shrink to allow three-per-row
            "@media (min-width:2560px)": {
              width: "19%", // three cards side by side
            },
              backgroundColor: alpha(theme.palette.background.default, 0.7),
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
          }}
        >
          <CardHeader
            variant="h5"
            sx={{ mb: 2 }}
            title="Approved Payouts"
            titleTypographyProps={{ variant: "h5", color: "#fff" }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ width: "100%", height: 200, mb: 3, py: 3 }}>
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: { color: "#333" },
                      ticks: { color: "#ccc" },
                    },
                    y: {
                      grid: { color: "#333" },
                      ticks: { color: "#ccc" },
                    },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            </Box>
            <Box sx={{ width: "100%", height: 320, my: 3, pt: 4 }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "60%",
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                      labels: {
                        color: "#ccc",
                        font: { size: 12 },
                        padding: 20,
                      },
                    },
                  },
                  layout: { padding: { top: 20 } },
                }}
              />
            </Box>
          </CardContent>
        </Card>
        {/* Right column: Summary Card */}
        <Card
          sx={{
            height: "auto",
            width: {
              xs: "100%", // full width on small
              md: "50%", // full width until md breakpoint
            },
            // At very large viewports (>2560px), shrink to allow three-per-row
            "@media (min-width:2560px)": {
              width: "19%", // three cards side by side
            },
              backgroundColor: alpha(theme.palette.background.default, 0.7),
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
          }}
        >
          <CardHeader
            title="Account Overview"
            titleTypographyProps={{ variant: "h5", color: "#fff" }}
            sx={{ pb: 0, mb: 1 }}
          />
          <CardHeader
            title={accountPhase1.name}
            titleTypographyProps={{ variant: "h6", color: "#fff" }}
            sx={{ pb: 1, mt: 2 }}
          />
          <CardContent>
            <Typography color="#ccc" gutterBottom>
              Login{" "}
              <strong style={{ color: "#fff" }}>
                {accountPhase1.accountLogin}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Type{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase1.programName}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Version{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase1.version}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Balance{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase1.balance.toLocaleString()}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Pending Time{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase1.updatedAt
                  ? new Date(accountPhase1.updatedAt).toLocaleString()
                  : "—"}
              </strong>
            </Typography>
          </CardContent>
          <Divider sx={{ my: 2 }}></Divider>
          <Box sx={{ p: 2, pt: 0 }}>
            <Button
              component={RouterLink}
              to="/statement/phase1"
              variant="contained"
              fullWidth
              endIcon={<LaunchIcon />}
              sx={{
                backgroundColor: "#3f51b5",
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              Check Account Statement
            </Button>
          </Box>
          <CardHeader
            title={accountPhase2.name}
            titleTypographyProps={{ variant: "h6", color: "#fff" }}
            sx={{ pb: 1, mt: 5 }}
          />
          <CardContent>
            <Typography color="#ccc" gutterBottom>
              Login{" "}
              <strong style={{ color: "#fff" }}>
                {accountPhase2.accountLogin}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Type{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase2.programName}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Version{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase2.version}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Balance{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase2.balance.toLocaleString()}
              </strong>
            </Typography>
            <Typography color="#ccc" gutterBottom>
              Pending Time{" "}
              <strong style={{ color: "#fff", fontSize: 14 }}>
                {accountPhase2.updatedAt
                  ? new Date(accountPhase2.updatedAt).toLocaleString()
                  : "—"}
              </strong>
            </Typography>
          </CardContent>
          <Divider sx={{ my: 2 }}></Divider>
          <Box sx={{ p: 2, pt: 0 }}>
            <Button
              component={RouterLink}
              to="/statement/phase2"
              variant="contained"
              fullWidth
              endIcon={<LaunchIcon />}
              sx={{
                backgroundColor: "#3f51b5",
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              Check Account Statement
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default AccountCard;
