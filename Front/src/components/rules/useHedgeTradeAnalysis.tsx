import { useState, useEffect, useMemo } from 'react';
import { Trade } from '../../utils/types';
import { normalizeSymbol, isFuture } from '../../utils/symbols';
import { API_URL } from '../settings';
import { parseNewsDateTimeWithTimezone } from '../../utils/timezoneUtils';

export interface NewsEvent {
    date: string;
    time: string;
    currency: string;
    event: string;
    impact: string;
}

export interface HedgeGroup {
    id: string;
    trades: Trade[];
    totalProfit: number;
    totalLoss: number;
    netProfit: number;
    startTime: Date;
    endTime: Date;
    duration: number; // in minutes
    pairs: string[];
    newsEvent?: NewsEvent;
    newsDateTime?: Date;
    chainIdentifier: string;
}

export interface HedgeStats {
    totalHedgeGroups: number;
    totalHedgedTrades: number;
    totalHedgeProfit: number;
    totalHedgeLoss: number;
    netHedgeProfit: number;
    averageHedgeProfit: number;
    hedgeEfficiency: number; // percentage
    newsBasedHedges: number;
    uniqueNewsEvents: number;
    averageTradesPerGroup: number;
}

interface UseHedgeTradeAnalysisProps {
    trades: Trade[];
    windowMinutes?: number;
    fetchNews?: boolean;
}

// Correlation mapping from your existing component
const correlationMap: Record<
    string,
    {
        sameDirection: string[];
        oppositeDirection: string[];
        notSameDirection?: string[];
        notOppositeDirection?: string[];
    }
