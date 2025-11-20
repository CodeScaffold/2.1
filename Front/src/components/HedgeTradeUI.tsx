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
import { useHedgeTradeAnalysis } from './rules/useHedgeTradeAnalysis.tsx';
import { Trade } from '../utils/types';
import {getTimezoneInfo} from '../utils/timezoneUtils';

interface HedgeTradeUIProps {
    trades: Trade[];
    windowMinutes?: number;
    fetchNews?: boolean;
}

const HedgeTradeUI: React.FC<HedgeTradeUIProps> = ({
                                                       trades,
                                                       windowMinutes = 30,
                                                       fetchNews = true
                                                   }) => {
    const {
        hedgeGroups,
        stats,
        loading,
        error
    } = useHedgeTradeAnalysis({
        trades,
        windowMinutes,
        fetchNews
    });

    const formatDate = (date: Date): string => {
        const tzInfo = getTimezoneInfo(date);
        const timeZone = tzInfo.display === 'GMT+3' ? 'Europe/Moscow' : 'Europe/Istanbul';

        return date.toLocaleString('en-GB', {
            timeZone: timeZone, // Use the variable instead of hardcoded value
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
                    // REMOVED: icon property completely
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
                        color: '#72735F',
                        filter: 'drop-shadow(0 4px 8px rgba(114, 115, 95, 0.3))'
                    }}
                />
                <Typography
                    sx={{
                        ml: 3,
                        color: '#fff',
                        fontSize: '1.2rem',
                        fontWeight: 500,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    Analyzing hedge trade patterns...
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
            {hedgeGroups.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                        color: '#EBEDF2',
                        // background: stats.netHedgeProfit >= 0
                        //     ? 'linear-gradient(135deg, #72735F 0%, #262618 100%)'
                        //     : 'linear-gradient(135deg, #D92525 0%, #121212 100%)',
                        // color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Hedge Groups
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {stats.totalHedgeGroups}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                        color: '#EBEDF2',
                        // background: stats.netHedgeProfit >= 0
                        //     ? 'linear-gradient(135deg, #72735F 0%, #262618 100%)'
                        //     : 'linear-gradient(135deg, #D92525 0%, #121212 100%)',
                        // color: stats.netHedgeProfit >= 0 ? '#EBEDF2' : '#FFFFFF',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Hedged Trades
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {stats.totalHedgedTrades}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                        color: '#EBEDF2',
                        // background: stats.netHedgeProfit >= 0
                        //     ? 'linear-gradient(135deg, #72735F 0%, #262618 100%)'
                        //     : 'linear-gradient(135deg, #D92525 0%, #121212 100%)',
                        // color: stats.netHedgeProfit >= 0 ? '#EBEDF2' : '#FFFFFF',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Net Hedge P&L
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {formatCurrency(stats.netHedgeProfit)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                            color: '#EBEDF2',
                        // background: stats.netHedgeProfit >= 0
                        //     ? 'linear-gradient(135deg, #72735F 0%, #262618 100%)'
                        //     : 'linear-gradient(135deg, #D92525 0%, #121212 100%)',
                        // color: stats.netHedgeProfit >= 0 ? '#EBEDF2' : '#FFFFFF',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Hedge Efficiency
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {stats.hedgeEfficiency.toFixed(1)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            )}

            {/* Hedge Groups Section */}
            {hedgeGroups.length === 0 ? (
                <Card sx={{
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                    mb: 4,
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 3,
                                backdropFilter: 'blur(10px)'
                            }}>
                                <Typography variant="h4" sx={{ color: '#EBEDF2' }}>✓</Typography>
                            </Box>
                            <Box>
                                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                                    All Clear! No Hedge Trading Detected
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ) : null}

            {/* Hedge Groups Cards */}
            {hedgeGroups.map((group, index) => (
                <Card
                    key={group.id}
                    sx={{
                        mb: 4,
                        borderRadius: 4,
                        background: '#0D0D0D',
                        border: '2px solid #72735F',
                        overflow: 'hidden'
                    }}
                >
                    {/* Group Header */}
                    <Box sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #72735F 100%)',
                        p: 3,
                        color: '#EBEDF2'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
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
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                        Hedge Group #{index + 1}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        {formatDate(group.startTime)} - {formatDate(group.endTime)}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                    label={formatCurrency(group.netProfit)}
                                    sx={{
                                        background: group.netProfit >= 0
                                            ? 'rgba(114, 115, 95, 0.8)'
                                            : 'rgba(235, 237, 242, 0.8)',
                                        color: group.netProfit >= 0 ? '#EBEDF2' : '#0D0D0D',
                                        fontWeight: 600,
                                        backdropFilter: 'blur(10px)'
                                    }}
                                />
                                {group.newsEvent && (
                                    <Chip
                                        label="News-Based"
                                        sx={{
                                            background: 'rgba(210, 212, 217, 0.8)',
                                            color: '#0D0D0D',
                                            fontWeight: 600,
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <CardContent sx={{ p: 3 }}>
                        {/* News Event Info - Only show if news event exists */}
                        {group.newsEvent && (
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #0D0D0D 0%, #262618 100%)',
                                        border: '1px solid #D2D4D9'
                                    }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#D2D4D9', mb: 2 }}>
                                            📰 Related News Event
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: '#EBEDF2' }}>
                                            {group.newsEvent.event}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#EBEDF2', mb: 1 }}>
                                            <strong>Currency:</strong> {group.newsEvent.currency} | <strong>Impact:</strong> {group.newsEvent.impact}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#EBEDF2' }}>
                                            <strong>Time:</strong> {group.newsEvent.date} {group.newsEvent.time}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #0D0D0D 0%, #262618 100%)',
                                        border: '1px solid #D2D4D9'
                                    }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#D2D4D9', mb: 2 }}>
                                            📊 Strategy Type
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#EBEDF2', mb: 1 }}>
                                            <strong>Execution:</strong> {group.newsEvent ? 'News-Based' : 'Pattern-Based'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#EBEDF2', mb: 1 }}>
                                            <strong>Hedge Type:</strong> {group.pairs.length === 1 ? 'Same Pair' : 'Cross Pair'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#EBEDF2' }}>
                                            <strong>Chain ID:</strong> {group.chainIdentifier.substring(0, 20)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        )}

                        {/* Trades Table */}
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#EBEDF2' }}>
                            🔍 Hedge Trade Details
                        </Typography>
                        <TableContainer
                            component={Paper}
                            sx={{
                                borderRadius: 3,
                                overflow: 'hidden',
                                border: '1px solid #EBEDF2'
                            }}
                        >
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ background: 'linear-gradient(135deg, #262618 0%, #72735F 100%)' }}>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Ticket</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Pair</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Position</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Lot Size</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Open Price</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Profit</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Timezone</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Open Time</TableCell>
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Close Time</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {group.trades.map((trade) => {
                                        const isProfit = trade.amount > 0;
                                        // Safely derive and normalize position
                                        const rawPosition = trade.positionType || (trade as any).direction || '';
                                        const position = rawPosition ? rawPosition.toString().toUpperCase() : 'N/A';

                                        return (
                                            <TableRow
                                                key={trade.ticket}
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#0D0D0D' },
                                                    '&:hover': { backgroundColor: '#262618' }
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 500 }}>{trade.ticket}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: '#72735F' }}>{trade.pair}</TableCell>
                                                <TableCell sx={{
                                                    fontWeight: 600,
                                                    color: position.toLowerCase() === 'buy' ? '#72735F' : '#D2D4D9'
                                                }}>
                                                    {position ? position.toUpperCase() : 'N/A'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 500 }}>{trade.lotSize}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 500 }}>{trade.openPrice}</TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: isProfit ? '#72735F' : '#D2D4D9'
                                                    }}
                                                >
                                                    {formatCurrency(trade.amount)}
                                                </TableCell>
                                                {/* NEW: Timezone Badge Cell */}
                                                <TableCell sx={{ py: 1 }}>
                                                    <TimezoneTradeCell trade={trade} />
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(trade.openTime)}</TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(trade.closeTime)}</TableCell>
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

export default HedgeTradeUI;