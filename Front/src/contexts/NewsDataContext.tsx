import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { NewsEvent } from '../utils/types';
import { useOpoAuth } from '../OpoAuth';

interface NewsDataContextType {
    newsEvents: NewsEvent[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    lastFetched: Date | null;
}

const NewsDataContext = createContext<NewsDataContextType | undefined>(undefined);

interface NewsDataProviderProps {
    children: ReactNode;
    apiUrl: string;
}

export const NewsDataProvider: React.FC<NewsDataProviderProps> = ({ children, apiUrl }) => {
    const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    // Get auth status
    const { user, isLoading: authLoading } = useOpoAuth();

    // Rate limiting: only allow fetch once every 30 seconds
    const canFetch = useCallback(() => {
        if (!lastFetched) return true;
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        return lastFetched < thirtySecondsAgo;
    }, [lastFetched]);

    const fetchNewsEvents = useCallback(async () => {
        // Don't fetch if not authenticated
        if (!user || authLoading) {
            console.log('⏸️ Skipping news fetch - not authenticated');
            return;
        }

        if (!canFetch() || loading) {
            console.log('⏰ Rate limiting: skipping news fetch');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('📡 Fetching news events...');

            // Use development proxy or real API URL for news
            const newsEndpoint = import.meta.env.MODE === 'development'
                ? '/api/news'
                : `${apiUrl}/news`;

            const response = await fetch(newsEndpoint, {
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait before making more requests.');
                }
                throw new Error(`Failed to fetch news: ${response.status}`);
            }

            const rawData = await response.json();

            let newsArray: NewsEvent[] = [];
            if (Array.isArray(rawData)) {
                newsArray = rawData.length > 0 && Array.isArray(rawData[0]) ? rawData.flat() : rawData;
            } else if (typeof rawData === 'object' && rawData !== null) {
                newsArray = Object.values(rawData);
            }

            setNewsEvents(newsArray);
            setLastFetched(new Date());
            console.log(`✅ Fetched ${newsArray.length} news events`);

        } catch (err) {
            console.error('❌ Error fetching news:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch news');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, canFetch, loading, user, authLoading]);

    // Only fetch when user is authenticated and auth is not loading
    useEffect(() => {
        if (user && !authLoading) {
            fetchNewsEvents();
        }
    }, [user, authLoading, fetchNewsEvents]);

    const value = {
        newsEvents,
        loading,
        error,
        refetch: fetchNewsEvents,
        lastFetched
    };

    return (
        <NewsDataContext.Provider value={value}>
            {children}
        </NewsDataContext.Provider>
    );
};

export const useNewsData = () => {
    const context = useContext(NewsDataContext);
    if (context === undefined) {
        throw new Error('useNewsData must be used within a NewsDataProvider');
    }
    return context;
};