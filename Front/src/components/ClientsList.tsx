import * as React from 'react';
import { useState } from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Divider,
    Pagination,
    TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery } from '@tanstack/react-query';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import { getClients } from "../utils/api.ts";

type Report = {
    id: number;
    createdAt: string;
    agentDecision: string;
    marginViolations: string;
    rule80Percent: string;
    note: string;
};

type Account = {
    login: string;
    programName: string;
    status?: string;
    reports: Report[];
};

type Client = {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    country?: string;
    accounts: Account[];
};

export const ClientsList: React.FC = () => {
    const navigate = useNavigate();

    const itemsPerPage = 50;
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Use the unified API function instead of direct fetch
    const { data: clients, isLoading, error } = useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: getClients, // This now uses the session-based API call
        retry: 3,
        retryDelay: 1000,
    });

    if (isLoading) return <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>;
    if (error || !clients) {
        console.error('Error loading clients:', error);
        return <Typography color="error">Error loading clients: {error?.message || 'Unknown error'}</Typography>;
    }

    const filteredClients = clients.filter((client) => {
        const term = searchTerm.toLowerCase();
        // match name or email
        if (client.firstName?.toLowerCase().includes(term) ||
            client.lastName?.toLowerCase().includes(term) ||
            client.email.toLowerCase().includes(term)) {
            return true;
        }
        // match account login
        if ((client.accounts ?? []).some(acct => acct.login.toLowerCase().includes(term))) {
            return true;
        }
        // match report note
        if ((client.accounts ?? []).some(acct =>
            (acct.reports ?? []).some(rep => rep.note?.toLowerCase().includes(term)))) {
            return true;
        }
        return false;
    });
    const pageCount = Math.ceil(filteredClients.length / itemsPerPage);
    const displayedClients = filteredClients.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    return (
        <Box>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by name, email, account, or note"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                sx={{ mb: 2 }}
            />
            {displayedClients.map((client) => {
                const displayName = client.firstName || client.lastName
                    ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim()
                    : client.email;
                const totalAccounts = (client.accounts ?? []).length;
                const reviewedAccounts = (client.accounts ?? [])
                    .filter((acct) => (acct.reports ?? []).length > 0)
                    .length;
                const allReports = (client.accounts ?? []).flatMap(ac => ac.reports ?? []);
                const lastReviewDate = allReports.length
                    ? new Date(Math.max(...allReports.map(r => new Date(r.createdAt).getTime())))
                    : null;
                return (
                    <Accordion key={client.id} sx={{ mb: 2 }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            onClick={() => navigate(`/clients/${client.id}`)}
                            sx={{ cursor: 'pointer' }}
                        >
                            <Grid container alignItems="center" spacing={2}>
                                <Grid item xs={4}>
                                    <Typography variant="h6">{displayName}</Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {client.email}{client.country ? ` • ${client.country}` : ''}
                                    </Typography>
                                </Grid>
                                <Grid item xs={2}>
                                    <Chip
                                        label={`${totalAccounts} account${totalAccounts !== 1 ? 's' : ''}`}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={2}>
                                    {reviewedAccounts > 0 && (
                                        <Chip
                                            label={`${reviewedAccounts} reviewed`}
                                            size="small"
                                            color="success"
                                        />
                                    )}
                                </Grid>
                                <Grid item xs={4}>
                                    {lastReviewDate ? (
                                        <Typography variant="body2" color="textSecondary">
                                            Last review: {lastReviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="textSecondary">
                                            No reviews yet
                                        </Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </AccordionSummary>
                        <AccordionDetails>
                            {(client.accounts ?? []).length === 0 ? (
                                <Typography>No accounts found for this client.</Typography>
                            ) : (
                                (client.accounts ?? []).map((acct) => (
                                    <Box key={acct.login} sx={{ mb: 3 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                mb: 1,
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Typography variant="subtitle1">
                                                {acct.login} — {acct.programName}
                                            </Typography>
                                            {acct.status && (
                                                <Chip label={acct.status} size="small" color="info" />
                                            )}
                                        </Box>
                                        {(acct.reports ?? []).length === 0 ? (
                                            <Typography variant="body2" color="textSecondary">
                                                No reviews yet.
                                            </Typography>
                                        ) : (
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Date</TableCell>
                                                        <TableCell>Decision</TableCell>
                                                        <TableCell>80% Rule</TableCell>
                                                        <TableCell>Margin Violations</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(acct.reports ?? []).map((rep) => (
                                                        <TableRow key={rep.id}>
                                                            <TableCell>
                                                                {new Date(rep.createdAt).toLocaleString(undefined, {
                                                                    hour12: false,
                                                                })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography
                                                                    sx={{
                                                                        color:
                                                                            rep.agentDecision === 'Approved'
                                                                                ? 'green'
                                                                                : rep.agentDecision === 'Rejected'
                                                                                    ? 'red'
                                                                                    : 'inherit',
                                                                    }}
                                                                >
                                                                    {rep.agentDecision}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>{rep.rule80Percent}</TableCell>
                                                            <TableCell sx={{ color: 'red' }}>
                                                                {rep.marginViolations}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                        <Divider sx={{ mt: 2 }} />
                                    </Box>
                                ))
                            )}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
            <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                />
            </Box>
        </Box>
    );
};