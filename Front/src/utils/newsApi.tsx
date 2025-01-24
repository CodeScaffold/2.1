import axios from 'axios';
import analyzeTradingCompliance from '../StatementParser';

interface NewsEvent {
    date_time: string; // ISO format datetime string
    currency: string; // Currency related to the news
    impact: string; // Impact level, e.g., "High"
}

interface Trade {
    ticket: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
    pair?: string;
    positionType: string;
}

interface AnalysisResult {
    violations: any[]; // Adjust based on actual violations type
    profitTarget: number;
    maxAllowedProfit: number;
    isCompliant: boolean;
}

/**
 * Fetch high-impact news events from the Forex API
 * @param fromDate - Start date in "YYYY-MM-DD" format
 * @param toDate - End date in "YYYY-MM-DD" format
 * @returns A list of high-impact news events
 */
export async function fetchImportantNews(fromDate: string, toDate: string): Promise<NewsEvent[]> {
    try {
        const response = await axios.get('https://fcsapi.com/api-v3/forex/economy_cal', {
            params: {
                from: fromDate,
                to: toDate,
                access_key: 'DsBQp33PeVHJfrWhP3chmSWWf',
            },
        });
        return response.data.response.filter((event: NewsEvent) => event.impact === 'High');
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

/**
 * Filter trades by their relevance to important news events
 * @param trades - List of trades to filter
 * @param importantNews - List of high-impact news events
 * @returns A filtered list of trades relevant to the news
 */
export function filterTradesByNews(trades: Trade[], importantNews: NewsEvent[]): Trade[] {
    return trades.filter((trade) => {
        return importantNews.some((news) => {
            const newsTime = new Date(news.date_time);
            return (
                trade.openTime <= newsTime &&
                trade.closeTime >= newsTime &&
                trade.pair?.includes(news.currency)
            );
        });
    });
}

/**
 * Process trades for compliance and hedging analysis
 * @param trades - List of trades
 * @param accountBalance - Account balance
 * @param aggressive - Aggressiveness flag for compliance
 * @param news - List of high-impact news events
 * @returns A compliance result and filtered news-hedged trades
 */
export async function processTrades(
    trades: Trade[],
    accountBalance: number,
    aggressive: boolean,
    news: NewsEvent[]
): Promise<{ complianceResult: AnalysisResult; newsHedgedTrades: Trade[] }> {
    const complianceResult = analyzeTradingCompliance(trades, accountBalance, aggressive);
    const newsHedgedTrades = filterTradesByNews(trades, news);

    return {
        complianceResult,
        newsHedgedTrades,
    };
}
