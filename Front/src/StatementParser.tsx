import { useEffect, useState } from 'react';
import {
    Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography, FormControl, InputLabel,
    Select, MenuItem, OutlinedInput,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// NEW: Import HedgeTrades
import HedgeTrades from './components/HedgeTrades';

interface Trade {
    ticket: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
    pair?: string;
    positionType: string;
    duration: number;
}

interface ChainViolation {
    trades: Trade[];
    totalProfit: number;
}

interface AnalysisResult {
    violations: ChainViolation[];
    profitTarget: number;
    maxAllowedProfit: number;
    isCompliant: boolean;
    initialBalance?: number;
    error?: string;
    // Additional fields if you want to store sub-results
    thirtySecondTrades?: Trade[];
    newsHedgeTrades?: Trade[];
    statementNumber?: string | number;
}

// Menu props for multi-select
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const functions = [
    '30-second-trades',
    'News hedging',
    '80% profit target',
    '50% Margin Usage in news',
];

const PROFIT_LIMIT_PERCENTAGE = 0.8;

const getProfitTarget = (accountBalance: number, aggressive: boolean): number => {
    if (isNaN(accountBalance) || accountBalance <= 0) {
        console.error("Invalid account balance.");
        return 0;
    }
    // If “aggressive” is true, 20% target; otherwise 10%.
    return aggressive ? accountBalance * 0.2 : accountBalance * 0.1;
};

const analyzeTradingCompliance = (
    trades: Trade[],
    accountBalance: number,
    aggressive: boolean
): AnalysisResult => {
    if (!Array.isArray(trades) || trades.length === 0 || isNaN(accountBalance)) {
        console.error("Invalid input for analyzeTradingCompliance");
        return {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: true,
        };
    }

    const profitTarget = getProfitTarget(accountBalance, aggressive);
    const maxAllowedProfit = profitTarget * PROFIT_LIMIT_PERCENTAGE;
    const violations: ChainViolation[] = [];

    const sortedTrades = trades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
    let currentChain: Trade[] = [];
    let totalProfit = 0;

    for (let i = 0; i < sortedTrades.length; i++) {
        const trade = sortedTrades[i];
        const isOverlapping = currentChain.some((t) => trade.openTime <= t.closeTime);

        if (isOverlapping || currentChain.length === 0) {
            // Add to the chain if overlapping or it’s the first trade
            currentChain.push(trade);
            if (trade.amount > 0) {
                totalProfit += trade.amount; // Only add if trade is profitable
            }
        } else {
            // Finalize the current chain if no overlap
            if (totalProfit >= maxAllowedProfit) {
                violations.push({ trades: [...currentChain], totalProfit });
            }
            // Start a new chain with the current trade
            currentChain = [trade];
            totalProfit = trade.amount > 0 ? trade.amount : 0;
        }
    }

    // Finalize the last chain
    if (currentChain.length && totalProfit >= maxAllowedProfit) {
        violations.push({ trades: [...currentChain], totalProfit });
    }

    return {
        violations,
        profitTarget,
        maxAllowedProfit,
        isCompliant: violations.length === 0,
    };
};

function extractStatementNumber(fileName: string): string | number {
    const statementNumMatch = fileName.match(/\d+/);
    return statementNumMatch ? parseInt(statementNumMatch[0], 10) : "Unknown";
}

// Helper: check if two trades overlap in time
function tradesOverlap(t1: Trade, t2: Trade): boolean {
    // Overlap if one opens before the other closes, and closes after the other opens
    return t1.openTime < t2.closeTime && t1.closeTime > t2.openTime;
}

// Helper: find all trades that are hedged (same pair + overlapping time)
function detectHedgedTrades(tradeData: Trade[]): Trade[] {
    const hedgedSet = new Set<Trade>();

    for (let i = 0; i < tradeData.length; i++) {
        for (let j = i + 1; j < tradeData.length; j++) {
            const t1 = tradeData[i];
            const t2 = tradeData[j];

            // If same pair and they overlap, add both to the set
            if (t1.pair && t1.pair === t2.pair && tradesOverlap(t1, t2)) {
                hedgedSet.add(t1);
                hedgedSet.add(t2);
            }
        }
    }

    return Array.from(hedgedSet);
}

const parseStatement = async (
    file: File,
    options: string[],
    aggressive: boolean
): Promise<AnalysisResult | null> => {
    if (!file) {
        console.error("No file uploaded");
        return null;
    }
    try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');

        if (!rows || rows.length === 0) {
            console.error("No rows found in the document");
            return null;
        }

        const tradeData: Trade[] = [];
        let initialBalance = 0;

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');

            // Parse initial balance
            if (row.textContent?.toLowerCase().includes("initial deposit")) {
                const balanceStr = cells[12]?.textContent?.trim().replace(/[^\d.-]/g, '') || '0';
                initialBalance = parseFloat(balanceStr);
            }

            const openTimeStr = cells[0]?.textContent?.trim() || '';
            const ticket = cells[1]?.textContent?.trim() || '';
            const pair = cells[2]?.textContent?.trim() || '';
            const positionType = cells[3]?.textContent?.trim() || '';
            const closeTimeStr = cells[9]?.textContent?.trim() || '';
            const amountStr = cells[13]?.textContent?.trim().replace(/[\s,]/g, '') || '0';

            const openTime = new Date(openTimeStr);
            const closeTime = new Date(closeTimeStr);
            const amount = parseFloat(amountStr);


            if (!isNaN(amount) && !isNaN(openTime.getTime()) && !isNaN(closeTime.getTime())) {
                const duration = (closeTime.getTime() - openTime.getTime()) / 1000;
                tradeData.push({ ticket, openTime, closeTime, amount, pair, positionType, duration });
            }
        });

        console.log(`Initial balance before analysis: ${initialBalance}`);

        // Only perform the compliance analysis if '80% profit target' is selected
        let analysisResult: AnalysisResult | null = null;
        if (options.includes('80% profit target')) {
            analysisResult = analyzeTradingCompliance(tradeData, initialBalance, aggressive);
        } else {
            // Provide a default structure for consistency
            analysisResult = {
                violations: [],
                profitTarget: 0,
                maxAllowedProfit: 0,
                isCompliant: true,
            };
        }

        // Filter trades for 30-second trades
        const thirtySecondTrades = options.includes('30-second-trades')
            ? tradeData.filter(
                (trade) =>
                    (trade.closeTime.getTime() - trade.openTime.getTime()) / 1000 < 30 &&
                    trade.amount > 0
            )
            : [];

        const newsHedgeTrades = options.includes('News hedging')
            ? detectHedgedTrades(tradeData)
            : [];

        return {
            ...analysisResult,
            initialBalance,
            thirtySecondTrades,
            newsHedgeTrades,
        };
    } catch (error: any) {
        console.error("Error parsing statement:", error);
        return {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: false,
            error: error.message
        };
    }
};