> = {
    USD: {
        sameDirection: ["DXY"],
        oppositeDirection: [],
    },
    CAD: {
        sameDirection: [],
        oppositeDirection: ["USDCAD", "WTIUSD", "BRNUSD"],
    },
    XAUUSD: {
        sameDirection: ["USDCHF", "USDJPY"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: ["USDJPY"],
    },
    USDJPY: {
        sameDirection: ["XAUUSD", "DJIUSD", "NDXUSD", "SPXUSD"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: ["XAUUSD", "DJIUSD", "NDXUSD", "SPXUSD"],
    },
    GBPJPY: {
        sameDirection: ["XAUUSD", "DJIUSD", "NDXUSD", "SPXUSD", "USDJPY"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: [],
    },
    DJIUSD: {
        sameDirection: ["BTCUSD", "ETHUSD", "SOLUSD", "DOGUSD", "GBPUSD", "XAUUSD"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: [],
    },
    NDXUSD: {
        sameDirection: ["BTCUSD", "ETHUSD", "SOLUSD", "DOGUSD", "GBPUSD", "XAUUSD"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: [],
    },
    SPXUSD: {
        sameDirection: ["BTCUSD", "ETHUSD", "SOLUSD", "DOGUSD", "GBPUSD", "XAUUSD"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: [],
    },
    DXY: {
        sameDirection: ["GBPUSD", "EURUSD"],
        oppositeDirection: ["XAUUSD", "DJIUSD", "NDXUSD", "SPXUSD", "XAUUSD"],
        notSameDirection: [],
        notOppositeDirection: [],
    },
    EURUSD: {
        sameDirection: ["DJIUSD", "NDXUSD", "SPXUSD"],
        oppositeDirection: [],
        notSameDirection: [],
        notOppositeDirection: [],
    },
};

function parseNewsDateTime(news: NewsEvent, tradeDate?: Date): Date {
    return parseNewsDateTimeWithTimezone(news, tradeDate);
}

function tradesOverlap(t1: Trade, t2: Trade): boolean {
    return new Date(t1.openTime) < new Date(t2.closeTime) && new Date(t1.closeTime) > new Date(t2.openTime);
}

function isTradeRelatedToNewsDirectional(
    pair: string | undefined,
    newsCurrency: string,
): { related: boolean; direction?: "same" | "opposite" } {
    // Add safety checks
    if (!pair || !newsCurrency) {
        return { related: false };
    }

    const sym = normalizeSymbol(pair);
    const cur = newsCurrency.toUpperCase();

    // For known futures, if news currency is USD, always relate
    if (isFuture(pair) && cur === "USD") {
        return { related: true, direction: "same" };
    }

    // If the normalized symbol contains the news currency, relate same direction
    if (sym.includes(cur)) {
        return { related: true, direction: "same" };
    }

    const correlation = correlationMap[cur];
    if (correlation) {
        if (correlation.sameDirection?.includes(sym)) {
            return { related: true, direction: "same" };
        }
        if (correlation.oppositeDirection?.includes(sym)) {
            return { related: true, direction: "opposite" };
        }
    }
    return { related: false };
}

function areTradesHedged(t1: Trade, t2: Trade): boolean {
    // Add safety checks for position types
    const pos1 = (t1 as any).positionType || (t1 as any).direction;
    const pos2 = (t2 as any).positionType || (t2 as any).direction;

    // Ensure positions exist and are strings
    if (!pos1 || !pos2 || typeof pos1 !== 'string' || typeof pos2 !== 'string') {
        return false;
    }

    if (!tradesOverlap(t1, t2)) {
        return false;
    }

    // Same pair, opposite direction
    if (t1.pair === t2.pair && pos1.toLowerCase() !== pos2.toLowerCase()) {
        return true;
    }

    // Add safety checks for pairs
    if (!t1.pair || !t2.pair) {
        return false;
    }

    const t1Pair = t1.pair.toUpperCase();
    const t2Pair = t2.pair.toUpperCase();

    const t1Correlation = correlationMap[t1Pair];
    const t2Correlation = correlationMap[t2Pair];

    let hedgedByT1 = false;
    let hedgedByT2 = false;

    if (t1Correlation) {
        // Same-direction check (must share the same position)
        if (t1Correlation.sameDirection?.includes(t2Pair)) {
            if (pos1.toLowerCase() === pos2.toLowerCase()) {
                if (
                    !t1Correlation.notSameDirection ||
                    !t1Correlation.notSameDirection.includes(t2Pair)
                ) {
                    hedgedByT1 = true;
                }
            }
        }
        // Opposite direction check (positions must be opposite)
        if (t1Correlation.oppositeDirection?.includes(t2Pair)) {
            if (
                !t1Correlation.notOppositeDirection ||
                !t1Correlation.notOppositeDirection.includes(t2Pair)
            ) {
                if (pos1.toLowerCase() !== pos2.toLowerCase()) {
                    hedgedByT1 = true;
                }
            }
        }
    }

    if (t2Correlation) {
        if (t2Correlation.sameDirection?.includes(t1Pair)) {
            if (pos1.toLowerCase() === pos2.toLowerCase()) {
                if (
                    !t2Correlation.notSameDirection ||
                    !t2Correlation.notSameDirection.includes(t1Pair)
                ) {
                    hedgedByT2 = true;
                }
            }
        }
        if (t2Correlation.oppositeDirection?.includes(t1Pair)) {
            if (
                !t2Correlation.notOppositeDirection ||
                !t2Correlation.notOppositeDirection.includes(t1Pair)
            ) {
                if (pos1.toLowerCase() !== pos2.toLowerCase()) {
                    hedgedByT2 = true;
                }
            }
        }
    }

    return hedgedByT1 || hedgedByT2;
}

function buildHedgeGraph(trades: Trade[]): Map<number, Set<number>> {
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

function dfs(
    node: number,
    graph: Map<number, Set<number>>,
    visited: Set<number>,
    component: number[],
) {
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

function findConnectedComponents(
    graph: Map<number, Set<number>>,
    tradesLength: number,
): number[][] {
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

function mergeChains(chains: HedgeGroup[]): HedgeGroup[] {
    let merged = false;
    for (let i = 0; i < chains.length; i++) {
        for (let j = i + 1; j < chains.length; j++) {
            const chainA = chains[i];
            const chainB = chains[j];
            if (
                chainA.trades.some((t1) =>
                    chainB.trades.some((t2) => t1.ticket === t2.ticket),
                )
            ) {
                const mergedTradesMap = new Map<string, Trade>();
                [...chainA.trades, ...chainB.trades].forEach((trade) => {
                    mergedTradesMap.set(trade.ticket, trade);
                });
                const mergedTrades = Array.from(mergedTradesMap.values());
                const totalProfit = mergedTrades.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
                const totalLoss = Math.abs(mergedTrades.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
                const netProfit = mergedTrades.reduce((sum, t) => sum + t.amount, 0);

                const sortedTrades = mergedTrades.sort((a, b) =>
                    new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
                );
                const startTime = new Date(sortedTrades[0].openTime);
                const endTime = new Date(sortedTrades[sortedTrades.length - 1].closeTime);
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                const pairs = [...new Set(mergedTrades.map(t => t.pair).filter((pair): pair is string => pair !== undefined))];
                const chainIdentifier = mergedTrades.map(t => t.ticket).sort().join(",");

                chains[i] = {
                    id: chainA.id,
                    trades: sortedTrades,
                    totalProfit,
                    totalLoss,
                    netProfit,
                    startTime,
                    endTime,
                    duration,
                    pairs,
                    newsEvent: chainA.newsEvent,
                    newsDateTime: chainA.newsDateTime,
                    chainIdentifier
                };
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

export const useHedgeTradeAnalysis = ({
                                          trades,
                                          windowMinutes = 30,
                                          fetchNews = true
                                      }: UseHedgeTradeAnalysisProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);

    // Fetch news events
    useEffect(() => {
        if (!fetchNews || !trades?.length) {
            setNewsEvents([]);
            return;
        }

        setLoading(true);
        fetch(`${API_URL}/news`, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log('✅ News fetched for hedge analysis:', data);

                // Handle the nested array structure from your database
                let newsData: NewsEvent[] = [];

                if (Array.isArray(data)) {
                    // If it's a flat array
                    if (data.length > 0 && data[0].date) {
                        newsData = data;
                    }
                    // If it's a nested array [[{...}, {...}]]
                    else if (data.length > 0 && Array.isArray(data[0])) {
                        newsData = data[0];
                    }
                    // If it's multiple nested arrays [[[{...}]], [[{...}]]]
                    else if (data.length > 0 && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
                        newsData = data[0][0];
                    }
                } else {
                    console.warn('⚠️ Unexpected news data structure:', data);
                    newsData = [];
                }

                console.log(`📰 Processed ${newsData.length} news events`);
                setNewsEvents(newsData);
                setError(null);
            })
            .catch((err) => {
                console.error("❌ Error fetching news:", err);
                setError("Failed to fetch news events");
                setNewsEvents([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [trades, fetchNews]);

    const hedgeAnalysis = useMemo(() => {
        if (!trades || trades.length === 0) {
            return {
                hedgeGroups: [],
                stats: {
                    totalHedgeGroups: 0,
                    totalHedgedTrades: 0,
                    totalHedgeProfit: 0,
                    totalHedgeLoss: 0,
                    netHedgeProfit: 0,
                    averageHedgeProfit: 0,
                    hedgeEfficiency: 0,
                    newsBasedHedges: 0,
                    uniqueNewsEvents: 0,
                    averageTradesPerGroup: 0
                }
            };
        }

        try {
            const hedgeGroups: HedgeGroup[] = [];
            const seenChains = new Set<string>();

            if (fetchNews && newsEvents.length > 0) {
                // News-based hedge detection
                newsEvents.forEach((newsItem: NewsEvent) => {
                    // Add safety check for newsItem properties
                    if (!newsItem || !newsItem.date || !newsItem.time || !newsItem.currency) {
                        console.warn('⚠️ Incomplete news item:', newsItem);
                        return;
                    }

                    try {
                        const newsDateTime = parseNewsDateTime(newsItem, new Date(trades[0]?.openTime));
                        const startWindow = new Date(newsDateTime.getTime() - windowMinutes * 60000);
                        const endWindow = new Date(newsDateTime.getTime() + windowMinutes * 60000);

                        console.log(`📰 Processing news: ${newsItem.event} (${newsItem.currency}) at ${newsDateTime}`);

                        const newsTrades = trades.filter((t) => {
                            if (!t.pair) return false;
                            const withinWindow =
                                new Date(t.openTime) <= endWindow && new Date(t.closeTime) >= startWindow;
                            const relation = isTradeRelatedToNewsDirectional(t.pair, newsItem.currency);

                            if (withinWindow && relation.related) {
                                console.log(`🔍 Found related trade: ${t.pair} (${t.ticket}) for ${newsItem.currency} news`);
                            }

                            return withinWindow && relation.related;
                        });

                        console.log(`📊 Found ${newsTrades.length} related trades for ${newsItem.currency} news`);

                        if (newsTrades.length > 1) {
                            const graph = buildHedgeGraph(newsTrades);
                            const components = findConnectedComponents(graph, newsTrades.length);

                            console.log(`🔗 Found ${components.length} hedge components for ${newsItem.currency} news`);

                            components.forEach((component) => {
                                const chainIdentifier = component
                                    .map((idx) => newsTrades[idx].ticket)
                                    .sort()
                                    .join(",");

                                if (!seenChains.has(chainIdentifier)) {
                                    seenChains.add(chainIdentifier);
                                    const chainTrades = component.map((idx) => newsTrades[idx]);

                                    // Sort trades by openTime
                                    chainTrades.sort((a, b) =>
                                        new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
                                    );

                                    const totalProfit = chainTrades.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
                                    const totalLoss = Math.abs(chainTrades.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
                                    const netProfit = chainTrades.reduce((sum, t) => sum + t.amount, 0);

                                    const startTime = new Date(chainTrades[0].openTime);
                                    const endTime = new Date(chainTrades[chainTrades.length - 1].closeTime);
                                    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                                    const pairs = [...new Set(chainTrades.map(t => t.pair).filter((pair): pair is string => pair !== undefined))];

                                    console.log(`✅ Created hedge group with ${chainTrades.length} trades for ${newsItem.currency} news`);

                                    hedgeGroups.push({
                                        id: `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                        trades: chainTrades,
                                        totalProfit,
                                        totalLoss,
                                        netProfit,
                                        startTime,
                                        endTime,
                                        duration,
                                        pairs,
                                        newsEvent: newsItem,
                                        newsDateTime,
                                        chainIdentifier
                                    });
                                }
                            });
                        }
                    } catch (parseError) {
                        console.warn('⚠️ Error processing news item:', newsItem, parseError);
                    }
                });
            } else {
                // Fallback: General hedge detection without news events
                console.log('🔍 Running general hedge detection (no news)');
                const graph = buildHedgeGraph(trades);
                const components = findConnectedComponents(graph, trades.length);

                console.log(`🔗 Found ${components.length} hedge components in general analysis`);

                components.forEach((component) => {
                    const chainTrades = component.map((idx) => trades[idx]);
                    const chainIdentifier = chainTrades.map(t => t.ticket).sort().join(",");

                    if (!seenChains.has(chainIdentifier)) {
                        seenChains.add(chainIdentifier);

                        chainTrades.sort((a, b) =>
                            new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
                        );

                        const totalProfit = chainTrades.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
                        const totalLoss = Math.abs(chainTrades.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
                        const netProfit = chainTrades.reduce((sum, t) => sum + t.amount, 0);

                        const startTime = new Date(chainTrades[0].openTime);
                        const endTime = new Date(chainTrades[chainTrades.length - 1].closeTime);
                        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                        const pairs = [...new Set(chainTrades.map(t => t.pair).filter((pair): pair is string => pair !== undefined))];

                        console.log(`✅ Created general hedge group with ${chainTrades.length} trades`);

                        hedgeGroups.push({
                            id: `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            trades: chainTrades,
                            totalProfit,
                            totalLoss,
                            netProfit,
                            startTime,
                            endTime,
                            duration,
                            pairs,
                            chainIdentifier
                        });
                    }
                });
            }

            console.log(`🎯 Total hedge groups found: ${hedgeGroups.length}`);

            // Merge overlapping chains
            const mergedGroups = mergeChains(hedgeGroups);

            // Calculate statistics
            const stats = calculateHedgeStats(mergedGroups);

            return { hedgeGroups: mergedGroups, stats };
        } catch (err) {
            console.error('❌ Hedge analysis error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred during hedge analysis');
            return {
                hedgeGroups: [],
                stats: {
                    totalHedgeGroups: 0,
                    totalHedgedTrades: 0,
                    totalHedgeProfit: 0,
                    totalHedgeLoss: 0,
                    netHedgeProfit: 0,
                    averageHedgeProfit: 0,
                    hedgeEfficiency: 0,
                    newsBasedHedges: 0,
                    uniqueNewsEvents: 0,
                    averageTradesPerGroup: 0
                }
            };
        }
    }, [trades, newsEvents, windowMinutes, fetchNews]);

    return {
        hedgeGroups: hedgeAnalysis.hedgeGroups,
        stats: hedgeAnalysis.stats,
        newsEvents,
        loading,
        error
    };
};

const calculateHedgeStats = (hedgeGroups: HedgeGroup[]): HedgeStats => {
    const totalHedgeGroups = hedgeGroups.length;
    const totalHedgedTrades = hedgeGroups.reduce((sum, group) => sum + group.trades.length, 0);

    const totalHedgeProfit = hedgeGroups.reduce((sum, group) => sum + group.totalProfit, 0);
    const totalHedgeLoss = hedgeGroups.reduce((sum, group) => sum + group.totalLoss, 0);
    const netHedgeProfit = hedgeGroups.reduce((sum, group) => sum + group.netProfit, 0);

    const averageHedgeProfit = totalHedgeGroups > 0 ? netHedgeProfit / totalHedgeGroups : 0;
    const hedgeEfficiency = totalHedgeLoss > 0 ? (totalHedgeProfit / (totalHedgeProfit + totalHedgeLoss)) * 100 : 0;

    const newsBasedHedges = hedgeGroups.filter(group => group.newsEvent).length;
    const uniqueNewsEvents = new Set(hedgeGroups.filter(group => group.newsEvent).map(group =>
        `${group.newsEvent?.date}_${group.newsEvent?.time}_${group.newsEvent?.currency}`
    )).size;

    const averageTradesPerGroup = totalHedgeGroups > 0 ? totalHedgedTrades / totalHedgeGroups : 0;

    return {
        totalHedgeGroups,
        totalHedgedTrades,
        totalHedgeProfit,
        totalHedgeLoss,
        netHedgeProfit,
        averageHedgeProfit,
        hedgeEfficiency,
        newsBasedHedges,
        uniqueNewsEvents,
        averageTradesPerGroup
    };
};