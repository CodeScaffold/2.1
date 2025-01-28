
import contractSizes from '../../../back/src/data/contractSizes.json';
import React from 'react';
import {
    Box, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper
} from '@mui/material';


interface Trade {
    ticket: string;
    pair?: string;
    lotSize: number;
    openPrice: number;
    openTime: Date;
    // Add other relevant fields
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

const MarginUsage: React.FC<MarginUsageProps> = ({ violations }) => {
    const formatDate = (date: Date) => date.toLocaleString('en-GB', {
        timeZone: 'Europe/Riga',
        hour12: false
    }).replace(',', '');



    return (
        <Box>
            <Typography variant="h6" color="error">Margin Usage Violations</Typography>
            {violations.map((violation, idx) => (
                <Box key={idx} sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">
                        {idx + 1}. {violation.newsEvent.event} on {violation.newsEvent.date} at {violation.newsEvent.time}
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
                                    <TableCell>Open Time</TableCell>
                                    <TableCell align="right">Margin</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {violation.trades.map(trade => {
                                    const pairKey = trade.pair?.toUpperCase() || '';
                                    const contractSize = (contractSizes as Record<string, number>)[pairKey] || 0;
                                    const margin = (contractSize * trade.openPrice * trade.lotSize) / 50; // LEVERAGE = 50
                                    return (
                                        <TableRow key={trade.ticket}>
                                            <TableCell>{trade.ticket}</TableCell>
                                            <TableCell>{trade.pair}</TableCell>
                                            <TableCell>{trade.lotSize}</TableCell>
                                            <TableCell>{trade.openPrice}</TableCell>
                                            <TableCell>{formatDate(trade.openTime)}</TableCell>
                                            <TableCell align="right">${margin.toFixed(2)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            ))}
        </Box>
    );
};

export default MarginUsage;