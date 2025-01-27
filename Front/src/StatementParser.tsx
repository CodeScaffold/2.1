import { useEffect, useState } from 'react';
import {
    Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography, FormControl, InputLabel,
    Select, MenuItem, OutlinedInput,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { createTheme, ThemeProvider } from '@mui/material/styles';
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

interface ExtendedTrade extends Trade {
    direction: string; // e.g. "BUY" or "SELL"
    instrument: string; // e.g. "EURUSD"
    ffDate: string;     // e.g. "Apr 18 2024"
    ffTime: string;     // e.g. "03:30"
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
    allTrades?: ExtendedTrade[];
    thirtySecondTrades?: Trade[];
    newsHedgeTrades?: Trade[];
    statementNumber?: string | number;
}

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

function toForexFactoryDateTime(date: Date): { ffDate: string; ffTime: string } {
    const shortMonth = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return {
        ffDate: `${shortMonth} ${day} ${year}`,
        ffTime: `${hours}:${minutes}`,
    };
}

const getProfitTarget = (accountBalance: number, aggressive: boolean): number => {
    return aggressive ? accountBalance * 0.2 : accountBalance * 0.1;
};

const analyzeTradingCompliance = (
    trades: Trade[],
    accountBalance: number,
    aggressive: boolean
): AnalysisResult => {
    if (!trades.length || isNaN(accountBalance)) {
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

    for (const trade of sortedTrades) {
        const isOverlapping = currentChain.some((t) => trade.openTime <= t.closeTime);

        if (isOverlapping || currentChain.length === 0) {
            currentChain.push(trade);
            if (trade.amount > 0) {
                totalProfit += trade.amount;
            }
        } else {
            if (totalProfit >= maxAllowedProfit) {
                violations.push({ trades: [...currentChain], totalProfit });
            }
            currentChain = [trade];
            totalProfit = trade.amount > 0 ? trade.amount : 0;
        }
    }

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
    const match = fileName.match(/\d+/);
    return match ? parseInt(match[0], 10) : "Unknown";
}

const parseStatement = async (
    file: File,
    options: string[],
    aggressive: boolean
): Promise<AnalysisResult | null> => {
    if (!file) return null;

    try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');

        if (!rows.length) return null;

        const tradeData: Trade[] = [];
        let initialBalance = 0;
        let stopParsing = false;

        for (const row of rows) {
            if (stopParsing) break;

            const cells = row.querySelectorAll('td');

            if (row.textContent?.toLowerCase().includes("initial deposit")) {
                const balanceStr = cells[12]?.textContent?.trim().replace(/[^\d.-]/g, '') || '0';
                initialBalance = parseFloat(balanceStr);
                continue;
            }

            const openTimeStr = cells[0]?.textContent?.trim() || '';
            const ticket = cells[1]?.textContent?.trim() || '';
            const pair = cells[2]?.textContent?.trim() || '';
            const positionType = cells[3]?.textContent?.trim() || '';
            const closeTimeStr = cells[9]?.textContent?.trim() || '';
            const amountStr = cells[13]?.textContent?.trim().replace(/[\s,]/g, '') || '0';

            const isOrdersRow = positionType.toLowerCase().includes("order");
            if (isOrdersRow) {
                stopParsing = true;
                continue;
            }
            if (cells.length < 14) continue;

            const openTime = new Date(`${openTimeStr} GMT+0200`);
            const closeTime = new Date(`${closeTimeStr} GMT+0200`);
            const amount = parseFloat(amountStr);

            if (!isNaN(amount) && !isNaN(openTime.getTime()) && !isNaN(closeTime.getTime())) {
                const duration = (closeTime.getTime() - openTime.getTime()) / 1000;
                tradeData.push({
                    ticket,
                    openTime,
                    closeTime,
                    amount,
                    pair,
                    positionType,
                    duration,
                });
            }
        }

        let analysisResult: AnalysisResult = {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: true,
        };

        if (options.includes('80% profit target')) {
            analysisResult = analyzeTradingCompliance(tradeData, initialBalance, aggressive);
        }

        // if (options.includes('30-second-trades')) {
        //     const thirtySecondTrades = tradeData.filter((t) => {
        //         const seconds = (t.closeTime.getTime() - t.openTime.getTime()) / 1000;
        //         return seconds < 30 && t.amount > 0;
        //     });
        //     analysisResult.thirtySecondTrades = thirtySecondTrades;
        // }

        if (options.includes('30-second-trades')) {
            analysisResult.thirtySecondTrades = tradeData.filter((t) => {
                const seconds = (t.closeTime.getTime() - t.openTime.getTime()) / 1000;
                return seconds < 30 && t.amount > 0;
            });
        }


        const allTrades: ExtendedTrade[] = tradeData.map((t) => {
            const { ffDate, ffTime } = toForexFactoryDateTime(t.openTime);
            return {
                ...t,
                direction: t.positionType.toUpperCase(),
                instrument: t.pair || '',
                ffDate,
                ffTime,
            };
        });

        return {
            ...analysisResult,
            initialBalance,
            allTrades,
            statementNumber: extractStatementNumber(file.name),
        };
    } catch {
        return {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: false,
            error: "Parsing error",
        };
    }
};

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#3f51b5' },
        secondary: { main: '#007bff' },
        background: { default: '#212121', paper: '#292929' },
        text: { primary: '#eee', secondary: '#ddd' },
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
        allTrades = [],
    } = result;

    function formatDate24GMT2(date: Date): string {
        return date.toLocaleString('en-GB', {
            timeZone: 'Europe/Riga',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <Box sx={{ mt: 4 }}>
                {(profitTarget > 0 || maxAllowedProfit > 0) && (
                    <>
                        <Typography>Statement #: {statementNumber ?? 'Unknown'}</Typography>
                        <Typography>Profit Target: ${profitTarget.toFixed(2)}</Typography>
                        <Typography>Max Allowed Profit (80%): ${maxAllowedProfit.toFixed(2)}</Typography>
                    </>
                )}

                {violations.map((chainedGroup, index) => (
                    <Box key={index} sx={{ mt: 3 }}>
                        <Typography variant="subtitle1">
                            Chained Group #{index + 1} - Total Profit: ${chainedGroup.totalProfit.toFixed(2)}
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
                                            <TableCell>{formatDate24GMT2(trade.openTime)}</TableCell>
                                            <TableCell>{formatDate24GMT2(trade.closeTime)}</TableCell>
                                            <TableCell align="right">${trade.amount.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </StyledTable>
                    </Box>
                ))}

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
                                                <TableCell>{formatDate24GMT2(trade.openTime)}</TableCell>
                                                <TableCell>{formatDate24GMT2(trade.closeTime)}</TableCell>
                                                <TableCell>{duration.toFixed(2)}</TableCell>
                                                <TableCell align="right">${trade.amount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="subtitle1" sx={{ mt: 2 }}>
                            Total Profit: ${thirtySecondTrades.reduce((acc, trade) => acc + trade.amount, 0).toFixed(2)}
                        </Typography>
                    </Box>
                )}

                {allTrades.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <HedgeTrades trades={allTrades} />
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
        setAnalysisResult(null);
    }, [file]);

    const handleOptionsChange = (event: any) => {
        const { value } = event.target;
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
            const result = await parseStatement(file, options, aggressiveAccount);
            if (result?.error) {
                console.error("Error parsing the file:", result.error);
                return;
            }
            const statementNumber = extractStatementNumber(file.name);
            if (result) {
                setAnalysisResult({ ...result, statementNumber });
            }
        } catch {
            console.error("Error during file parsing.");
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
