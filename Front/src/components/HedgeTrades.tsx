import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Skeleton,
    Fade,
} from '@mui/material';
import highImpactNews from '../../../back/src/data/high_impact_news.json';

interface ExtendedTrade {
    ticket: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
    pair?: string;
    lotSize: number;
    positionType: string;
    direction: string;
    ffDate: string;
    ffTime: string;
}

interface NewsEvent {
    date: string;
    time: string;
    currency: string;
    event: string;
    impact: string;
}

interface HedgedGroup {
    trades: ExtendedTrade[];
    totalProfit: number;
}

/** Convert news date/time to Date object using GMT+2 offset */
function parseNewsDateTime(news: NewsEvent): Date {
    const dateTimeString = `${news.date} ${news.time} GMT+0200`;
    return new Date(dateTimeString);
}

/** Determine if two trades overlap in time */
function tradesOverlap(t1: ExtendedTrade, t2: ExtendedTrade): boolean {
    return t1.openTime < t2.closeTime && t1.closeTime > t2.openTime;
}

// Example correlationMap – update as needed
const correlationMap: Record<
    string,
    {
        sameDirection: string[];
        oppositeDirection: string[];
        notSameDirection?: string[];
        notOppositeDirection?: string[];
    }
> = {
    'USD': {
        sameDirection: ['DXY'],
        oppositeDirection: []
    },
    'CAD': {
        sameDirection: [],
        oppositeDirection: ['USDCAD', 'WTIUSD', 'BRNUSD']
    },
    'XAUUSD': {
        sameDirection: ['USDCHF', 'USDJPY'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: ['USDJPY']
    },
    'USDJPY': {
        sameDirection: ['XAUUSD', 'DJIUSD', 'NDXUSD', 'SPXUSD'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: ['XAUUSD', 'DJIUSD', 'NDXUSD', 'SPXUSD']
    },
    'GBPJPY': {
        sameDirection: ['XAUUSD', 'DJIUSD', 'NDXUSD', 'SPXUSD', 'USDJPY'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: []
    },
    'DJIUSD': {
        sameDirection: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGUSD' ,'GBPUSD'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: []
    },
    'NDXUSD': {
        sameDirection: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGUSD','GBPUSD'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: []
    },
    'SPXUSD': {
        sameDirection: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGUSD','GBPUSD'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: []
    },
    'DXY': {
        sameDirection: ['GBPUSD' ,'EURUSD'],
        oppositeDirection: ['XAUUSD', 'DJIUSD', 'NDXUSD', 'SPXUSD'],
        notSameDirection: [],
        notOppositeDirection: []
    },
    'EURUSD': {
        sameDirection: ['XAUUSD', 'DJIUSD', 'NDXUSD', 'SPXUSD'],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: []
    }
};

function isTradeRelatedToNewsDirectional(
    pair: string | undefined,
    newsCurrency: string
): { related: boolean; direction?: 'same' | 'opposite' } {
    if (!pair) return { related: false };

    const upperPair = pair.toUpperCase();
    const upperCurrency = newsCurrency.toUpperCase();
    const correlation = correlationMap[upperCurrency];

    // Direct inclusion check
    if (upperPair.includes(upperCurrency)) {
        return { related: true, direction: 'same' };
    }

    if (correlation) {
        if (correlation.sameDirection.includes(upperPair)) {
            return { related: true, direction: 'same' };
        }
        if (correlation.oppositeDirection.includes(upperPair)) {
            return { related: true, direction: 'opposite' };
        }
    }

    return { related: false };
}

function areTradesHedged(t1: ExtendedTrade, t2: ExtendedTrade): boolean {
    if (!t1.positionType || !t2.positionType) return false;
    if (!tradesOverlap(t1, t2)) {
        return false;
    }
    // Same pair, opposite direction
    if (t1.pair === t2.pair && t1.positionType.toLowerCase() !== t2.positionType.toLowerCase()) {
        return true;
    }

    const t1Pair = t1.pair?.toUpperCase();
    const t2Pair = t2.pair?.toUpperCase();
    if (!t1Pair || !t2Pair) return false;

    const t1Correlation = correlationMap[t1Pair];
    const t2Correlation = correlationMap[t2Pair];

    let hedgedByT1 = false;
    let hedgedByT2 = false;

    if (t1Correlation) {
        // Same-direction check (must share the same position)
        if (t1Correlation.sameDirection.includes(t2Pair)) {
            if (t1.positionType.toLowerCase() === t2.positionType.toLowerCase()) {
                if (!t1Correlation.notSameDirection || !t1Correlation.notSameDirection.includes(t2Pair)) {
                    hedgedByT1 = true;
                }
            }
        }
        // Opposite-direction check (positions must be opposite)
        if (t1Correlation.oppositeDirection.includes(t2Pair)) {
            if (!t1Correlation.notOppositeDirection || !t1Correlation.notOppositeDirection.includes(t2Pair)) {
                if (t1.positionType.toLowerCase() !== t2.positionType.toLowerCase()) {
                    hedgedByT1 = true;
                }
            }
        }
    }

    if (t2Correlation) {
        if (t2Correlation.sameDirection.includes(t1Pair)) {
            if (t1.positionType.toLowerCase() === t2.positionType.toLowerCase()) {
                if (!t2Correlation.notSameDirection || !t2Correlation.notSameDirection.includes(t1Pair)) {
                    hedgedByT2 = true;
                }
            }
        }
        if (t2Correlation.oppositeDirection.includes(t1Pair)) {
            if (!t2Correlation.notOppositeDirection || !t2Correlation.notOppositeDirection.includes(t1Pair)) {
                if (t1.positionType.toLowerCase() !== t2.positionType.toLowerCase()) {
                    hedgedByT2 = true;
                }
            }
        }
    }

    return hedgedByT1 || hedgedByT2;
}

function buildHedgeGraph(trades: ExtendedTrade[]): Map<number, Set<number>> {
    const graph = new Map<number, Set<number>>();
    for (let i = 0; i < trades.length; i++) {
        graph.set(i, new Set<number>());
    }
    for (let i = 0; i < trades.length; i++) {
        for (let j = i + 1; j < trades.length; j++) {
            if (areTradesHedged(trades[i], trades[j])) {
                graph.get(i)?.add(j);
                graph.get(j)?.add(i);
            }
        }
    }
    return graph;
}

function dfs(node: number, graph: Map<number, Set<number>>, visited: Set<number>, component: number[]) {
    visited.add(node);
    component.push(node);
    const neighbors = graph.get(node);
    if (neighbors) {
        neighbors.forEach((neighbor) => {
            if (!visited.has(neighbor)) {
                dfs(neighbor, graph, visited, component);
            }
        });
    }
}

function findConnectedComponents(graph: Map<number, Set<number>>, tradesLength: number): number[][] {
    const visited = new Set<number>();
    const components: number[][] = [];
    for (let i = 0; i < tradesLength; i++) {
        if (!visited.has(i)) {
            const component: number[] = [];
            dfs(i, graph, visited, component);
            if (component.length > 1) {
                components.push(component);
            }
        }
    }
    return components;
}

function formatDate24GMT2(date: Date): string {
    return date.toLocaleString('en-GB', {
        timeZone: 'Europe/Riga',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).replace(',', '');
}

function mergeChains(chains: HedgedGroup[]): HedgedGroup[] {
    let merged = false;
    for (let i = 0; i < chains.length; i++) {
        for (let j = i + 1; j < chains.length; j++) {
            const chainA = chains[i];
            const chainB = chains[j];
            if (chainA.trades.some((t1) => chainB.trades.some((t2) => t1.ticket === t2.ticket))) {
                const mergedTradesMap = new Map<string, ExtendedTrade>();
                [...chainA.trades, ...chainB.trades].forEach((trade) => {
                    mergedTradesMap.set(trade.ticket, trade);
                });
                const mergedTrades = Array.from(mergedTradesMap.values());
                const totalProfit = mergedTrades.reduce((sum, trade) => sum + trade.amount, 0);
                chains[i] = { trades: mergedTrades, totalProfit };
                chains.splice(j, 1);
                merged = true;
                break;
            }
        }
        if (merged) {
            return mergeChains(chains);
        }
    }
    return chains;
}

const HedgeTrades: React.FC<{ trades: ExtendedTrade[] }> = ({ trades }) => {
    const [hedgedResults, setHedgedResults] = useState<{ news: NewsEvent; groups: HedgedGroup[] }[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        setLoading(true);
        if (!trades?.length) {
            setHedgedResults([]);
            setLoading(false);
            return;
        }

        const finalResults: { news: NewsEvent; groups: HedgedGroup[] }[] = [];
        const seenChains = new Set<string>();

        highImpactNews.forEach((newsItem: NewsEvent) => {
            const newsDateTime = parseNewsDateTime(newsItem);
            const startWindow = new Date(newsDateTime.getTime() - 30 * 60000);
            const endWindow = new Date(newsDateTime.getTime() + 30 * 60000);

            const newsTrades = trades.filter((t) => {
                if (!t.pair) return false;
                const withinWindow = t.openTime <= endWindow && t.closeTime >= startWindow;
                const relation = isTradeRelatedToNewsDirectional(t.pair, newsItem.currency);
                return withinWindow && relation.related;
            });

            if (newsTrades.length > 1) {
                const graph = buildHedgeGraph(newsTrades);
                const components = findConnectedComponents(graph, newsTrades.length);
                const uniqueGroups: HedgedGroup[] = [];

                components.forEach((component) => {
                    const chainIdentifier = component
                        .map((idx) => newsTrades[idx].ticket)
                        .sort()
                        .join(',');
                    if (!seenChains.has(chainIdentifier)) {
                        seenChains.add(chainIdentifier);
                        const chainTrades = component.map((idx) => newsTrades[idx]);
                        // Sort trades by openTime
                        chainTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                        const totalProfit = chainTrades.reduce((sum, trade) => sum + trade.amount, 0);
                        uniqueGroups.push({ trades: chainTrades, totalProfit });
                    }
                });

                const mergedGroups = mergeChains(uniqueGroups);
                mergedGroups.forEach((group) => {
                    group.trades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                });

                if (mergedGroups.length > 0) {
                    finalResults.push({ news: newsItem, groups: mergedGroups });
                }
            }
        });

        setHedgedResults(finalResults);
        setLoading(false);
    }, [trades]);

    if (loading) {
        return (
            <Fade in={loading} timeout={500}>
                <Box>
                    <Skeleton variant="rectangular" height={200} animation="wave" sx={{ mb: 2 }} />
                    <Skeleton variant="text" height={40} animation="wave" />
                    <Skeleton variant="text" height={40} animation="wave" />
                </Box>
            </Fade>
        );
    }

    if (hedgedResults.length === 0) {
        return <Typography>No hedged trades found for high-impact news.</Typography>;
    }

    return (
        <Paper sx={{ p: 2, mt: 2, backgroundColor: 'background.paper' }}>
            <Box>
                <Typography variant="h6" color="error">Hedged Trades During High-Impact News</Typography>
                {hedgedResults.map((item, idx) => (
                    <Box key={idx} sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            {item.news.date} {item.news.time} — {item.news.currency} / {item.news.event}
                        </Typography>
                        {item.groups.map((chain, chainIdx) => (
                            <Box key={chainIdx} sx={{ mb: 3 }}>
                                <Typography variant="subtitle2">
                                    Hedged Chain #{chainIdx + 1} - Total Profit: ${chain.totalProfit.toFixed(2)}
                                </Typography>
                                <TableContainer component={Paper} sx={{ mt: 1 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Ticket</TableCell>
                                                <TableCell>Pair</TableCell>
                                                <TableCell>Size</TableCell>
                                                <TableCell>Position</TableCell>
                                                <TableCell>Open Time</TableCell>
                                                <TableCell>Close Time</TableCell>
                                                <TableCell align="right">Profit</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {chain.trades.map((t) => (
                                                <TableRow key={t.ticket}>
                                                    <TableCell>{t.ticket}</TableCell>
                                                    <TableCell>{t.pair}</TableCell>
                                                    <TableCell>{t.lotSize}</TableCell>
                                                    <TableCell>{t.positionType}</TableCell>
                                                    <TableCell>{formatDate24GMT2(t.openTime)}</TableCell>
                                                    <TableCell>{formatDate24GMT2(t.closeTime)}</TableCell>
                                                    <TableCell align="right">{t.amount.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ))}
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default HedgeTrades;
