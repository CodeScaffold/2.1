import React, { useState, useEffect } from "react";
import type { ResultDataType } from "../../utils/types";
import { API_URL } from "../settings.ts";
import { Box, Grid, Card, CardContent, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import axios from "axios";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { alpha, useTheme } from "@mui/material/styles";

interface KpiCardsProps {
  totalCompensation: number;
  currentMonthCompensation: number;
  pendingCompensation: number;
}

// KpiCards component
const KpiCards: React.FC<KpiCardsProps> = ({
}) => {
    const [archivedResults, setArchivedResults] = useState<ResultDataType[]>([]);
    const [pendingResults, setPendingResults] = useState<ResultDataType[]>([]);
    const [loadingArchived, setLoadingArchived] = useState(true);
    const [loadingPending, setLoadingPending] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();

    useEffect(() => {
        // Fetch archived rows
        axios.get(`${API_URL}/result?paginate=false&includeArchived=true`, {
            withCredentials: true,
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
          .then(resp => {
            const data = Array.isArray(resp.data) ? resp.data : resp.data.results;
            setArchivedResults(data);
            setLoadingArchived(false);
          })
          .catch(err => {
            console.error("Error fetching archived results:", err);
            setError("Failed to load archived data");
            setLoadingArchived(false);
          });
        // Fetch pending rows
        axios.get(`${API_URL}/result?paginate=false&includeArchived=false`, {
            withCredentials: true,
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
          .then(resp => {
            const data = Array.isArray(resp.data) ? resp.data : resp.data.results;
            setPendingResults(data);
            setLoadingPending(false);
          })
          .catch(err => {
            console.error("Error fetching pending results:", err);
            setError("Failed to load pending data");
            setLoadingPending(false);
          });
    }, []);

    if (loadingArchived || loadingPending) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    const archivedCompensation = archivedResults
      .reduce((sum, r) => sum + (r.compensate || 0), 0)
      .toFixed(2);
    pendingResults
        .reduce((sum, r) => sum + (r.compensate || 0), 0)
        .toFixed(2);
    const totalCount = archivedResults.length + pendingResults.length;
    const uniqueAccounts = new Set(
      [...archivedResults, ...pendingResults].map(r => r.account).filter(a => a)
    ).size;
    const uniqueClients = new Set(
      [...archivedResults, ...pendingResults].map(r => r.clientId).filter(id => id)
    ).size;


    const kpis = [
        { label: "Compensated", value: archivedCompensation, icon: <AttachMoneyIcon fontSize="large" /> },
        { label: "Total cases",              value: totalCount,          icon: <PendingActionsIcon fontSize="large" /> },
        { label: "Total Accounts",         value: uniqueAccounts,      icon: <AccountBalanceIcon fontSize="large" /> },
        { label: "Total Clients",          value: uniqueClients,       icon: <TrendingUpIcon fontSize="large" /> },
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
