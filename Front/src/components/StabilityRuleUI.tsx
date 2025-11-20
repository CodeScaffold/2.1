import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';
import { StabilityRuleResult } from './rules/stabilityRule';

interface StabilityRuleUIProps {
    stabilityResult: StabilityRuleResult;
}

const StabilityRuleUI: React.FC<StabilityRuleUIProps> = ({
    stabilityResult
}) => {
    const formatDate = (date: string): string => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getStatusColor = (isCompliant: boolean) => {
        return isCompliant
            ? 'linear-gradient(135deg, #72735F 0%, #262618 100%)'
            : 'linear-gradient(135deg, #D92525 0%, #8B0000 100%)';
    };

    const getStatusIcon = (isCompliant: boolean) => {
        return isCompliant ? '✓' : '✕';
    };

    const getStatusText = (isCompliant: boolean) => {
        return isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT';
    };

    // Calculate progress for circular indicator
    const progressValue = Math.min((stabilityResult.stabilityRate / stabilityResult.threshold) * 100, 100);
    const isOverThreshold = stabilityResult.stabilityRate > stabilityResult.threshold;

    return (
        <Box sx={{ mt: 0 }}>
            {/* Main Status Card */}
            <Card sx={{
                borderRadius: 4,
                background: getStatusColor(stabilityResult.isCompliant),
                mb: 4,
                border: stabilityResult.isCompliant ? 'none' : '2px solid #D92525'
            }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                <Typography variant="h4" sx={{ color: '#EBEDF2' }}>
                                    {getStatusIcon(stabilityResult.isCompliant)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                                    Stability Rule - {getStatusText(stabilityResult.isCompliant)}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                                    {stabilityResult.stabilityRate.toFixed(2)}% of total profit from single day / threshold {stabilityResult.threshold}%
                                </Typography>
                            </Box>
                        </Box>

                        {/* Circular Progress Indicator */}
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress
                                variant="determinate"
                                value={100}
                                size={60}
                                thickness={4}
                                sx={{
                                    color: 'rgba(255,255,255,0.2)',
                                    position: 'absolute',
                                }}
                            />
                            <CircularProgress
                                variant="determinate"
                                value={progressValue}
                                size={60}
                                thickness={4}
                                sx={{
                                    color: isOverThreshold ? '#FF4444' : '#72735F',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                    '& .MuiCircularProgress-circle': {
                                        strokeLinecap: 'round',
                                    },
                                }}
                            />
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                            }}>
                                <Typography variant="caption" sx={{ fontSize:"0.9rem" ,color: '#fff', fontWeight: 700 }}>
                                    {stabilityResult.stabilityRate.toFixed(1)}%
                                </Typography>

                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Highest Daily Profit
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {formatCurrency(stabilityResult.highestDailyProfit)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                                {formatDate(stabilityResult.highestDailyProfitDate)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Total Net Profit
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {formatCurrency(stabilityResult.totalNetProfit)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #72735F 0%, #262618 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Trading Days
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {stabilityResult.dailyProfits.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: stabilityResult.isCompliant
                            ? 'linear-gradient(135deg, #72735F 0%, #262618 100%)'
                            : 'linear-gradient(135deg, #D92525 0%, #8B0000 100%)',
                        color: '#EBEDF2',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Status
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {getStatusText(stabilityResult.isCompliant)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Violations Section */}
            {/*{stabilityResult.violations.length > 0 && (*/}
            {/*    <Card sx={{*/}
            {/*        borderRadius: 4,*/}
            {/*        background: 'linear-gradient(135deg, #D92525 0%, #8B0000 100%)',*/}
            {/*        mb: 4,*/}
            {/*        border: '2px solid #D92525'*/}
            {/*    }}>*/}
            {/*        <CardContent sx={{ p: 4 }}>*/}
            {/*            <Box sx={{ display: 'flex', alignItems: 'center' }}>*/}
            {/*                <Box sx={{*/}
            {/*                    width: 60,*/}
            {/*                    height: 60,*/}
            {/*                    borderRadius: '50%',*/}
            {/*                    background: 'rgba(255,255,255,0.2)',*/}
            {/*                    display: 'flex',*/}
            {/*                    alignItems: 'center',*/}
            {/*                    justifyContent: 'center',*/}
            {/*                    mr: 3,*/}
            {/*                    backdropFilter: 'blur(10px)'*/}
            {/*                }}>*/}
            {/*                    <Typography variant="h4" sx={{ color: '#FFFFFF' }}>⚠️</Typography>*/}
            {/*                </Box>*/}
            {/*                <Box>*/}
            {/*                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>*/}
            {/*                        Stability Rule Violation*/}
            {/*                    </Typography>*/}
            {/*                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>*/}
            {/*                        {stabilityResult.violations[0]}*/}
            {/*                    </Typography>*/}
            {/*                </Box>*/}
            {/*            </Box>*/}
            {/*        </CardContent>*/}
            {/*    </Card>*/}
            {/*)}*/}

            {/* Daily Profits Table */}
            {stabilityResult.dailyProfits.length > 0 && (
                <Card sx={{
                    mb: 4,
                    borderRadius: 4,
                    background: '#0D0D0D',
                    border: '2px solid #72735F',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        background: 'linear-gradient(135deg, #262618 0%, #72735F 100%)',
                        p: 3,
                        color: '#EBEDF2'
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            📊 Daily Profit Breakdown
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                            Detailed view of profit distribution across trading days
                        </Typography>
                    </Box>

                    <CardContent sx={{ p: 3 }}>
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
                                        <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Date</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Daily Profit</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>% of Total</TableCell>
                                        <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Trades</TableCell>
                                        <TableCell align="center" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stabilityResult.dailyProfits
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map(daily => {
                                            const percentageOfTotal = stabilityResult.totalNetProfit > 0
                                                ? (daily.profit / stabilityResult.totalNetProfit) * 100
                                                : 0;
                                            const isHighestDay = daily.date === stabilityResult.highestDailyProfitDate;
                                            const isProfit = daily.profit > 0;

                                            return (
                                                <TableRow
                                                    key={daily.date}
                                                    sx={{
                                                        '&:nth-of-type(odd)': { backgroundColor: '#0D0D0D' },
                                                        '&:hover': { backgroundColor: '#262618' },
                                                        backgroundColor: isHighestDay ? 'rgba(114, 115, 95, 0.1)' : undefined
                                                    }}
                                                >
                                                    <TableCell sx={{
                                                        fontWeight: isHighestDay ? 700 : 500,
                                                        color: isHighestDay ? '#72735F' : undefined
                                                    }}>
                                                        {formatDate(daily.date)}
                                                        {isHighestDay && <Typography variant="caption" sx={{ ml: 1, color: '#72735F' }}>📈</Typography>}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{
                                                        fontWeight: 600,
                                                        color: isProfit ? '#72735F' : '#D2D4D9'
                                                    }}>
                                                        {formatCurrency(daily.profit)}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                        {percentageOfTotal.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                        {daily.trades.length}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {isHighestDay && (
                                                            <Chip
                                                                label="Highest"
                                                                size="small"
                                                                sx={{
                                                                    background: percentageOfTotal > stabilityResult.threshold
                                                                        ? 'rgba(217, 37, 37, 0.8)'
                                                                        : 'rgba(114, 115, 95, 0.8)',
                                                                    color: '#EBEDF2',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem'
                                                                }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default StabilityRuleUI;