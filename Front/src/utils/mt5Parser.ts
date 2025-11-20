// parseStatementMT5.ts
import highImpactNews from '../../../back/src/data/high_impact_news.json';
import contractSizesData from '../../../back/src/data/contractSizes.json';
import {
    Trade,
    ExtendedTrade,
    AnalysisResult,
    ChainViolation,
    HedgedGroup,
    NewsEvent,
    MarginViolation,
} from './types';

const contractSizes: Record<string, number> = contractSizesData as Record<string, number>;

// -------------------------
// Common constants & helpers
// -------------------------
const PROFIT_LIMIT_PERCENTAGE = 0.8;
const LEVERAGE = 50;
const MARGIN_THRESHOLD_PERCENTAGE = 0.5; // 50%
const WINDOW_MINUTES = 30;

function toForexFactoryDateTime(date: Date): { ffDate: string; ffTime: string } {
    const shortMonth = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return {
        ffDate: `${shortMonth} ${day} ${year}`,
        ffTime: `${hours}:${minutes}`,
    };
}

function getProfitTarget(
    accountBalance: number,
    aggressive: boolean,
    profitTargetPercentage?: number // optional parameter
): number {
    if (profitTargetPercentage !== undefined) {
        return accountBalance * profitTargetPercentage;
    }
    // Fallback default if no profitTargetPercentage is provided:
    return aggressive ? accountBalance * 0.2 : accountBalance * 0.1;
}


function parseNewsDateTime(news: NewsEvent): Date {
    const dateTimeString = `${news.date} ${news.time} GMT+0200`;
    return new Date(dateTimeString);
}

// -------------------------
// Margin Calculations
// -------------------------
function calculateMargin(trade: Trade): number {
    const pairKey = trade.pair?.toUpperCase() || '';
    const contractSize = contractSizes[pairKey] || 0;
    return (trade.lotSize * contractSize) / LEVERAGE;
}

function calculateMarginViolations(trades: Trade[], initialBalance: number): MarginViolation[] {
    const violations: MarginViolation[] = [];

    highImpactNews.forEach((news: NewsEvent) => {
        const newsDateTime = parseNewsDateTime(news);
        const windowStart = new Date(newsDateTime.getTime() - WINDOW_MINUTES * 60 * 1000);
        const windowEnd = new Date(newsDateTime.getTime() + WINDOW_MINUTES * 60 * 1000);

        const tradesInWindow = trades.filter(
            (trade) => trade.openTime >= windowStart && trade.openTime <= windowEnd
        );

        if (tradesInWindow.length === 0) return;

        const totalMarginUsed = tradesInWindow.reduce((sum, trade) => {
            const pairKey = trade.pair?.toUpperCase() || '';
            const contractSize = contractSizes[pairKey] || 0;
            return sum + (contractSize * trade.openPrice * trade.lotSize) / LEVERAGE;
        }, 0);

        const threshold = initialBalance * MARGIN_THRESHOLD_PERCENTAGE;
        if (totalMarginUsed > threshold) {
            violations.push({
                newsEvent: news,
                trades: tradesInWindow,
                totalMarginUsed,
                threshold,
            });
        }
    });

    return violations;
}

function calculateMarginUsageGroups(trades: Trade[], initialBalance: number): HedgedGroup[] {
    const marginUsageGroups: HedgedGroup[] = [];
    trades.forEach((trade) => {
        const margin = calculateMargin(trade);
        if (margin > initialBalance * MARGIN_THRESHOLD_PERCENTAGE) {
            marginUsageGroups.push({
                trades: [trade],
                totalProfit: trade.amount,
            });
        }
    });
    return marginUsageGroups;
}

// -------------------------
// Trading Compliance Analysis
// -------------------------
export function analyzeTradingCompliance(
    trades: Trade[],
    accountBalance: number,
    aggressive: boolean,
    profitTargetPercentage?: number  // New optional parameter
): AnalysisResult {
    if (!trades.length || isNaN(accountBalance)) {
        return {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: true,
        };
    }

    const baseProfitTarget = profitTargetPercentage !== undefined
        ? accountBalance * profitTargetPercentage
        : getProfitTarget(accountBalance, aggressive);
    const profitTarget = aggressive ? baseProfitTarget * 2 : baseProfitTarget;

    const maxAllowedProfit = profitTarget * PROFIT_LIMIT_PERCENTAGE;
    const violations: ChainViolation[] = [];

    const sortedTrades = trades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
    let currentChain: Trade[] = [];
    let totalProfit = 0;

    for (const trade of sortedTrades) {
        const isOverlapping = currentChain.some((t) => trade.openTime <= t.closeTime);
        if (isOverlapping || currentChain.length === 0) {
            currentChain.push(trade);
            if (trade.amount > 0) {
                totalProfit += trade.amount;
            }
        } else {
            if (totalProfit >= maxAllowedProfit) {
                violations.push({ trades: [...currentChain], totalProfit });
            }
            currentChain = [trade];
            totalProfit = trade.amount > 0 ? trade.amount : 0;
        }
    }

    if (currentChain.length && totalProfit >= maxAllowedProfit) {
        violations.push({ trades: [...currentChain], totalProfit });
    }

    const marginViolations = calculateMarginViolations(trades, accountBalance);

    return {
        violations,
        profitTarget,
        maxAllowedProfit,
        isCompliant: violations.length === 0 && marginViolations.length === 0,
        initialBalance: accountBalance,
        marginViolations,
    };
}

