import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';
import axios from 'axios';
// import contractSizes from '../../../back/src/data/contractSizes.json';
// import leverages from '../../../back/src/data/leverages.json';
import { contractSizes, leverages } from '../../../back/src/data/constants';



interface Trade {
    ticket: string;
    pair?: string;
    lotSize: number;
    openPrice: number;
    openTime: Date;
    amount: number; // Represents profit
}

interface NewsEvent {
    date: string;
    time: string;
    currency: string;
    event: string;
    impact: string;
}

interface MarginViolation {
    newsEvent: NewsEvent;
    trades: Trade[];
    totalMarginUsed: number;
    threshold: number;
}

interface MarginUsageProps {
    violations: MarginViolation[];
}

const MarginUsage: React.FC<MarginUsageProps> = ({ violations = [] }) => {
    const [exchangeRates, setExchangeRates] = useState<{ [pair: string]: number }>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch exchange rates from the JSON file on component mount
    useEffect(() => {
        const fetchExchangeRates = async () => {
            try {
                const response = await axios.get('/exchange_rates.json');
                setExchangeRates(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching exchange rates:', err);
                setError('Failed to load exchange rates.');
                setLoading(false);
            }
        };

        fetchExchangeRates();
    }, []);

    const formatDate = (date: Date): string =>
        date
            .toLocaleString('en-GB', {
                timeZone: 'Europe/Riga',
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
            .replace(',', '');

    /**
     * Calculates the margin for a given trade.
     */
    const calculateMargin = (trade: Trade): number => {
        const pairKey = trade.pair?.toUpperCase() || '';
        const contractSize = contractSizes[pairKey];
        const leverage = leverages[pairKey];

        if (!contractSize || !leverage) {
            console.warn(`Missing contractSize or leverage for pair ${pairKey}. Trade Ticket: ${trade.ticket}`);
            return 0;
        }

        if (pairKey.length !== 6) {
            console.warn(`Invalid pair format for ${pairKey}. Expected a 6-letter currency pair. Trade Ticket: ${trade.ticket}`);
            return 0;
        }

        const baseCurrency = pairKey.slice(0, 3);
        const quoteCurrency = pairKey.slice(3, 6);

        // // Handle USDJPY specifically
        // if (pairKey === 'USDJPY') {
        //     // Formula: (lotSize * openPrice * contractSize) / leverage * exchangeRate
        //     const marginInJPY = (trade.lotSize * trade.openPrice * contractSize) / leverage;
        //     const exchangeRate = exchangeRates['USDJPY'] || 0.00644; // Default to 0.00644 if not found
        //     return marginInJPY * exchangeRate;
        // }

        // Handle XAUUSD normally (leave it unchanged)
        // XAUUSD is already handled in standard calculations
        const baseUSDPair = `${baseCurrency}USD`;
        const quoteUSDPair = `${quoteCurrency}USD`;

        const baseUSD = exchangeRates[baseUSDPair];
        const quoteUSD = exchangeRates[quoteUSDPair];
        // Standard calculation
        const exchangeRate = baseUSD / quoteUSD;

        if (baseCurrency !== 'USD') {
            // Base is USD
            return (contractSize * trade.lotSize * trade.openPrice) / leverage;
        } else if (baseCurrency === 'USD') {
            // Quote is USD
            return  ((contractSize * trade.lotSize * trade.openPrice) / leverage) * exchangeRate;
        } else {


            // will be commented soon bitch
            const baseUSDPair = `${baseCurrency}USD`;
            const quoteUSDPair = `${quoteCurrency}USD`;

            const baseUSD = exchangeRates[baseUSDPair];
            const quoteUSD = exchangeRates[quoteUSDPair];

            if (!baseUSD || !quoteUSD) {
                console.warn(`Missing USD pair rates for ${pairKey}. Trade Ticket: ${trade.ticket}`);
                return 0;
            }

            const exchangeRate = baseUSD / quoteUSD; // e.g., EURGBP = EURUSD / GBPUSD

            return ((contractSize * trade.lotSize * trade.openPrice) / leverage) * exchangeRate;
        }
    };

    /**
     * Processes violations to calculate total margin used.
     */
    const processViolations = useMemo(() => {
        const seenTickets = new Set<string>();

        return violations
            .map((violation) => {
                const { newsEvent, trades} = violation;
                const newsCurrency = newsEvent.currency.toUpperCase();

                // Filter relevant trades
                const relevantTrades = trades.filter(trade => {
                    if (!trade.pair) return false;
                    const pair = trade.pair.toUpperCase();
                    const base = pair.slice(0, 3);
                    const quote = pair.slice(3, 6);
                    return base === newsCurrency || quote === newsCurrency;
                });

                // Calculate total margin
                const totalMarginUsed = relevantTrades.reduce((sum, trade) => sum + calculateMargin(trade), 0);

                // Filter profitable and unique trades
                const profitableTrades = relevantTrades.filter(trade => {
                    if (trade.amount > 0 && !seenTickets.has(trade.ticket)) {
                        seenTickets.add(trade.ticket);
                        return true;
                    }
                    return false;
                });

                return { ...violation, trades: profitableTrades, totalMarginUsed };
            })
            .filter(v => v.trades.length > 0 && v.totalMarginUsed >= v.threshold);
    }, [violations, exchangeRates]);

    if (loading) {
        return (
            <Box>
                <Typography variant="h6" color="textSecondary">
                    Loading exchange rates...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <Typography variant="h6" color="error">
                    {error}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h6" color="error">
                Margin Usage Violations
            </Typography>
            {processViolations.map((violation, idx) => (
                <Box key={idx} sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">
                        {idx + 1}. {violation.newsEvent.event} on {violation.newsEvent.currency} {violation.newsEvent.date} at {violation.newsEvent.time}
                    </Typography>
                    <Typography variant="body2">
                        Margin Used: ${violation.totalMarginUsed.toFixed(2)} (Threshold: ${violation.threshold.toFixed(2)})
                    </Typography>
                    <TableContainer component={Paper} sx={{ mt: 1 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ticket</TableCell>
                                    <TableCell>Pair</TableCell>
                                    <TableCell>Lot Size</TableCell>
                                    <TableCell>Open Price</TableCell>
                                    <TableCell>Profit</TableCell>
                                    <TableCell>Open Time</TableCell>
                                    <TableCell align="right">Margin (USD)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {violation.trades.map(trade => (
                                    <TableRow key={trade.ticket}>
                                        <TableCell>{trade.ticket}</TableCell>
                                        <TableCell>{trade.pair || 'N/A'}</TableCell>
                                        <TableCell>{trade.lotSize}</TableCell>
                                        <TableCell>{trade.openPrice}</TableCell>
                                        <TableCell sx={{ color: 'green' }}>
                                            ${trade.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{formatDate(trade.openTime)}</TableCell>
                                        <TableCell align="right">
                                            ${calculateMargin(trade).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            ))}
            {processViolations.length === 0 && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                    No margin usage violations with profitable and unique trades found.
                </Typography>
            )}
        </Box>
    );
};

export default MarginUsage;
