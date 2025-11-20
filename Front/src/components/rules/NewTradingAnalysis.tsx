import React from "react";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Grid,
    Chip,
} from "@mui/material";
import HedgeTradeUI from "../../components/HedgeTradeUI";
import { AnalysisResult } from "../../utils/types";
import MarginViolationsUI from '../MarginViolationsUI';

interface TradingAnalysisProps {
    result: AnalysisResult;
}

const TradingAnalysis: React.FC<TradingAnalysisProps> = ({ result }) => {
    if (!result) return null;

    const {
        accountLogin,
        initialBalance,
        profitTarget = 0,
        maxAllowedProfit = 0,
        violations = [],
        thirtySecondTrades = [],
        allTrades = [],
        statementType,
        rawNetProfit,
        totalNetProfit,
    } = result;


    // Use totalNetProfit if provided; otherwise rawNetProfit; otherwise sum of allTrades
    const displayNetProfit =
        totalNetProfit !== undefined
            ? totalNetProfit
            : rawNetProfit !== undefined
                ? rawNetProfit
                : allTrades.reduce((acc, trade) => acc + trade.amount, 0);

    // Calculate percentage for max allowed profit
    const maxAllowedProfitPercentage = initialBalance > 0 ? (maxAllowedProfit / initialBalance * 100) : 0;


    const formatDate24GMT3 = (date: Date): string => {
        return date
            .toLocaleString("en-GB", {
                timeZone: "Europe/Istanbul",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            })
            .replace(",", "");
    };

    // Function to determine violation status
    const getViolationStatus = (balanceAfterChain: number, initialBalance: number, maxAllowedProfit: number) => {
        const targetBalance = initialBalance + maxAllowedProfit;
        if (balanceAfterChain > targetBalance) {
            return {
                label: "VIOLATED",
                color: "#FF4444",
                bgColor: "rgba(255, 68, 68, 0.1)",
                borderColor: "#FF4444"
            };
        } else {
            return {
                label: "COMPLIANT",
                color: "#00AA44",
                bgColor: "rgba(0, 170, 68, 0.1)",
                borderColor: "#00AA44"
            };
        }
    };

    return (
        <Box sx={{ mt: 4 }}>
            {/* Account Summary Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                        color: '#0D0D0D',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Statement #
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {accountLogin ?? "Unknown"}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                {statementType || "Unknown"}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                        color: '#0D0D0D',
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
                                ${initialBalance.toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                        color: '#0D0D0D',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Final Balance
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                ${(initialBalance + displayNetProfit).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                P&L: ${displayNetProfit.toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                        color: '#0D0D0D',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Profit Target
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                ${profitTarget.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Target Goal {/* Debug: {profitTarget} */}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                        color: '#0D0D0D',
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                Max Allowed Profit
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                ${maxAllowedProfit.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                ({maxAllowedProfitPercentage.toFixed(1)}% of balance) {/* Debug: {maxAllowedProfit} */}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Chained Groups Section */}
            {violations.length > 0 ? (
                violations.map((chainedGroup, index) => {
                    const violationStatus = getViolationStatus(chainedGroup.closingBalance, initialBalance, maxAllowedProfit);

                    return (
                        <Paper
                            key={index}
                            sx={{
                                p: 2,
                                mt: 3,
                                borderRadius: 3,
                                border: '1px solid #121212',
                                background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
                                        Chained Group #{index + 1} - Total Profit: ${chainedGroup.totalProfit.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500, mt: 1 }}>
                                        Balance After Chain: ${chainedGroup.closingBalance.toFixed(2)}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={violationStatus.label}
                                    sx={{
                                        backgroundColor: violationStatus.bgColor,
                                        color: violationStatus.color,
                                        border: `1px solid ${violationStatus.borderColor}`,
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        px: 1,
                                        '& .MuiChip-label': {
                                            px: 2
                                        }
                                    }}
                                />
                            </Box>
                            <TableContainer sx={{ mt: 2, borderRadius: '8px', border: '2px solid #121212' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ background: 'linear-gradient(135deg, #121212 100%)' }}>
                                            <TableCell sx={{ color: '#FFFFFF', fontWeight: 600 }}>Ticket</TableCell>
                                            <TableCell sx={{ color: '#FFFFFF', fontWeight: 600 }}>Open Time</TableCell>
                                            <TableCell sx={{ color: '#FFFFFF', fontWeight: 600 }}>Close Time</TableCell>
                                            <TableCell align="right" sx={{ color: '#FFFFFF', fontWeight: 600 }}>Profit</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {chainedGroup.trades.map(trade => (
                                            <TableRow
                                                key={trade.ticket}
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#FFFFFF' },
                                                    '&:hover': { backgroundColor: '#F5F5F5' }
                                                }}
                                            >
                                                <TableCell sx={{ color: '#000000' }}>{trade.ticket}</TableCell>
                                                <TableCell sx={{ color: '#000000' }}>{formatDate24GMT3(trade.openTime)}</TableCell>
                                                <TableCell sx={{ color: '#000000' }}>{formatDate24GMT3(trade.closeTime)}</TableCell>
                                                <TableCell align="right" sx={{ color: trade.amount >= 0 ? '#008000' : '#FF0000', fontWeight: 600 }}>
                                                    ${trade.amount.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    );
                })
            ) : (
                <Card sx={{
                    mt: 2,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                    mb: 3,
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 3,
                                backdropFilter: 'blur(10px)'
                            }}>
                                <Typography variant="h4" sx={{ color: '#121212' }}>✓</Typography>
                            </Box>
                            <Box>
                                <Typography variant="h5" sx={{ color: '#121212', fontWeight: 700 }}>
                                    All Clear! No Chain violations found
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Trades Under 30 Seconds Section */}
            {thirtySecondTrades.length > 0 ? (
                <Paper
                    sx={{
                        p: 2,
                        mt: 3,
                        borderRadius: 3,
                        border: '1px solid #121212',
                        background: '#0D0D0D',
                        color: '#EBEDF2',
                    }}
                >
                    <Typography variant="h6" sx={{ color: '#D2D4D9', fontWeight: 600 }}>
                        Scalping Positions - Total Profit: $
                        {thirtySecondTrades
                            .reduce((acc, trade) => acc + trade.amount, 0)
                            .toFixed(2)}
                    </Typography>
                    <TableContainer sx={{ mt: 2, border: '1px solid #D2D4D9',borderRadius: 3 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#0D0D0D' }}>
                                    <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Ticket</TableCell>
                                    <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Open Time</TableCell>
                                    <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Close Time</TableCell>
                                    <TableCell sx={{ color: '#EBEDF2', fontWeight: 600 }}>Duration (s)</TableCell>
                                    <TableCell align="right" sx={{ color: '#EBEDF2', fontWeight: 600 }}>Profit</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {thirtySecondTrades.map((trade) => {
                                    const duration =
                                        (trade.closeTime.getTime() - trade.openTime.getTime()) /
                                        1000;
                                    return (
                                        <TableRow
                                            key={trade.ticket}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#0D0D0D' },
                                                '&:hover': { backgroundColor: '#262618' }
                                            }}
                                        >
                                            <TableCell sx={{ color: '#EBEDF2' }}>{trade.ticket}</TableCell>
                                            <TableCell sx={{ color: '#EBEDF2' }}>{formatDate24GMT3(trade.openTime)}</TableCell>
                                            <TableCell sx={{ color: '#EBEDF2' }}>{formatDate24GMT3(trade.closeTime)}</TableCell>
                                            <TableCell sx={{ color: '#EBEDF2' }}>{duration.toFixed(2)}</TableCell>
                                            <TableCell align="right" sx={{
                                                color: trade.amount >= 0 ? '#72735F' : '#D2D4D9',
                                                fontWeight: 600
                                            }}>
                                                ${trade.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ) : (
                <Card sx={{
                    mt: 2,
                    border: '1px solid #121212',
                    borderRadius: 3,
                    background: '#0D0D0D',
                    mb: 3,
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
                                    All Clear! No Scalping violations found
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}


            {/* NEW: Advanced Hedge Trade Analysis */}
            {allTrades.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <HedgeTradeUI
                        trades={allTrades.map(trade => ({
                            ticket: trade.ticket,
                            openTime: trade.openTime,
                            closeTime: trade.closeTime,
                            amount: trade.amount,
                            pair: trade.pair,
                            positionType: trade.positionType || trade.direction,
                            duration: trade.duration,
                            openPrice: trade.openPrice,
                            lotSize: trade.lotSize,
                            marginUseAmount: 0
                        }))}
                        windowMinutes={30}
                        fetchNews={true}
                    />
                </Box>
            )}

            {/* Margin Usage Section */}
            {allTrades.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <MarginViolationsUI
                        trades={allTrades.map(trade => ({
                            ticket: trade.ticket,
                            openTime: trade.openTime,
                            closeTime: trade.closeTime,
                            amount: trade.amount,
                            pair: trade.pair,
                            positionType: trade.positionType || trade.direction,
                            duration: trade.duration,
                            openPrice: trade.openPrice,
                            lotSize: trade.lotSize,
                            marginUseAmount: 0
                        }))}
                        initialBalance={initialBalance}
                        newsEvents={[]} // You'll need to pass actual news events here
                        windowMinutes={30}
                        thresholdPercentage={0.5}
                        accountLeverage={50}
                    />
                </Box>
            )}
        </Box>
    );
};

export default TradingAnalysis;