function extractStatementNumber(fileName: string): string | number {
    const match = fileName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 'Unknown';
}

// -------------------------
// The Actual MT5 Parser
// -------------------------
export async function parseStatementMT5(
    file: File,
    options: string[],
    aggressive: boolean,
profitTargetPercentage?: number
): Promise<AnalysisResult | null> {
    if (!file) return null;

    try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');
        if (!rows.length) return null;

        let initialBalance = 0;
        const tradeData: Trade[] = [];
        let marginUsageGroups: HedgedGroup[] = [];

        // First pass: Find Initial Balance
        for (const row of rows) {
            if (row.textContent?.toLowerCase().includes('initial deposit')) {
                const cells = row.querySelectorAll('td');
                // Assuming the initial balance is in the 13th cell (index 12) – adjust if needed
                const balanceStr = cells[12]?.textContent?.trim().replace(/[^\d.-]/g, '') || '0';
                initialBalance = parseFloat(balanceStr);
                console.log('MT5 Parser: Found initial deposit =>', initialBalance);
                break;
            }
        }

        // Second pass: Parse Trades
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            // Skip rows that indicate orders or do not have enough columns
            const isOrdersRow = cells[3]?.textContent?.toLowerCase().includes('order');
            if (isOrdersRow || cells.length < 14) continue;

            const openTimeStr = cells[0]?.textContent?.trim() || '';
            const ticket = cells[1]?.textContent?.trim() || '';
            const pair = cells[2]?.textContent?.trim() || '';
            const positionType = cells[3]?.textContent?.trim() || '';
            const lotSizeStrRaw = cells[5]?.textContent?.trim() || '';
            const lotSizeStr = lotSizeStrRaw.replace(',', '.').replace(/[^\d.]/g, '');
            const openPriceStr = cells[6]?.textContent?.trim() || '';
            const closeTimeStr = cells[9]?.textContent?.trim() || '';
            const amountStr = cells[13]?.textContent?.trim().replace(/[\s,]/g, '') || '0';

            const openTime = new Date(`${openTimeStr} GMT+0200`);
            const closeTime = new Date(`${closeTimeStr} GMT+0200`);
            const amount = parseFloat(amountStr);
            const openPrice = parseFloat(openPriceStr);
            const lotSize = parseFloat(lotSizeStr);

            if (
                !isNaN(amount) &&
                !isNaN(openTime.getTime()) &&
                !isNaN(closeTime.getTime()) &&
                !isNaN(openPrice) &&
                !isNaN(lotSize)
            ) {
                const duration = (closeTime.getTime() - openTime.getTime()) / 1000;
                tradeData.push({
                    marginUseAmount: 0,
                    ticket,
                    openTime,
                    closeTime,
                    amount,
                    pair,
                    positionType,
                    duration,
                    openPrice,
                    lotSize,
                });
            } else {
            }
        }

        // Apply analysis logic
        let analysisResult: AnalysisResult = {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: true,
        };

        if (options.includes('80% profit')) {
            analysisResult = analyzeTradingCompliance(tradeData, initialBalance, aggressive, profitTargetPercentage);
        }

        if (options.includes('30-second')) {
            analysisResult.thirtySecondTrades = tradeData.filter((t) => {
                const seconds = (t.closeTime.getTime() - t.openTime.getTime()) / 1000;
                return seconds < 30 && t.amount > 0;
            });
        }

        if (options.includes('50% Margin')) {
            const marginViolations = calculateMarginViolations(tradeData, initialBalance);
            marginUsageGroups = calculateMarginUsageGroups(tradeData, initialBalance);
            analysisResult.marginViolations = marginViolations;
            analysisResult.marginUsageGroups = marginUsageGroups;
            if (marginViolations.length > 0 || marginUsageGroups.length > 0) {
                analysisResult.isCompliant = false;
            }
        }

        // Build ExtendedTrade array
        const allTrades: ExtendedTrade[] = tradeData.map((t) => {
            const { ffDate, ffTime } = toForexFactoryDateTime(t.openTime);
            return {
                ...t,
                direction: t.positionType.toUpperCase(),
                instrument: t.pair || '',
                ffDate,
                ffTime,
            };
        });

        return {
            ...analysisResult,
            initialBalance,
            allTrades,
            statementNumber: extractStatementNumber(file.name),
            marginUsageGroups,
        };
    } catch (error) {
        console.error('MT5 parse error:', error);
        return {
            violations: [],
            profitTarget: 0,
            maxAllowedProfit: 0,
            isCompliant: false,
            error: 'Parsing error',
        };
    }
}