import { useState, useEffect } from "react";
import { Grid, Box, Divider, Typography, CircularProgress } from "@mui/material";
import AccountCard, { AccountDataType } from "./dashboard/AccountCardItem";
import KpiCards from "./dashboard/SummaryCards";
import type { Payout } from "../utils/types";
import { getBackendPayouts, getUpgradePendingFromBackend } from "../utils/api";
import { useOpoAuth } from "../OpoAuth";

const Dashboard = () => {
    const [accountData, setAccountData] = useState<AccountDataType | null>(null);
    const [, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get authentication status
    const { isAuthenticated, isLoading: authLoading } = useOpoAuth();

    useEffect(() => {
        // Don't fetch data until authentication is confirmed
        if (authLoading || !isAuthenticated) {
            return;
        }

        const fetchAllData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('🔍 Dashboard: Starting data fetch...');

                // Fetch both payouts and pending accounts in parallel
                const [payoutsResult, pendingResult] = await Promise.allSettled([
                    getBackendPayouts(),
                    getUpgradePendingFromBackend()
                ]);

                // Handle payouts result
                if (payoutsResult.status === 'fulfilled') {
                    console.log('✅ Dashboard: Payouts loaded successfully');
                    setPayouts(payoutsResult.value);
                } else {
                    console.error('❌ Dashboard: Failed to load payouts:', payoutsResult.reason);
                }

                // Handle pending accounts result
                if (pendingResult.status === 'fulfilled') {
                    console.log('✅ Dashboard: Pending accounts loaded successfully');
                    const arr = pendingResult.value;
                    setAccountData(Array.isArray(arr) && arr.length > 0 ? arr[0] : null);
                } else {
                    console.error('❌ Dashboard: Failed to load pending accounts:', pendingResult.reason);
                }

                console.log('✅ Dashboard: All data fetch completed');
            } catch (err) {
                console.error('❌ Dashboard: General fetch error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [authLoading, isAuthenticated]); // Re-run when auth status changes

    // Show loading while auth is being checked
    if (authLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                <CircularProgress />
                <Typography>Checking authentication...</Typography>
            </Box>
        );
    }

    // Show error if not authenticated (shouldn't happen due to ProtectedRoute, but good fallback)
    if (!isAuthenticated) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Authentication required</Typography>
            </Box>
        );
    }

    // Show loading while data is being fetched
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                <CircularProgress />
                <Typography>Loading dashboard data...</Typography>
            </Box>
        );
    }

    // Show error if data fetch failed
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Error: {error}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'none',
                            border: '1px solid currentColor',
                            color: 'inherit',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        Retry
                    </button>
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, padding: 3 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                }}
            >
                {/* Your header content here if needed */}
            </Box>

            <KpiCards />
            <Divider sx={{ my: 5 }} />

            <Box sx={{ flexGrow: 0, padding: 0 }}>
                <Grid item xs={12} md={6} mb={1}>
                    {accountData ? (
                        <AccountCard
                            accountData={accountData}
                            onUpgrade={() => console.log("Upgrade clicked")}
                        />
                    ) : (
                        <Typography variant="body1" sx={{ p: 2 }}>
                            No pending upgrade accounts found
                        </Typography>
                    )}
                </Grid>
            </Box>
        </Box>
    );
};

export default Dashboard;