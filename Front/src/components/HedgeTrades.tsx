import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface Trade {
    ticket: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
    pair?: string;
    positionType: string;
}

// A group interface (similar to "ChainViolation")
interface HedgedGroup {
    trades: Trade[];
    totalProfit: number;
}

// Check overlap
function tradesOverlap(t1: Trade, t2: Trade): boolean {
    return t1.openTime < t2.closeTime && t1.closeTime > t2.openTime;
}

function groupHedgedTrades(trades: Trade[]): HedgedGroup[] {
    // Sort by openTime or closeTime, whichever you prefer
    const sorted = [...trades].sort(
        (a, b) => a.openTime.getTime() - b.openTime.getTime()
    );

    const result: HedgedGroup[] = [];
    let currentChain: Trade[] = [];
    let chainTotal = 0;

    for (let i = 0; i < sorted.length; i++) {
        const trade = sorted[i];

        if (currentChain.length === 0) {
            // Start a new chain
            currentChain.push(trade);
            chainTotal = trade.amount;
            continue;
        }

        // Compare with the last trade in the chain
        const lastTrade = currentChain[currentChain.length - 1];
        const overlaps = tradesOverlap(trade, lastTrade);

        if (
            overlaps &&
            trade.pair === lastTrade.pair &&
            trade.positionType !== lastTrade.positionType // Ensure opposite directions
        ) {
            // Part of the current chain
            currentChain.push(trade);
            chainTotal += trade.amount;
        } else {
            // Close off the chain if it has valid hedging trades
            if (currentChain.length > 1) {
                result.push({ trades: [...currentChain], totalProfit: chainTotal });
            }
            // Start a new chain
            currentChain = [trade];
            chainTotal = trade.amount;
        }
    }

    // End of loop; push the final chain if there is one and it’s valid
    if (currentChain.length > 1) {
        result.push({ trades: [...currentChain], totalProfit: chainTotal });
    }

    return result;
}

function HedgeTrades({ trades = [] }: { trades?: Trade[] }) {
    const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

    useEffect(() => {
        const loadAndFilterTrades = async () => {
            if (trades.length === 0) return;


            // const startDate = trades.reduce((min, trade) => trade.openTime < min ? trade.openTime : min, trades[0].openTime);
            // const endDate = trades.reduce((max, trade) => trade.openTime > max ? trade.openTime : max, trades[0].openTime);

            // const importantNews = await fetchImportantNews(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
            // const filtered = filterTradesByNews(trades, importantNews);

            setFilteredTrades(trades); // Use all trades
        };

        loadAndFilterTrades();
    }, [trades]);

    if (!filteredTrades.length) {
        return <Typography>No relevant hedged trades found.</Typography>;
    }

    // Group them
    const groupedHedges = groupHedgedTrades(filteredTrades);

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Hedged Trades (Filtered by High-Impact News)</Typography>

            {groupedHedges.map((chain, idx) => (
                <Box key={idx} sx={{ mt: 3 }}>
                    <Typography variant="subtitle1">
                        Hedged Chain #{idx + 1} - Total Profit: ${chain.totalProfit.toFixed(2)}
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ticket</TableCell>
                                    <TableCell>Pair</TableCell>
                                    <TableCell>Position Type</TableCell>
                                    <TableCell>Open Time</TableCell>
                                    <TableCell>Close Time</TableCell>
                                    <TableCell align="right">Profit</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {chain.trades.map((t) => (
                                    <TableRow key={t.ticket}>
                                        <TableCell>{t.ticket}</TableCell>
                                        <TableCell>{t.pair ?? 'N/A'}</TableCell>
                                        <TableCell>{t.positionType}</TableCell>
                                        <TableCell>{t.openTime.toLocaleString()}</TableCell>
                                        <TableCell>{t.closeTime.toLocaleString()}</TableCell>
                                        <TableCell align="right">
                                            {t.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            ))}
        </Box>
    );
}

export default HedgeTrades;
