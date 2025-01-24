import { useEffect, useState } from 'react';
import {
    Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography, FormControl, InputLabel,
    Select, MenuItem, OutlinedInput,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import HedgePositionsTable from './components/HedgeTrades.tsx';
import * as React from "react";


interface Trade {
    ticket: string;
    pairs: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
}

interface AnalysisResult {
    violations: { trades: Trade[]; totalProfit: number }[];
    profitTarget: number;
    maxAllowedProfit: number;
    isCompliant: boolean;
    initialBalance: number;
    error?: string;
    thirtySecondTrades?: Trade[];
    statementNumber?: string | number;
    tradeData: Trade[];
}

interface HedgePositionResult {
    samePairPositions: Trade[][];
    differentPairPositions: Trade[][];
}

//Declare theme augmentation
declare module '@mui/material/styles' {
    interface Theme {
        // ...
    }
    interface ThemeOptions {
        // ...
    }
}


const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
}));


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

const getProfitTarget = (accountBalance: number, aggressive): number => {
    if (isNaN(accountBalance) || accountBalance <= 0) {
        console.error("Invalid account balance.");
        return 0;
    }
    return aggressive ? accountBalance * 0.2 : accountBalance * 0.1;
};


const analyzeTradingCompliance = (trades: Trade[], accountBalance: number, aggressive): AnalysisResult => {

    if (!Array.isArray(trades) || trades.length === 0 || isNaN(accountBalance)) {
        console.error("Invalid input for analyzeTradingCompliance");
        return { violations: [], profitTarget: 0, maxAllowedProfit: 0, isCompliant: false };
    }

    const profitTarget = getProfitTarget(accountBalance, aggressive);
    const maxAllowedProfit = profitTarget * PROFIT_LIMIT_PERCENTAGE;
    const violations = [];

    const sortedTrades = trades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
    let currentChain = [];
    let totalProfit = 0;

    for (let i = 0; i < sortedTrades.length; i++) {
        const trade = sortedTrades[i];
        const isOverlapping = currentChain.some((t) => trade.openTime <= t.closeTime);

        if (isOverlapping || currentChain.length === 0) {
            // Add to the chain if overlapping or it's the first trade
            currentChain.push(trade);
            if (trade.amount > 0) {
                totalProfit += trade.amount; // Only add if trade is profitable
            }
        } else {
            // Finalize the current chain if no overlap
            if (totalProfit >= maxAllowedProfit) {
                violations.push({ trades: [...currentChain], totalProfit });
            }
            currentChain = [trade];
            totalProfit = trade.amount > 0 ? trade.amount : 0; // start profit from zero if new trade is a loss
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

const FileUpload: React.FC<{ onFileSelect: (file: File | null) => void }> = ({ onFileSelect }) => (
    <Button
        component="label"
        variant="contained"
        startIcon={<CloudUploadIcon />}
        sx={{ minWidth: 180, height: 55, mt: 1 }}
    >
        Upload Files
        <input
            type="file"
            hidden
            accept=".htm,.html" // Consider adding or verifying other file types
            onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        />
    </Button>
);


const AnalysisOptions: React.FC<{ options: string[]; onOptionChange: (options: string[]) => void }> = ({ options, onOptionChange }) => (

    <FormControl fullWidth sx={{ minWidth: 300, flexGrow: 1, mt: 2 }}>
        <InputLabel id="multiple-options">Select an option</InputLabel>
        <Select
            labelId="multiple-options"
            id="multiple-options"
            multiple
            value={options}
            onChange={(e) => onOptionChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
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
);

const AccountTypeSelect = ({ aggressiveAccount, onAggressiveChange }) => (
    <FormControl sx={{ minWidth: 200, flexGrow: 1, mt: 2 }}>
        <InputLabel htmlFor="aggressive-account">Account Type</InputLabel>
        <Select
            value={aggressiveAccount ? 'true' : 'false'}
            onChange={(e) => onAggressiveChange(e.target.value === 'true')} // Directly set boolean
            input={<OutlinedInput label="Account Type" />}
        >
            <MenuItem value="false">Normal</MenuItem>
            <MenuItem value="true">Aggressive</MenuItem>
        </Select>
    </FormControl>
);

const parseStatement = async (file: File, options: string[], aggressive): Promise<AnalysisResult> => {

    if (!file) {
        console.error("No file uploaded");
        return;
    }
    try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');

        if (!rows || rows.length === 0) {
            console.error("No rows found in the document");
            return;
        }

        const tradeData: Trade[] = [];
        let initialBalance = 0;

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');

            // Parse initial balance
            if (row.textContent.toLowerCase().includes("initial deposit")) {
                const balanceStr = cells[12]?.textContent?.trim().replace(/[^\d.-]/g, '') || '0';
                initialBalance = parseFloat(balanceStr);
            }
            const openTimeStr = cells[0]?.textContent?.trim() || '';
            const ticket = cells[1]?.textContent?.trim() || '';
            const pairs = cells[2]?.textContent?.trim() || ''; // Extract the pairs here
            const closeTimeStr = cells[9]?.textContent?.trim() || '';
            const amountStr = cells[13]?.textContent?.trim().replace(/[\s,]/g, '') || '0';

            const openTime = new Date(openTimeStr);
            const closeTime = new Date(closeTimeStr);
            const amount = parseFloat(amountStr);

            if (!isNaN(amount) && !isNaN(openTime.getTime()) && !isNaN(closeTime.getTime())) {
                tradeData.push({ ticket, openTime, closeTime, amount, pairs }); // Push Trade with pairs
            }
        });

        console.log(`Initial balance before analysis: ${initialBalance}`);

        let analysisResult: AnalysisResult | null = null; // Correctly type analysisResult
        if (options.includes('80% profit target')) {
            analysisResult = analyzeTradingCompliance(tradeData, initialBalance, aggressive);
        }

        const thirtySecondTrades = options.includes('30-second-trades')
            ? tradeData.filter(trade => (trade.closeTime.getTime() - trade.openTime.getTime()) / 1000 < 30 && trade.amount > 0)
            : [];

        return {
            violations: analysisResult?.violations || [],
            profitTarget: analysisResult?.profitTarget || 0,
            maxAllowedProfit: analysisResult?.maxAllowedProfit || 0,
            isCompliant: analysisResult?.isCompliant || false,
            tradeData: tradeData,
            thirtySecondTrades: thirtySecondTrades,
            initialBalance,
        };


    } catch (error) {
        console.error("Error parsing statement:", error);
        return {error: error.message}; // Return an error object
    }
};
interface HedgePositionResult {
    samePairPositions: Trade[][];
    differentPairPositions: Trade[][];
}

// Function to extract base and quote currencies from a pair string
function extractCurrencies(pair: string): { base: string; quote: string } | null {
    const match = pair.match(/^([A-Z]{3})([A-Z]{3})$/); // Assumes pair format like "USDJPY"
    if (match) {
        return { base: match[1], quote: match[2] };
    }
    console.error(`Invalid pair format: ${pair}`);
    return null;
}



function analyzeTrades(tradeData: Trade[]): HedgePositionResult {
    return selectHedgePositions(tradeData);
}


function selectHedgePositions(trades: Trade[]): HedgePositionResult {
    const samePairPositions: Trade[][] = [];
    const differentPairPositions: Trade[][] = [];

    const isSamePairOverlapping = (trade1: Trade, trade2: Trade): boolean => {
        const overlap =
            new Date(trade1.openTime) <= new Date(trade2.closeTime) &&
            new Date(trade2.openTime) <= new Date(trade1.closeTime);

        const oppositeAmounts = (trade1.amount > 0 && trade2.amount < 0) || (trade1.amount < 0 && trade2.amount > 0);


        return overlap && trade1.pairs === trade2.pairs && oppositeAmounts;
    };

    const isDifferentPairHedging = (trade1: Trade, trade2: Trade): boolean => {
        const overlap =
            new Date(trade1.openTime) <= new Date(trade2.closeTime) &&
            new Date(trade2.openTime) <= new Date(trade1.closeTime);

        const currencies1 = extractCurrencies(trade1.pairs);
        const currencies2 = extractCurrencies(trade2.pairs);

        // Check for shared base or quote currency
        const sharedCurrency =
            currencies1 && currencies2 && (
                currencies1.base === currencies2.base ||
                currencies1.quote === currencies2.quote ||
                currencies1.base === currencies2.quote ||
                currencies1.quote === currencies2.base
            );

        //must have oposite amount signs to be a hedge
        const oppositeAmounts = (trade1.amount > 0 && trade2.amount < 0) || (trade1.amount < 0 && trade2.amount > 0);

        return overlap && currencies1 && currencies2 && !isSamePairOverlapping(trade1, trade2) && sharedCurrency && oppositeAmounts;
    };


    // Identify pairs
    const remainingTrades = [...trades];

    while (remainingTrades.length > 1) {
        const trade = remainingTrades.shift()!; // Non-null assertion is safe here since length is checked

        // Find matching trades (same pair first)
        let matchIndex = remainingTrades.findIndex(otherTrade => isSamePairOverlapping(trade, otherTrade));

        if (matchIndex !== -1) {
            samePairPositions.push([trade, remainingTrades.splice(matchIndex, 1)[0]]);
            continue;  //skip the different pair logic and advance the loop
        }


        matchIndex = remainingTrades.findIndex(otherTrade => isDifferentPairHedging(trade, otherTrade));

        if(matchIndex !== -1){
            differentPairPositions.push([trade, remainingTrades.splice(matchIndex, 1)[0]]);
        }


    }


    return { samePairPositions, differentPairPositions };
}


const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#3f51b5', // A slightly different shade
        },
        secondary: {
            main: '#007bff', // A slightly different shade for secondary colors
        },
        background: {
            default: '#212121', // Darker background for better contrast
            paper: '#292929', // Slightly lighter paper color for better contrast
        },
        text: {
            primary: '#eee', // Slightly brighter text color
            secondary: '#ddd', // Slightly darker text color
        },
    },
    typography: {
        // Customize typography as needed, adjust font sizes if necessary.
    },
});


