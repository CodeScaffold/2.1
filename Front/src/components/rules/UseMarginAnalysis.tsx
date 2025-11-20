import {useCallback, useEffect, useMemo, useState} from 'react';
import {NewsEvent, Trade} from '../../utils/types';
import {API_URL} from '../settings';

interface SymbolInfo {
    symbol: string;
    path: string;
    currencyBase: string;
    marginInitialBuy: string;
    contractSize: string;
    description: string;
}

interface MarginViolation {
    newsEvent: NewsEvent;
    trades: Trade[];
    totalMarginUsed: number;
    threshold: number;
    violationPercentage: number;
}

interface UseMarginAnalysisProps {
    trades: Trade[];
    initialBalance: number;
    newsEvents: NewsEvent[];
    windowMinutes?: number;
    thresholdPercentage?: number;
    accountLeverage?: number;
}

interface UseMarginAnalysisResult {
    violations: MarginViolation[];
    loading: boolean;
    error: string | null;
    stats: {
        leverageMapSize: number;
        newsEventsCount: number;
        threshold: number;
        accountLeverage: number;
    };
    calculateMarginForTrade: (trade: Trade) => number;
}

// Helper function to properly parse date and time
const parseNewsDateTime = (dateStr: string | undefined, timeStr: string | undefined): Date => {
    if (!dateStr) {
        console.error('Invalid date input:', { dateStr, timeStr });
        return new Date();
    }

    const effectiveTime = (!timeStr || timeStr === 'All Day' || timeStr.trim() === '') ? '12:00' : timeStr;

    try {
        let parsedDate: Date;

        if (dateStr.includes(' ') && !dateStr.includes('/') && !dateStr.includes('-')) {
            const tempDate = new Date(`${dateStr} ${effectiveTime} GMT+0300`);
            if (!isNaN(tempDate.getTime())) {
                parsedDate = tempDate;
            } else {
                parsedDate = new Date(`${dateStr} ${effectiveTime}:00+03:00`);
            }
        } else if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${effectiveTime}:00+03:00`;
            parsedDate = new Date(isoString);
        } else if (dateStr.includes('-')) {
            const isoString = `${dateStr}T${effectiveTime}:00+03:00`;
            parsedDate = new Date(isoString);
        } else {
            parsedDate = new Date(`${dateStr} ${effectiveTime} GMT+0300`);
        }

        if (isNaN(parsedDate.getTime())) {
            // console.error('Failed to parse date:', dateStr, effectiveTime);
            return new Date();
        }

        return parsedDate;
    } catch (error) {
        console.error('Error parsing date:', error, { dateStr, timeStr });
        return new Date();
    }
};

export const useMarginAnalysis = ({
                                      trades,
                                      initialBalance,
                                      newsEvents,
                                      windowMinutes = 30,
                                      thresholdPercentage = 0.5,
                                      accountLeverage = 50
                                  }: UseMarginAnalysisProps): UseMarginAnalysisResult => {
    const [violations, setViolations] = useState<MarginViolation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [symbolInfoCache, setSymbolInfoCache] = useState<Map<string, SymbolInfo>>(new Map());
    const [fetchedNewsEvents, setFetchedNewsEvents] = useState<(NewsEvent & { dateTime: Date })[]>([]);
    const [leverageMap, setLeverageMap] = useState<Map<string, number>>(new Map());
    const [leverageFetched, setLeverageFetched] = useState(false);
    const [analysisCompleted, setAnalysisCompleted] = useState(false);

    // Forex pairs that use simplified margin calculation
    const simplifiedForexPairs = ['GBPJPY', 'USDJPY', 'USDCAD', 'USDCHF', 'EURJPY','CADJPY','NZDJPY','CHFJPY','AUDJPY'];

    // Memoized values
    const threshold = useMemo(() => {
        return initialBalance * thresholdPercentage;
    }, [initialBalance, thresholdPercentage]);

    const uniqueSymbols = useMemo(() => {
        return Array.from(
            new Set(trades.map(t => t.pair?.toUpperCase()).filter(Boolean))
        ) as string[];
    }, [trades]);

    // Fetch leverage data from API
    const fetchLeverageData = useCallback(async () => {
        if (leverageFetched) return;

        try {
            setLeverageFetched(true);
            const leverageEndpoint = `${API_URL}/leverage`;
            const response = await fetch(leverageEndpoint, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch leverage data: ${response.status}`);
            }

            const leverageData = await response.json();

            const leverageMapData = new Map<string, number>();

            if (Array.isArray(leverageData)) {
                leverageData.forEach((item: any) => {
                    if (item.pair && item.leverage) {
                        leverageMapData.set(item.pair.toUpperCase(), parseFloat(item.leverage));
                    }
                });
            }

            setLeverageMap(leverageMapData);
        } catch (err) {
            console.error('❌ Error fetching leverage data:', err);
            // Fallback leverage map
            const fallbackMap = new Map<string, number>();

            fallbackMap.set('DJIUSD', 30);
            fallbackMap.set('SPX500', 30);
            fallbackMap.set('NDX100', 30);
            fallbackMap.set('US30', 30);
            fallbackMap.set('EURUSD', 50);
            fallbackMap.set('USDJPY', 50);
            fallbackMap.set('GBPUSD', 50);
            fallbackMap.set('USDCAD', 50);
            fallbackMap.set('USDCHF', 50);
            fallbackMap.set('EURJPY', 50);
            fallbackMap.set('XAUUSD', 50);
            fallbackMap.set('XAGUSD', 50);
            fallbackMap.set('USOIL', 50);
            fallbackMap.set('BRENT', 50);

            setLeverageMap(fallbackMap);
        }
    }, [leverageFetched]);


    const [authToken, setAuthToken] = useState<string | null>(null);
    const [isGettingToken, setIsGettingToken] = useState(false);

    // Function to get token from your backend
    const getTokenFromBackend = useCallback(async (): Promise<string | null> => {
        if (authToken) {
            return authToken; // Return cached token if available
        }

        if (isGettingToken) {
            // Wait for ongoing token request
            return new Promise((resolve) => {
                const checkToken = () => {
                    if (!isGettingToken) {
                        resolve(authToken);
                    } else {
                        setTimeout(checkToken, 100);
                    }
                };
                checkToken();
            });
        }

        try {
            setIsGettingToken(true);

            // Call your backend endpoint that generates the OPO token
            const tokenEndpoint = `${API_URL}/opo-token`;

            const response = await fetch(tokenEndpoint, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to get token from backend: ${response.status}`);
            }

            const tokenData = await response.json();
            const token = tokenData.token || tokenData.access_token;

            if (!token) {
                throw new Error('No token received from backend');
            }

            setAuthToken(token);
            console.log('✅ Got token from backend successfully');
            return token;

        } catch (error) {
            console.error('❌ Error getting token from backend:', error);
            return null;
        } finally {
            setIsGettingToken(false);
        }
    }, [authToken, isGettingToken]);

    const fetchSymbolInfo = useCallback(async (symbol: string): Promise<SymbolInfo | null> => {
        try {
            const opoTradeApi = import.meta.env.VITE_OPO_API || 'https://opotrade.azurewebsites.net';

            // Get token from your backend
            const token = await getTokenFromBackend();

            if (!token) {
                console.error('❌ No token available from backend');
                return null;
            }

            const response = await fetch(`${opoTradeApi}/api/Symbol/getsymbolsbyname?symbol=${encodeURIComponent(symbol)}&source=mt5`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                // If unauthorized, clear token and retry once
                if (response.status === 401) {
                    console.log('🔄 Token expired, getting new token from backend...');
                    setAuthToken(null);
                    const newToken = await getTokenFromBackend();

                    if (newToken) {
                        // Retry with new token
                        const retryResponse = await fetch(`${opoTradeApi}/api/Symbol/getsymbolsbyname?symbol=${encodeURIComponent(symbol)}&source=mt5`, {
                            method: 'GET',
                            headers: {
                                'accept': '*/*',
                                'Authorization': `Bearer ${newToken}`
                            },
                        });

                        if (!retryResponse.ok) {
                            console.error(`❌ Failed to fetch symbol info for ${symbol} after retry: ${retryResponse.status}`);
                            return null;
                        }

                        const retryData = await retryResponse.json();
                        if (retryData.data && retryData.data.answer) {
                            return {
                                symbol: retryData.data.answer.symbol,
                                path: retryData.data.answer.path,
                                currencyBase: retryData.data.answer.currencyBase,
                                marginInitialBuy: retryData.data.answer.marginInitialBuy,
                                contractSize: retryData.data.answer.contractSize,
                                description: retryData.data.answer.description,
                            };
                        }
                    }
                }

                console.error(`❌ Failed to fetch symbol info for ${symbol}: ${response.status}`);
                return null;
            }

            const data = await response.json();

            if (data.data && data.data.answer) {
                return {
                    symbol: data.data.answer.symbol,
                    path: data.data.answer.path,
                    currencyBase: data.data.answer.currencyBase,
                    marginInitialBuy: data.data.answer.marginInitialBuy,
                    contractSize: data.data.answer.contractSize,
                    description: data.data.answer.description,
                };
            } else {
                return null;
            }
        } catch (err) {
            console.error(`❌ Error fetching symbol info for ${symbol}:`, err);
            return null;
        }
    }, [getTokenFromBackend]);

    // Get leverage for a specific symbol
    const getLeverageForSymbol = useCallback((symbol: string): number => {
        const upperSymbol = symbol.toUpperCase();

        if (leverageMap.has(upperSymbol)) {
            // console.log(`📊 Found exact leverage match for ${upperSymbol}: ${leverage}`);
            return leverageMap.get(upperSymbol)!;
        }

        // Dynamic matching for symbols with suffixes
        const matchingEntries = Array.from(leverageMap.entries()).filter(([apiSymbol]) => {
            if (apiSymbol.startsWith(upperSymbol)) {
                const remainingPart = apiSymbol.substring(upperSymbol.length);
                return remainingPart === '' || /^[^A-Z]+$/.test(remainingPart);
            }
            return false;
        });

        if (matchingEntries.length > 0) {
            const [matchedSymbol, leverage] = matchingEntries[0];
            console.log(`📊 Found dynamic leverage match for ${upperSymbol}: ${matchedSymbol} (${leverage})`);
            return leverage;
        }

        // console.warn(`⚠️ No leverage found for ${upperSymbol}, using account leverage: ${accountLeverage}`);
        return accountLeverage;
    }, [leverageMap, accountLeverage]);

    // Calculate margin usage for a trade
    const calculateMarginUsage = useCallback((trade: Trade, info?: SymbolInfo): number => {
        const tradeSymbol = trade.pair?.toUpperCase() || '';
        const symbolLeverage = getLeverageForSymbol(tradeSymbol);

        // console.log(`🔍 Calculating margin for ${tradeSymbol}:`, {
        //     hasInfo: !!info,
        //     symbolLeverage,
        //     accountLeverage,
        //     lotSize: trade.lotSize,
        //     openPrice: trade.openPrice,
        //     contractSize: info?.contractSize,
        //     marginInitialBuy: info?.marginInitialBuy
        // });

        if (!symbolLeverage) {
            // console.warn(`❌ Missing leverage for ${tradeSymbol}`);
            return 0;
        }

        if (!info) {
            // console.warn(`❌ Missing symbol info for ${tradeSymbol}`);
            if (tradeSymbol.length === 6 && /^[A-Z]{6}$/.test(tradeSymbol)) {
                // console.log(`📊 ${tradeSymbol} (forex fallback): ${margin.toFixed(2)}`);
                return (trade.lotSize * 100000) / symbolLeverage;
            }
            return 0;
        }

        const contractSize = parseFloat(info.contractSize);

        if (isNaN(contractSize) || contractSize === 0) {
            // console.warn(`❌ Invalid contract size for ${tradeSymbol}:`, info.contractSize);
            return 0;
        }

        // Use simplified calculation for specific forex pairs
        if (simplifiedForexPairs.includes(tradeSymbol)) {
            const margin = (trade.lotSize * contractSize) / symbolLeverage;
            // console.log(`📊 ${tradeSymbol} (simplified): ${margin.toFixed(2)}`);
            return margin;
        }

        // Standard calculation for other instruments
        const margin = (trade.lotSize * contractSize * trade.openPrice) / symbolLeverage;
        // console.log(`📊 ${tradeSymbol} (standard): ${margin.toFixed(2)}`);
        return margin;
    }, [getLeverageForSymbol, simplifiedForexPairs]);

    // Fetch news events from API
    const fetchNewsEvents = useCallback(async () => {
        if (trades.length === 0) {
            console.log('No trades available, skipping news fetch');
            return;
        }

        try {
            console.log('🔍 Fetching news events for margin analysis...');

            // Route through Vite proxy in dev or use real API in prod
            const newsEndpoint = `${API_URL}/news`; // Simplified - no proxy logic

            const response = await fetch(newsEndpoint, {
                method: 'GET',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();
            console.log('✅ News fetched for margin analysis');

            let rawArray: NewsEvent[] = [];

            if (Array.isArray(rawData)) {
                rawArray = rawData.length > 0 && Array.isArray(rawData[0]) ? rawData.flat() : rawData;
            } else if (typeof rawData === 'object' && rawData !== null) {
                rawArray = Object.values(rawData);
            }

            // Get trade date range for filtering
            const tradeDates = trades.map(t => new Date(t.openTime));
            const earliestTrade = new Date(Math.min(...tradeDates.map(d => d.getTime())));
            const latestTrade = new Date(Math.max(...tradeDates.map(d => d.getTime())));

            const bufferDays = 1;
            const rangeStart = new Date(earliestTrade.getTime() - bufferDays * 24 * 60 * 60 * 1000);
            const rangeEnd = new Date(latestTrade.getTime() + bufferDays * 24 * 60 * 60 * 1000);

            // console.log(`Trade date range: ${earliestTrade.toISOString()} to ${latestTrade.toISOString()}`);
            // console.log(`News filter range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);

            // Extract currencies from trades
            const tradeCurrencies = new Set<string>();
            trades.forEach(trade => {
                const tradeSymbol = trade.pair?.toUpperCase();
                if (tradeSymbol) {
                    if (tradeSymbol.length === 6 && /^[A-Z]{6}$/.test(tradeSymbol)) {
                        tradeCurrencies.add(tradeSymbol.substring(0, 3));
                        tradeCurrencies.add(tradeSymbol.substring(3, 6));
                    } else if (tradeSymbol.startsWith('XAU') || tradeSymbol.startsWith('XAG')) {
                        tradeCurrencies.add('USD');
                    } else if (tradeSymbol.includes('USD') || tradeSymbol.includes('DJI') || tradeSymbol.includes('SPX') || tradeSymbol.includes('NDX')) {
                        tradeCurrencies.add('USD');
                    }
                }
            });

            // console.log(`Trade currencies: ${Array.from(tradeCurrencies).join(', ')}`);

            // Filter relevant news events
            const filteredArray = rawArray.filter(event => {
                const isAllDay = !event.time || event.time === 'All Day' || event.time.trim() === '';
                const isTentative = event.event && event.event.toLowerCase().includes('tentative');

                if (isAllDay || isTentative) return false;
                if (!tradeCurrencies.has(event.currency)) return false;

                const eventDateTime = parseNewsDateTime(event.date, event.time);
                if (isNaN(eventDateTime.getTime())) return false;

                return eventDateTime >= rangeStart && eventDateTime <= rangeEnd;
            });

            // console.log(`Filtered to ${filteredArray.length} relevant news events`);

            const withDate = filteredArray.map(e => ({
                ...e,
                dateTime: parseNewsDateTime(e.date, e.time)
            }));

            setFetchedNewsEvents(withDate as (NewsEvent & { dateTime: Date })[]);
        } catch (err) {
            console.error('Error fetching news:', err);
            setError('Error fetching news data');
        }
    }, [trades]);

    // Analyze margin violations
    const analyzeMarginViolations = useCallback(async () => {
        if (trades.length === 0 || fetchedNewsEvents.length === 0 || leverageMap.size === 0 || analysisCompleted) {
            // console.log('Skipping analysis - dependencies not ready or already completed');
            return;
        }

        if (!accountLeverage) {
            console.error('❌ accountLeverage is required');
            setError('Account leverage is required for margin calculations');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const detected: MarginViolation[] = [];
            // console.log('🚀 Starting margin analysis');

            // Fetch symbol info for all unique symbols
            const symbolInfoMap = new Map<string, SymbolInfo>();
            const failedSymbols: string[] = [];

            for (const symbol of uniqueSymbols) {
                if (!symbolInfoCache.has(symbol)) {
                    const info = await fetchSymbolInfo(symbol);
                    if (info) {
                        symbolInfoMap.set(symbol, info);
                    } else {
                        failedSymbols.push(symbol);
                    }
                } else {
                    const cachedInfo = symbolInfoCache.get(symbol);
                    if (cachedInfo) {
                        symbolInfoMap.set(symbol, cachedInfo);
                    }
                }
            }

            // Update cache
            if (symbolInfoMap.size > 0) {
                setSymbolInfoCache(prev => new Map([...prev, ...symbolInfoMap]));
            }

            // Group news events by currency and time
            const newsTimeWindows = new Map<string, {
                newsEvents: (NewsEvent & { dateTime: Date })[];
                dateTime: Date;
                currency: string;
            }>();

            fetchedNewsEvents.forEach(newsEvent => {
                const roundedTime = new Date(Math.floor(newsEvent.dateTime.getTime() / (30 * 60 * 1000)) * (30 * 60 * 1000));
                const timeKey = `${newsEvent.currency}_${roundedTime.getTime()}`;

                if (!newsTimeWindows.has(timeKey)) {
                    newsTimeWindows.set(timeKey, {
                        newsEvents: [],
                        dateTime: newsEvent.dateTime,
                        currency: newsEvent.currency
                    });
                }
                newsTimeWindows.get(timeKey)!.newsEvents.push(newsEvent);
            });

            // console.log(`Processing ${newsTimeWindows.size} unique news time windows`);

            for (const { newsEvents, dateTime: newsDateTime, currency } of newsTimeWindows.values()) {
                const windowStart = new Date(newsDateTime.getTime() - windowMinutes * 60_000);
                const windowEnd = new Date(newsDateTime.getTime() + windowMinutes * 60_000);

                const combinedTitle = newsEvents.length > 1
                    ? newsEvents.map(e => e.event).join(', ')
                    : newsEvents[0].event;

                // console.log(`\nChecking news window: ${combinedTitle} (${currency})`);

                const affectedTrades = trades.filter(trade => {
                    const tradeSymbol = trade.pair?.toUpperCase();
                    if (!tradeSymbol) return false;

                    // Check if news currency affects this trade
                    let isAffected = false;
                    if (tradeSymbol.length === 6 && /^[A-Z]{6}$/.test(tradeSymbol)) {
                        const baseCurrency = tradeSymbol.substring(0, 3);
                        const quoteCurrency = tradeSymbol.substring(3, 6);
                        isAffected = baseCurrency === currency || quoteCurrency === currency;
                    } else if (tradeSymbol.startsWith('XAU') || tradeSymbol.startsWith('XAG')) {
                        isAffected = currency === 'USD';
                    } else if (tradeSymbol.includes('USD') || tradeSymbol.includes('DJI') || tradeSymbol.includes('SPX') || tradeSymbol.includes('NDX')) {
                        isAffected = currency === 'USD';
                    }

                    if (!isAffected) return false;

                    const tradeOpen = new Date(trade.openTime);
                    const tradeClose = trade.closeTime ? new Date(trade.closeTime) : new Date();

                    return tradeOpen <= windowEnd && tradeClose >= windowStart;
                });

                if (affectedTrades.length === 0) continue;

                let totalMarginForEvent = 0;
                const tradesWithMargin: { trade: Trade; margin: number }[] = [];

                for (const trade of affectedTrades) {
                    const tradeSymbol = trade.pair?.toUpperCase() ?? '';
                    const tradeInfo = symbolInfoMap.get(tradeSymbol) || symbolInfoCache.get(tradeSymbol);
                    const tradeMargin = calculateMarginUsage(trade, tradeInfo);

                    totalMarginForEvent += tradeMargin;
                    tradesWithMargin.push({ trade, margin: tradeMargin });
                }
                // Check if total margin exceeds threshold
                if (totalMarginForEvent > threshold) {
                    const enhancedEvent = {
                        ...newsEvents[0],
                        event: combinedTitle,
                    };

                    detected.push({
                        newsEvent: enhancedEvent,
                        trades: affectedTrades, // Include all affected trades
                        totalMarginUsed: totalMarginForEvent,
                        threshold,
                        violationPercentage: (totalMarginForEvent / initialBalance) * 100,
                    });

                    // console.log(`🚨 Violation detected for ${combinedTitle}: ${totalMarginForEvent.toFixed(2)} > ${threshold.toFixed(2)}`);
                }
            }

            // console.log(`\nAnalysis complete. Detected ${detected.length} violations`);
            setViolations(detected);
            setAnalysisCompleted(true);
        } catch (e) {
            console.error('analyzeMarginViolations error:', e);
            setError('Error analyzing margin violations: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [
        trades,
        fetchedNewsEvents,
        leverageMap,
        uniqueSymbols,
        threshold,
        windowMinutes,
        initialBalance,
        symbolInfoCache,
        fetchSymbolInfo,
        calculateMarginUsage,
        analysisCompleted,
        accountLeverage,
        getLeverageForSymbol
    ]);

    // Effects
    useEffect(() => {
        if (!accountLeverage) {
            // console.warn('⚠️ accountLeverage prop is required');
            setError('Account leverage is required for margin calculations');
        }
    }, [accountLeverage]);

    useEffect(() => {
        if (trades.length > 0 && !leverageFetched) {
            fetchLeverageData();
        }
    }, [trades, leverageFetched, fetchLeverageData]);

    useEffect(() => {
        if (newsEvents && newsEvents.length > 0) {
            const filteredEvents = newsEvents.filter(event => {
                const isAllDay = !event.time || event.time === 'All Day' || event.time.trim() === '';
                const isTentative = event.event && event.event.toLowerCase().includes('tentative');
                return !isAllDay && !isTentative;
            });

            const parsed = filteredEvents.map(e => ({
                ...e,
                dateTime: parseNewsDateTime(e.date, e.time)
            }));

            setFetchedNewsEvents(parsed);
            setAnalysisCompleted(false);
        } else if (fetchedNewsEvents.length === 0 && trades.length > 0) {
            fetchNewsEvents();
        }
    }, [newsEvents, trades, fetchNewsEvents]);

    useEffect(() => {
        if (trades.length > 0 && fetchedNewsEvents.length > 0 && leverageMap.size > 0 && !analysisCompleted) {
            analyzeMarginViolations();
        }
    }, [trades, fetchedNewsEvents, leverageMap, analysisCompleted, analyzeMarginViolations]);

    useEffect(() => {
        setAnalysisCompleted(false);
    }, [trades, initialBalance, thresholdPercentage, windowMinutes]);

    const stats = {
        leverageMapSize: leverageMap.size,
        newsEventsCount: fetchedNewsEvents.length,
        threshold,
        accountLeverage
    };

    return {
        violations,
        loading,
        error,
        stats,
        calculateMarginForTrade: useCallback((trade: Trade) => {
            const tradeSymbol = trade.pair?.toUpperCase() ?? '';
            const tradeInfo = symbolInfoCache.get(tradeSymbol);
            return calculateMarginUsage(trade, tradeInfo);
        }, [symbolInfoCache, calculateMarginUsage])
    }
};