// Dark theme for MUI
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#3f51b5',
        },
        secondary: {
            main: '#007bff',
        },
        background: {
            default: '#212121',
            paper: '#292929',
        },
        text: {
            primary: '#eee',
            secondary: '#ddd',
        },
    },
});

const StyledTable = styled(TableContainer)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
}));

const TradingAnalysis = ({ result }: { result: AnalysisResult }) => {
    if (!result) return null;
    const {
        statementNumber,
        profitTarget = 0,
        maxAllowedProfit = 0,
        violations = [],
        thirtySecondTrades = [],
        newsHedgeTrades = [],
    } = result;

    return (
        <ThemeProvider theme={darkTheme}>
            <Box sx={{ mt: 4 }}>
                {/* Only show these if we had a compliance analysis done */}
                {(profitTarget > 0 || maxAllowedProfit > 0) && (
                    <>
                        <Typography>Statement #: {statementNumber ?? 'Unknown'}</Typography>
                        <Typography>
                            Profit Target: ${profitTarget.toFixed(2)}
                        </Typography>
                        <Typography>
                            Max Allowed Profit (80%): ${maxAllowedProfit.toFixed(2)}
                        </Typography>
                    </>
                )}

                {/* Violations */}
                {violations.map((chainedGroup, index) => (
                    <Box key={index} sx={{ mt: 3 }}>
                        <Typography variant="subtitle1">
                            Chained Group #{index + 1} - Total Profit: $
                            {chainedGroup.totalProfit.toFixed(2)}
                        </Typography>
                        <StyledTable>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ticket</TableCell>
                                        <TableCell>Open Time</TableCell>
                                        <TableCell>Close Time</TableCell>
                                        <TableCell align="right">Profit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {chainedGroup.trades.map((trade) => (
                                        <TableRow key={trade.ticket}>
                                            <TableCell>{trade.ticket}</TableCell>
                                            <TableCell>
                                                {trade.openTime.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {trade.closeTime.toLocaleString()}
                                            </TableCell>
                                            <TableCell align="right">
                                                ${trade.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </StyledTable>
                    </Box>
                ))}

                {/* 30-second Trades */}
                {thirtySecondTrades.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6">Trades Under 30 Seconds</Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ticket</TableCell>
                                        <TableCell>Open Time</TableCell>
                                        <TableCell>Close Time</TableCell>
                                        <TableCell>Duration (s)</TableCell>
                                        <TableCell align="right">Profit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {thirtySecondTrades.map((trade) => {
                                        const duration = (trade.closeTime.getTime() - trade.openTime.getTime()) / 1000;
                                        return (
                                            <TableRow key={trade.ticket}>
                                                <TableCell>{trade.ticket}</TableCell>
                                                <TableCell>{trade.openTime.toLocaleString()}</TableCell>
                                                <TableCell>{trade.closeTime.toLocaleString()}</TableCell>
                                                <TableCell>{duration.toFixed(2)}</TableCell>
                                                <TableCell align="right">${trade.amount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="subtitle1" sx={{ mt: 2 }}>
                            Total Profit: $
                            {thirtySecondTrades
                                .reduce((acc, trade) => acc + trade.amount, 0)
                                .toFixed(2)}
                        </Typography>
                    </Box>
                )}

                {newsHedgeTrades.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <HedgeTrades trades={newsHedgeTrades} />
                    </Box>
                )}
            </Box>
        </ThemeProvider>
    );
};

const StatementParser = () => {
    const [options, setOptions] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [aggressiveAccount, setAggressiveAccount] = useState<boolean>(false);

    useEffect(() => {
        // Reset analysis if user changes file
        setAnalysisResult(null);
    }, [file]);

    const handleOptionsChange = (event: any) => {
        const {
            target: { value },
        } = event;
        setOptions(typeof value === 'string' ? value.split(',') : value);
    };

    const handleAggressiveChange = (event: any) => {
        setAggressiveAccount(event.target.value === 'true');
    };

    const handleParse = async () => {
        if (!file) {
            console.error("Please upload a file first.");
            return;
        }

        try {
            // Clear old results
            setAnalysisResult(null);

            // Parse the statement
            const result = await parseStatement(file, options, aggressiveAccount);
            if (result?.error) {
                console.error("Error parsing the file:", result.error);
                return;
            }

            // Add a statement number for display
            const statementNumber = extractStatementNumber(file.name);
            if (result) {
                setAnalysisResult({ ...result, statementNumber });
            }
        } catch (error) {
            console.error("Error during file parsing:", error);
        }
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <Box sx={{ mt: { xs: 7, sm: 8 }, px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Button
                        component="label"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        sx={{ minWidth: 180, height: 55, mt: 1 }}
                    >
                        Upload files
                        <input
                            type="file"
                            hidden
                            accept=".htm,.html"
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    setFile(e.target.files[0]);
                                }
                            }}
                        />
                    </Button>

                    {/* Multiple Select Options */}
                    <FormControl fullWidth sx={{ minWidth: 300, flexGrow: 1, mt: 2 }}>
                        <InputLabel id="multiple-options">Select an option</InputLabel>
                        <Select
                            labelId="multiple-options"
                            id="multiple-options"
                            multiple
                            value={options}
                            onChange={handleOptionsChange}
                            input={<OutlinedInput label="Options" />}
                            MenuProps={MenuProps}
                        >
                            {functions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Account Type */}
                    <FormControl sx={{ minWidth: 200, flexGrow: 1, mt: 2 }}>
                        <InputLabel htmlFor="aggressive-account">Account Type</InputLabel>
                        <Select
                            value={aggressiveAccount ? 'true' : 'false'}
                            onChange={handleAggressiveChange}
                            input={<OutlinedInput label="Account Type" />}
                        >
                            <MenuItem value="false">Normal</MenuItem>
                            <MenuItem value="true">Aggressive</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="contained"
                        sx={{ height: 55, mt: 1, minWidth: 120 }}
                        onClick={handleParse}
                    >
                        Analyze
                    </Button>
                </Box>

                {analysisResult && <TradingAnalysis result={analysisResult} />}
            </Box>
        </ThemeProvider>
    );
};

export default StatementParser;