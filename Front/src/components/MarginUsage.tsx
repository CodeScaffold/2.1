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
import { contractSizes, leverages } from '../../../back/src/data/constants';

interface Trade {
    ticket: string;
    pair?: string;
    lotSize: number;
    openPrice: number;
    closeTime: Date;
    openTime: Date;
    amount: number; // Represents profit
    marginUseAmount : number;
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
            return 0;
        }
    };
    /**
     * Processes violations to calculate total margin used per unique ticket.
     */
    const processViolations = useMemo(() => {
        const usedTickets = new Set<string>(); // Initialize a Set to track used tickets

        return violations.reduce<MarginViolation[]>((acc, violation) => {
            const { newsEvent, trades } = violation;
            const newsCurrency = newsEvent.currency.toUpperCase();

            // Filter relevant trades based on the news currency
            const relevantTrades = trades.filter(trade => {
                if (!trade.pair) return false;
                const pair = trade.pair.toUpperCase();
                const base = pair.slice(0, 3);
                const quote = pair.slice(3, 6);
                return base === newsCurrency || quote === newsCurrency;
            });

            // Further filter out trades with tickets that have already been used
            const uniqueTrades = relevantTrades.filter(trade => {
                if (usedTickets.has(trade.ticket)) {
                    return false; // Exclude if ticket is already used
                }
                return true; // Include if ticket is unique
            });

            // Aggregate margin by unique ticket within the current violation
            const marginByTicket: { [ticket: string]: number } = {};

            uniqueTrades.forEach(trade => {
                const margin = calculateMargin(trade);
                if (marginByTicket[trade.ticket]) {
                    marginByTicket[trade.ticket] += margin;
                } else {
                    marginByTicket[trade.ticket] = margin;
                }
            });

            // Convert aggregated margins back to trade objects with unique tickets
            const aggregatedTrades: Trade[] = [];
            uniqueTrades.forEach(trade => {
                if (!aggregatedTrades.find(t => t.ticket === trade.ticket)) {
                    aggregatedTrades.push({
                        ...trade,
                        marginUseAmount: marginByTicket[trade.ticket], // Store total margin used
                    });
                    usedTickets.add(trade.ticket); // Mark ticket as used
                }
            });

            // Calculate total margin used for this violation
            const totalMarginUsed = Object.values(marginByTicket).reduce((sum, margin) => sum + margin, 0);

            // Only include the violation if it meets the threshold and has unique trades
            if (aggregatedTrades.length > 0 && totalMarginUsed >= violation.threshold) {
                acc.push({ ...violation, trades: aggregatedTrades, totalMarginUsed });
            }

            return acc;
        }, []);
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
                                    <TableCell >Profit</TableCell>
                                    <TableCell>Open Time</TableCell>
                                    <TableCell>Close Time</TableCell>
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
                                        <TableCell>{formatDate(trade.closeTime)}</TableCell>

                                        <TableCell sx={{ color: 'red' }} align="right">
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
