import React, {useEffect} from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress,
    Card,
    CardContent,
    Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { API_URL } from './settings';
import { Client } from "../utils/types"

interface ClientDetailProps {
    client?: Client;
    filterLogin?: string;
}

export const ClientDetail: React.FC<ClientDetailProps> = ({ client: clientProp, filterLogin }) => {
    const { id } = useParams<{ id: string }>();
    const query = useQuery<Client, Error>({
        queryKey: ['client', id],
        queryFn: async () => {
            // FIXED: Use session-based API call instead of direct fetch
            const res = await fetch(`${API_URL}/clients/${id}`, {
                mode: 'cors',
                credentials: 'include', // Added for session cookies
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch client');
            const raw = await res.json() as any;

            console.log('Raw response from backend:', raw);

            return {
                ...raw,
                accounts: (raw.accounts ?? []).map((acc: any) => ({
                    ...acc,
                    reports: ([
                        ...(acc.reports ?? []),
                        ...(acc.Reports_Reports_tradingLoginToAccount ?? [])
                    ] as any[]).map((r: any) => ({
                        ...r,
                        agent: r.Agent ?? r.agent,
                        agentDecision: r.Decision ?? r.agentDecision,
                        note: r.Note ?? r.note,
                        marginViolations: r.MarginViolations ?? r.marginViolations,
                        rule80Percent: r.Rule80Percent ?? r.rule80Percent,
                        newsHedgeTrades: r.NewsHedgeTrades ?? r.newsHedgeTrades,
                        thirtySecondTrades: r.ThirtySecondTrades ?? r.thirtySecondTrades,
                        stabilityRule: r.StabilityRule ?? r.stabilityRule,
                    }))
                }))
            } as Client;
        },
        enabled: !clientProp,
    });
    const { data: fetchedClient, isLoading, error } = query;
    const client = clientProp ?? fetchedClient;

    useEffect(() => {
        if (client) {
            // console.log('=== CLIENT DEBUG DATA ===');
            // console.log('Full client object:', JSON.stringify(client, null, 2));
            // console.log('Client ID:', client.id);
            // console.log('Client email:', client.email);
            // console.log('Accounts array:', client.accounts);
            //
            // if (client.accounts) {
            //     client.accounts.forEach((account, index) => {
            //         console.log(`Account ${index}:`, {
            //             tradingLogin: account.tradingLogin,
            //             login: account.login,
            //             programName: account.programName,
            //             clientId: account.clientId,
            //             reports: account.reports ? account.reports.length : 'NO REPORTS ARRAY'
            //         });
            //
            //         if (account.reports) {
            //             console.log(`Account ${index} reports:`, account.reports);
            //         }
            //
            //         // Additional null check logging
            //         if (!account.tradingLogin) {
            //             console.warn(`Account ${index} has no tradingLogin:`, account);
            //         }
            //     });
            // }
            //
            // // Check if filtering is working
            // const accountsToShow = filterLogin
            //     ? (client.accounts ?? []).filter(a => a.tradingLogin === filterLogin)
            //     : (client.accounts ?? []);
            // console.log('Accounts after filtering:', accountsToShow);
            // console.log('FilterLogin value:', filterLogin);
        }
    }, [client, filterLogin]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress sx={{ color: '#121212' }} />
            </Box>
        );
    }
    if (error) {
        return (
            <Typography
                color="error"
                sx={{
                    color: '#d32f2f',
                    p: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 1,
                    border: '1px solid #d32f2f'
                }}
            >
                Error: {error.message}
            </Typography>
        );
    }
    if (!client) {
        return (
            <Typography sx={{
                color: '#121212',
                p: 2,
                textAlign: 'center',
                fontStyle: 'italic'
            }}>
                No client found.
            </Typography>
        );
    }

    // FIXED: Use tradingLogin instead of login for filtering
    const accountsToShow = filterLogin
        ? (client.accounts ?? []).filter(a => a.tradingLogin === filterLogin)
        : (client.accounts ?? []);

    return (
        <Box sx={{ p: 2 }}>
            {/* Client Info Header */}
            <Box sx={{
                mb: 3,
                p: 2,
                backgroundColor: "#9EB5B5",
                borderRadius: 2,
                border: '1px solid rgba(18, 18, 18, 0.2)'
            }}>
                <Typography
                    variant="h5"
                    sx={{
                        color: '#121212',
                        fontWeight: 'bold',
                        mb: 0.5
                    }}
                >
                    {client.firstName || ''} {client.lastName || ''}
                </Typography>
                <Typography
                    variant="subtitle1"
                    sx={{
                        color: '#121212',
                        opacity: 0.8
                    }}
                >
                    {client.email} {client.country ? `• ${client.country}` : ''}
                </Typography>
            </Box>

            {accountsToShow.length === 0 ? (
                <Typography
                    sx={{
                        mt: 2,
                        color: '#121212',
                        textAlign: 'center',
                        fontStyle: 'italic'
                    }}
                >
                    No accounts found for this client.
                </Typography>
            ) : (
                accountsToShow.map((acct) => {
                    const keyValue = acct.tradingLogin || acct.login || `account-${acct.clientId}`;
                    return (
                        <Card
                            key={keyValue as string} // FIXED: Explicitly cast as string
                            variant="outlined"
                            sx={{
                                mb: 3,
                                backgroundColor: '#121212',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 2,
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ p: 0 }}>
                                {/* Account Header */}
                                <Box sx={{
                                    p: 2,
                                    backgroundColor: '#354037',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: '#EBEDF2',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Account: {acct.tradingLogin} — {acct.programName}
                                    </Typography>
                                    {acct.status && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'rgba(235, 237, 242, 0.7)',
                                                mt: 0.5
                                            }}
                                        >
                                            Status: {acct.status}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Reports Table */}
                                {(acct.reports ?? []).length === 0 ? (
                                    <Box sx={{ p: 2, backgroundColor: '#121212' }}>
                                        <Typography sx={{ color: 'rgba(235, 237, 242, 0.7)' }}>
                                            No review history.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Table
                                        size="small"
                                        sx={{
                                            tableLayout: 'fixed',
                                            width: '100%',
                                            backgroundColor: '#121212',
                                            '& .MuiTableCell-root': {
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#EBEDF2',
                                                padding: '8px 12px'
                                            }
                                        }}
                                    >
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: 'rgba(18, 18, 18, 0.8)' }}>
                                                <TableCell sx={{ width: '15%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    Date
                                                </TableCell>
                                                <TableCell sx={{ width: '10%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    Agent
                                                </TableCell>
                                                <TableCell sx={{ width: '15%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    Decision
                                                </TableCell>
                                                <TableCell sx={{ width: '10%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    50% Margin
                                                </TableCell>
                                                <TableCell sx={{ width: '10%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    80% Profit
                                                </TableCell>
                                                <TableCell sx={{ width: '10%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    News Hedge
                                                </TableCell>
                                                <TableCell sx={{ width: '10%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    Scalping
                                                </TableCell>
                                                <TableCell sx={{ width: '10%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    SR
                                                </TableCell>
                                                <TableCell sx={{ width: '20%', fontWeight: 'bold', color: '#EBEDF2' }}>
                                                    Note
                                                </TableCell>

                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(acct.reports ?? []).map((rep) => (
                                                <TableRow
                                                    key={rep.id}
                                                    sx={{
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                                                        }
                                                    }}
                                                >
                                                    <TableCell sx={{ color: '#EBEDF2' }}>
                                                        {new Date(rep.createdAt).toLocaleString(undefined, {
                                                            hour12: false,
                                                            month: 'numeric',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#EBEDF2' }}>
                                                        {rep.agent}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={rep.agentDecision}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor:
                                                                    rep.agentDecision?.toLowerCase() === 'approved'
                                                                        ? '#4caf50'
                                                                        : rep.agentDecision?.toLowerCase() === 'rejected'
                                                                            ? '#f44336'
                                                                            : '#757575',
                                                                color: '#EBEDF2',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        {rep.marginViolations?.toLowerCase() === 'yes' ? (
                                                            <CancelIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
                                                        ) : (
                                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        {rep.rule80Percent?.toLowerCase() === 'yes' ? (
                                                            <CancelIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
                                                        ) : (
                                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        {rep.newsHedgeTrades?.toLowerCase() === 'yes' ? (
                                                            <CancelIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
                                                        ) : (
                                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        {rep.thirtySecondTrades?.toLowerCase() === 'yes' ? (
                                                            <CancelIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
                                                        ) : (
                                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        {rep.stabilityRule?.toLowerCase() === 'compliant' ? (
                                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />
                                                        ) : (
                                                            <CancelIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{
                                                        color: '#EBEDF2',
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {rep.note}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </Box>
    );
};