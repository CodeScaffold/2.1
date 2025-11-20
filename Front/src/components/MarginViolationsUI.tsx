import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { useMarginAnalysis } from './rules/UseMarginAnalysis';
import { NewsEvent, Trade } from '../utils/types';
import { getTimezoneInfo } from '../utils/timezoneUtils';

interface MarginViolationsUIProps {
    trades: Trade[];
    initialBalance: number;
    newsEvents: NewsEvent[];
    windowMinutes?: number;
    thresholdPercentage?: number;
    accountLeverage?: number;
}

const MarginViolationsUI: React.FC<MarginViolationsUIProps> = ({
                                                                   trades,
                                                                   initialBalance,
                                                                   newsEvents,
                                                                   windowMinutes = 30,
                                                                   thresholdPercentage = 0.5,
                                                                   accountLeverage = 50
                                                               }) => {
    const {
        violations,
        loading,
        error,
        stats,
        calculateMarginForTrade
    } = useMarginAnalysis({
        trades,
        initialBalance,
        newsEvents,
        windowMinutes,
        thresholdPercentage,
        accountLeverage
    });

    const formatDate = (date: Date): string => {
        const tzInfo = getTimezoneInfo(date);
        const timeZone = tzInfo.display === 'GMT+3' ? 'Europe/Moscow' : 'Europe/Istanbul';

        return date.toLocaleString('en-GB', {
            timeZone: timeZone, // Dynamic timezone based on date
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).replace(',', '');
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const calculateMarginDisplay = (trade: Trade): number => {
        // If the hook exposes the calculation function, use it
        if (typeof calculateMarginForTrade === 'function') {
            return calculateMarginForTrade(trade);
        }

        // Otherwise, find the trade in the violations to get the actual margin
        for (const violation of violations) {
            const violationTrade = violation.trades.find(t => t.ticket === trade.ticket);
            if (violationTrade) {
                // Calculate the individual trade's margin from the total
                if (violation.trades.length === 1) {
                    return violation.totalMarginUsed;
                } else {
                    // For multiple trades, we need to estimate based on lot size proportion
                    const totalLots = violation.trades.reduce((sum, t) => sum + t.lotSize, 0);
                    const tradeRatio = trade.lotSize / totalLots;
                    return violation.totalMarginUsed * tradeRatio;
                }
            }
        }

        // Fallback to simplified calculation if not found
        return trade.lotSize * 100;
    };
    const TimezoneTradeCell = ({ trade }: { trade: Trade }) => {
        const tzInfo = getTimezoneInfo(new Date(trade.openTime));
        const isWinter = tzInfo.display === 'GMT+2';

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                    label={isWinter ? 'Winter' : 'Summer'}
                    size="small"
                    sx={{
                        background: isWinter
                            ? 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)' // Yellow gradient for Winter
                            : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)', // Green gradient for Summer
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '24px',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '& .MuiChip-label': {
                            px: 1,
                            textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                        }
                    }}
                />
            </Box>
        );
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '300px',
                    background: 'linear-gradient(135deg, #262618 0%, #72735F 100%)',
                    borderRadius: 3,
                    p: 4,
                    bgcolor: '#0D0D0D'
                }}
            >
                <CircularProgress
                    size={60}
                    sx={{
                        color: '#D2D4D9',
                        filter: 'drop-shadow(0 4px 8px rgba(210, 212, 217, 0.3))'
                    }}
                />
                <Typography
                    sx={{
                        ml: 3,
                        color: '#EBEDF2',
                        fontSize: '1.2rem',
                        fontWeight: 500,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    Analyzing margin usage patterns...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ bgcolor: '#0D0D0D', minHeight: '100vh', p: 2 }}>
                <Alert
                    severity="error"
                    sx={{
                        mt: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #D2D4D9 0%, #EBEDF2 100%)',
                        color: '#0D0D0D',
                        fontWeight: 500,
                        border: '1px solid #D2D4D9',
                        '& .MuiAlert-icon': {
                            color: '#0D0D0D'
                        }
                    }}
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            {/* Stats Cards Grid */}
            {violations.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #0D0D0D 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Initial Balance
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {formatCurrency(initialBalance)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #0D0D0D 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Leverage Pairs Loaded
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {stats.leverageMapSize}
                            </Typography>

                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #0D0D0D 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Risk Threshold
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {formatCurrency(stats.threshold)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                ({(thresholdPercentage * 100).toFixed(0)}% of balance)
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #0D0D0D 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                News Events
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {stats.newsEventsCount}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                ±{windowMinutes} min window
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            )}

            {/* Violations Section */}
            {violations.length === 0 ? (
                <Card sx={{
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #262618 100%, #262618 0%)',
                    mb: 4,
                    boxShadow: '0 8px 32px rgba(114, 115, 95, 0.2)'
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                background: 'rgba(235,237,242,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 3,
                                backdropFilter: 'blur(10px)'
                            }}>
                                <Typography variant="h4" sx={{ color: '#EBEDF2' }}>✓</Typography>
                            </Box>
                            <Box>
                                <Typography variant="h5" sx={{ color: '#EBEDF2', fontWeight: 700 }}>
                                    All Clear! No Margin Violations Detected
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ) : null}

            {/* Margin Violations Cards */}
            {violations.map((violation, index) => (
                <Card
                    key={index}
                    sx={{
                        mb: 4,
                        borderRadius: 4,
                        background: '#0D0D0D',
                        border: '2px solid #D2D4D9',
                        boxShadow: '0 12px 40px rgba(210, 212, 217, 0.15)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Violation Header */}
                    <Box sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #0D0D0D 100%)',
                        p: 3,
                        color: '#0D0D0D'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '50%',
                                    background: '#FFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 3
                                }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                        {index + 1}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 0.5 }}>
                                        Violation #{index + 1}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#FFFFFF', opacity: 0.9 }}>
                                        {formatDate((violation.newsEvent as any).dateTime)}
                                    </Typography>

                                </Box>
                            </Box>
                            <Chip
                                label={`${violation.violationPercentage.toFixed(1)}% of balance`}
                                sx={{
                                    background: 'rgba(13,13,13,0.2)',
                                    color: '#FFF',
                                    fontWeight: 600,
                                    backdropFilter: 'blur(10px)'
                                }}
                            />
                        </Box>
                    </Box>

                    <CardContent sx={{ p: 3 }}>
                        {/* News Event Info */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                <Box sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #0D0D0D 0%, #262618 100%)',
                                    border: '1px solid #D2D4D9'
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#D2D4D9', mb: 2 }}>
                                        📰 News Event Details
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: '#EBEDF2' }}>
                                        {violation.newsEvent.event}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#EBEDF2', mb: 1 }}>
                                        Currency: <strong>{violation.newsEvent.currency}</strong>
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#EBEDF2' }}>
                                        Time: <strong>{formatDate((violation.newsEvent as any).dateTime)}</strong>
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #0D0D0D 0%, #262618 100%)',
                                    border: '1px solid #72735F'
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#72735F', mb: 2 }}>
                                        💰 Margin Impact
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: '#EBEDF2' }}>
                                        Total Margin Used: <span style={{ color: '#D2D4D9' }}>{formatCurrency(violation.totalMarginUsed)}</span>
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#EBEDF2', mb: 1 }}>
                                        Risk Threshold: <strong>{formatCurrency(violation.threshold)}</strong>
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#EBEDF2' }}>
                                        Exposure: <strong>{violation.violationPercentage.toFixed(1)}% of account balance</strong>
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Trades Table */}
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#EBEDF2' }}>
                            🔍 Active Positions During Event
                        </Typography>
                        <TableContainer
                            component={Paper}
                            sx={{
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                                border: '1px solid #EBEDF2'
                            }}
                        >
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ background: 'linear-gradient(135deg, #262618 0%, #72735F 100%)' }}>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Ticket</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Pair</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Lot Size</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Open Price</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Profit</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Timezone</TableCell> {/* ADD THIS LINE */}
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Open Time</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Close Time</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Margin (USD)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {violation.trades.map((trade) => {
                                        const marginUsed = calculateMarginDisplay(trade);
                                        const isProfit = trade.amount > 0;
                                        return (
                                            <TableRow
                                                key={trade.ticket}
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#0D0D0D' },
                                                    '&:hover': { backgroundColor: '#262618' }
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 500, color: '#EBEDF2' }}>{trade.ticket}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: '#72735F' }}>{trade.pair}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 500, color: '#EBEDF2' }}>{trade.lotSize}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 500, color: '#EBEDF2' }}>{trade.openPrice}</TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: isProfit ? '#72735F' : '#D2D4D9'
                                                    }}
                                                >
                                                    {formatCurrency(trade.amount)}
                                                </TableCell>
                                                {/* ADD THIS NEW CELL */}
                                                <TableCell sx={{ py: 1 }}>
                                                    <TimezoneTradeCell trade={trade} />
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', color: '#EBEDF2' }}>{formatDate(trade.openTime)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', color: '#EBEDF2' }}>{formatDate(trade.closeTime)}</TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: '#EBEDF2'
                                                    }}
                                                >
                                                    {formatCurrency(marginUsed)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
};

export default MarginViolationsUI;