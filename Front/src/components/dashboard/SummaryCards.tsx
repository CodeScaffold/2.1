import React, { useState, useEffect } from "react";
import { API_URL } from "../settings.ts";
import { Box, Grid, Card, CardContent, Typography } from "@mui/material";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import axios from "axios";
import { alpha, useTheme } from "@mui/material/styles";

// KpiCards component
const KpiCards: React.FC = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [todayUpgradesCount, setTodayUpgradesCount] = useState<number>(0);
  const [newPayoutRequestsCount, setNewPayoutRequestsCount] =
      useState<number>(0);
  const [fundedAccountsCount, setFundedAccountsCount] = useState<number>(0);

  useEffect(() => {
    // ✅ Fixed: Add proper authentication
    axios
        .get(`${API_URL}/upgrade-pending`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json'
          }
        })
        .then((response) => {
          if (response.data && Array.isArray(response.data)) {
            setPendingCount(response.data.length);
          } else {
            setPendingCount(0);
          }
        })
        .catch((error) => {
          console.error("Error fetching pending accounts from database:", error);
          setPendingCount(0);
        });

    // Fetch today's upgrades from API
    fetch(`${API_URL}/forfxreports`, {
      credentials: 'include',
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        'Content-Type': 'application/json'
      },
    })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((reports: any[]) => {
          // Compare dates in UTC to avoid local timezone shifts
          const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
          // console.log("todayUtc:", todayUtc);
          const count = reports.filter(
              (r) =>
                  // Use the "Decision" field from the API response and compare first 10 chars
                  r.Decision === "Approved" && r.createdAt.slice(0, 10) === todayUtc,
          ).length;
          // console.log("Today's approved count:", count);
          setTodayUpgradesCount(count);

          const monthPrefix = new Date().toISOString().slice(0, 7);
          // Compute current month "Funded Accounts" (Approved Phase2, step2, phase 2)
          const fundedCount = reports.filter((r) => {
            const prog = r.AccountPhase?.toString().toLowerCase() ?? "";
            return (
                r.Decision === "Approved" &&
                r.createdAt.slice(0, 7) === monthPrefix &&
                (prog.includes("phase2") ||
                    prog.includes("phase 2") ||
                    prog.includes("step2"))
            );
          }).length;
          setFundedAccountsCount(fundedCount);
        })
        .catch((_e) => {
          setTodayUpgradesCount(0);
        });

    // ✅ Fixed: Add proper authentication
    axios
        .get(`${API_URL}/payouts`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json'
          }
        })
        .then((response) => {
          if (response.data && Array.isArray(response.data)) {
            const pendingPayouts = response.data.filter(
                (p: any) => p.state === "pending" || p.state === "Pending",
            );
            setNewPayoutRequestsCount(pendingPayouts.length);
          } else {
            setNewPayoutRequestsCount(0);
          }
        })
        .catch((error) => {
          console.error("Error fetching payouts from database:", error);
          setNewPayoutRequestsCount(0);
        });
  }, []);

  const theme = useTheme();

  // KPI cards data using actual state values
  const kpis = [
    {
      label: "Total Pending",
      value: pendingCount,
      icon: <PendingActionsIcon fontSize="large" />,
    },
    {
      label: "Today's Upgrades",
      value: todayUpgradesCount,
      icon: <TrendingUpIcon fontSize="large" />,
    },
    {
      label: "New Payout Requests",
      value: newPayoutRequestsCount,
      icon: <AttachMoneyIcon fontSize="large" />,
    },
    {
      label: "Funded Accounts",
      value: fundedAccountsCount,
      icon: <AccountBalanceIcon fontSize="large" />,
    },
  ];

  return (
      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          {kpis.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.label}>
                <Card
                    sx={{
                      backgroundColor: alpha(theme.palette.background.default, 0.5),
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: 3,
                      mt: 5,
                    }}
                >
                  <CardContent
                      sx={{ display: "flex", alignItems: "center", gap: 2 }}
                  >
                    {item.icon}
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h4" color="white">
                        {item.value}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
          ))}
        </Grid>
      </Box>
  );
};

export default KpiCards;