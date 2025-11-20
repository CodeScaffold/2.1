import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useOpoAuth } from '../OpoAuth';

interface LeverageDataContextType {
    leverageMap: Map<string, number>;
    loading: boolean;
    error: string | null;
    refetch: () => void;
    lastFetched: Date | null;
}

const LeverageDataContext = createContext<LeverageDataContextType | undefined>(undefined);

interface LeverageDataProviderProps {
    children: ReactNode;
    apiUrl: string;
}

export const LeverageDataProvider: React.FC<LeverageDataProviderProps> = ({
                                                                              children,
                                                                              apiUrl
                                                                          }) => {
    const [leverageMap, setLeverageMap] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    // Get auth status
    const { user, isLoading: authLoading } = useOpoAuth();

    // Rate limiting: only allow fetch once every 60 seconds
    const canFetch = useCallback(() => {
        if (!lastFetched) return true;
        const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
        return lastFetched < sixtySecondsAgo;
    }, [lastFetched]);

    const fetchLeverageData = useCallback(async () => {
        // Don't fetch if not authenticated
        if (!user || authLoading) {
            console.log('⏸️ Skipping leverage fetch - not authenticated');
            return;
        }

        if (!canFetch() || loading) {
            console.log('⏰ Rate limiting: skipping leverage fetch');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('📡 Fetching leverage data...');

            // Use development proxy or real API URL
            const leverageEndpoint = import.meta.env.MODE === 'production'
                ? '/api/leverage'
                : `${apiUrl}/leverage`;

            const response = await fetch(leverageEndpoint, {
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait before making more requests.');
                }
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
            setLastFetched(new Date());
            console.log(`✅ Fetched leverage data for ${leverageMapData.size} pairs`);

        } catch (err) {
            console.error('❌ Error fetching leverage data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leverage data');

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
        } finally {
            setLoading(false);
        }
    }, [apiUrl, canFetch, loading, user, authLoading]);

    // Only fetch when user is authenticated and auth is not loading
    useEffect(() => {
        if (user && !authLoading) {
            fetchLeverageData();
        }
    }, [user, authLoading, fetchLeverageData]);

    const value = {
        leverageMap,
        loading,
        error,
        refetch: fetchLeverageData,
        lastFetched
    };

    return (
        <LeverageDataContext.Provider value={value}>
            {children}
        </LeverageDataContext.Provider>
    );
};

export const useLeverageData = () => {
    const context = useContext(LeverageDataContext);
    if (context === undefined) {
        throw new Error('useLeverageData must be used within a LeverageDataProvider');
    }
    return context;
};