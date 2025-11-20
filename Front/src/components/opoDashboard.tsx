import { useState, useEffect } from "react";
import {  Box, Divider } from "@mui/material";
import  { AccountDataType } from "./dashboard/AccountCardItem";
import KpiCards from "./dashboard/OpoSummaryCards";
// import { API_URL } from "./settings";
// import axios from "axios";
import type { Payout } from "../utils/types";
import { useQuery } from "@tanstack/react-query";
import ResultTable, { fetchAllResults } from "./ResultTable";
import { getBackendPayouts, getUpgradePendingFromBackend } from "../utils/api";

type ResultType = {
    compensate: number;
    closeTimeDate?: string;
    secondCheck?: boolean;
    firstCheck?: boolean;
};

interface ApiResponse {
  results: ResultType[];
  totalResultsCount: number;
}


const opoDashboard = () => {
    const [, setOpoData] = useState<AccountDataType | null>(null);
    const [, setPayouts] = useState<Payout[]>([]);

    useEffect(() => {
        const fetchPayouts = async () => {
            try {
                const data = await getBackendPayouts();
                setPayouts(data);
            } catch (err) {
                console.error("Failed to load payouts:", err);
            }
        };

        fetchPayouts();
    }, []);

    // Fetch pending account data
    useEffect(() => {
        async function loadPending() {
            try {
                const arr = await getUpgradePendingFromBackend();
                setOpoData(Array.isArray(arr) && arr.length > 0 ? arr[0] : null);
            } catch (e) {
                console.error("Failed to load pending accounts:", e);
            }
        }
        loadPending();
    }, []);

    // Fetch all results for metrics
    const { data: allData, isLoading: loadingResults, error: resultsError } = useQuery<ApiResponse, Error>({
        queryKey: ["allResults"],
        queryFn: fetchAllResults,
    });

    const allResults = allData?.results || [];

    const now = new Date();
    const currentMonthResults = allResults.filter(r => {
        const d = r.closeTimeDate ? new Date(r.closeTimeDate) : null;
        return d &&
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth();
    });

    // Total compensation
    const totalCompensation: number = allResults.reduce(
      (sum: number, r: ResultType) => sum + r.compensate,
      0
    );
    // Current month compensation
    const currentMonthCompensation: number = currentMonthResults.reduce(
      (sum: number, r: ResultType) => sum + r.compensate,
      0
    );
    // Pending compensation (neither check done)
    const pendingCompensation: number = allResults
      .filter((r: ResultType) => !r.secondCheck && !r.firstCheck)
      .reduce((sum: number, r: ResultType) => sum + r.compensate, 0);

    if (loadingResults) return <div>Loading dashboard metrics...</div>;
    if (resultsError) return <div>Error loading metrics</div>;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                flexWrap: "wrap",
                gap: 2,
                width: "100%",
            }}
        >

            <KpiCards
              totalCompensation={totalCompensation}
              currentMonthCompensation={currentMonthCompensation}
              pendingCompensation={pendingCompensation}
            />
            <Divider sx={{ my: 5 }} />
            <ResultTable />
        </Box>
    );
};

export default opoDashboard;