const StyledTable = styled(TableContainer)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper, // Correctly set the background
}));


const TradingAnalysis = ({ result }) => (
    <ThemeProvider theme={darkTheme}>
        <Box sx={{ mt: 4 }}>
            {result.analysisResult && (
                <>
                    <Typography>Statement #: {result.statementNumber}</Typography>
                    <Typography>Profit Target: ${result.analysisResult.profitTarget.toFixed(2)}</Typography>
                    <Typography>Max Allowed Profit (80%): ${result.analysisResult.maxAllowedProfit.toFixed(2)}</Typography>

                    {result.analysisResult.violations.map((Chained, index) => (
                        <Box key={index} sx={{ mt: 3 }}>
                            <Typography variant="subtitle1">
                                Chained Group #{index + 1} - Total Profit: ${Chained.totalProfit.toFixed(2)}
                            </Typography>
                            <StyledTable component={Paper}>
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
                                        {Chained.trades.map((trade) => (
                                            <TableRow key={trade.ticket}>
                                                <TableCell>{trade.ticket}</TableCell>
                                                <TableCell>{trade.openTime.toLocaleString()}</TableCell>
                                                <TableCell>{trade.closeTime.toLocaleString()}</TableCell>
                                                <TableCell align="right">${trade.amount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </StyledTable>
                        </Box>
                    ))}
                </>
            )}

            {result.thirtySecondTrades.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6">Trades Under 30 Seconds</Typography>
                    <TableContainer component={Paper}>
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
                                {result.thirtySecondTrades.map((trade) => (
                                    <TableRow key={trade.ticket}>
                                        <TableCell>{trade.ticket}</TableCell>
                                        <TableCell>{trade.openTime.toLocaleString()}</TableCell>
                                        <TableCell>{trade.closeTime.toLocaleString()}</TableCell>
                                        <TableCell align="right">${trade.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="subtitle1" sx={{ mt: 2 }}>
                        Total Profit: ${
                        result.thirtySecondTrades.reduce((acc, trade) => acc + trade.amount, 0).toFixed(2)
                    }
                    </Typography>
                </Box>
            )}
        </Box>
    </ThemeProvider>
);

const StatementParser = () => {
    const [options, setOptions] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [aggressiveAccount, setAggressiveAccount] = useState(false);  // Initialize as boolean
    const [hedgePositions, setHedgePositions] = useState<HedgePositionResult>({ samePairPositions: [], differentPairPositions: [] });


    useEffect(() => {
        // Reset on file change (This part is okay)
        setAnalysisResult(null);
    }, [file]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => { // Type the event
        const { target: { value } } = event;
        setOptions(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleAggressiveChange = (event: React.ChangeEvent<{ value: unknown }>) => { // Type the event
        setAggressiveAccount(event.target.value === 'true');
    };

    const handleParse = async () => {
        if (!file) { /* ... */ }

        try {
            const result = await parseStatement(file, options, aggressiveAccount);
            if (result.error) { /* ... error handling ... */ }

            const statementNumber = extractStatementNumber(file.name);

            // Now, correctly update the state with the result from parseStatement
            setAnalysisResult({ ...result, statementNumber });

            let calculatedHedgePositions: HedgePositionResult = { samePairPositions: [], differentPairPositions: [] };
            if (options.includes('News hedging')) {
                calculatedHedgePositions = analyzeTrades(result.tradeData); // Access tradeData correctly
            }
            setHedgePositions(calculatedHedgePositions);


        } catch (error) {
            console.error("Error during file parsing:", error);
            // Handle the error appropriately (e.g., display an error message)
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
                            onChange={handleChange}
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
                            value={aggressiveAccount ? 'true' : 'false'} // Convert boolean to string
                            onChange={handleAggressiveChange}
                            input={<OutlinedInput label="Account Type" />}
                        >
                            <MenuItem value="false">Normal</MenuItem>  {/* Use string values */}
                            <MenuItem value="true">Aggressive</MenuItem> {/* Use string values */}
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
                {analysisResult && options.includes('News hedging') && (
                    <HedgePositionsTable hedgePositions={hedgePositions} />
                )}
            </Box>
        </ThemeProvider>
    );
};

export default StatementParser;


function extractStatementNumber(fileName: string): string | number {
    const statementNumMatch = fileName.match(/\d+/);
    return statementNumMatch ? parseInt(statementNumMatch[0], 10) : "Unknown";
}