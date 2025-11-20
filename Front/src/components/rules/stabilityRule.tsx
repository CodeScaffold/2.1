
import { Trade } from "../../utils/types";


export interface DailyProfit {
    date: string; // Format: YYYY-MM-DD
    profit: number;
    trades: Trade[];
}

export interface StabilityRuleResult {
    dailyProfits: DailyProfit[];
    highestDailyProfit: number;
    highestDailyProfitDate: string;
    totalNetProfit: number;
    stabilityRate: number;
    isCompliant: boolean; // true if SR <= 20%
    threshold: number; // 20% threshold
    violations: string[];
}

/**
 * Analyzes the Stability Rule (SR) for funded accounts
 * SR = 100% x (Largest Daily Profit / Total Current Account Profit)
 * Must not exceed 20% for withdrawal eligibility
 */
export function analyzeStabilityRule(
    trades: Trade[],
    totalNetProfit: number
): StabilityRuleResult {
    const violations: string[] = [];

    // If no trades or no profit, return compliant result
    if (!trades || trades.length === 0 || totalNetProfit <= 0) {
        return {
            dailyProfits: [],
            highestDailyProfit: 0,
            highestDailyProfitDate: "",
            totalNetProfit,
            stabilityRate: 0,
            isCompliant: true,
            threshold: 20,
            violations: []
        };
    }

    // Group trades by trading day based on closeTime
    const dailyProfitsMap = new Map<string, DailyProfit>();

    trades.forEach(trade => {
        // Convert closeTime to date string (YYYY-MM-DD) using local timezone
        const closeDate = new Date(trade.closeTime);
        const dateKey = closeDate.toLocaleDateString('en-CA'); // yields YYYY-MM-DD in local timezone

        if (!dailyProfitsMap.has(dateKey)) {
            dailyProfitsMap.set(dateKey, {
                date: dateKey,
                profit: 0,
                trades: []
            });
        }

        const dailyProfit = dailyProfitsMap.get(dateKey)!;
        // Include commission and swap when computing net profit
        const netProfit = trade.amount + (trade.commission ?? 0) + (trade.swap ?? 0);
        dailyProfit.profit += netProfit;
        dailyProfit.trades.push(trade);
    });

    // Convert to array and sort by date
    const dailyProfits = Array.from(dailyProfitsMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Find the highest daily profit
    let highestDailyProfit = 0;
    let highestDailyProfitDate = "";

    dailyProfits.forEach(daily => {
        if (daily.profit > highestDailyProfit) {
            highestDailyProfit = daily.profit;
            highestDailyProfitDate = daily.date;
        }
    });

    // Calculate Stability Rate
    // SR = 100% x (Largest Daily Profit / Total Current Account Profit)
    const stabilityRate = totalNetProfit > 0
        ? (highestDailyProfit / totalNetProfit) * 100
        : 0;

    const threshold = 20; // 20% threshold
    const isCompliant = stabilityRate <= threshold;

    // Add violations if not compliant
    if (!isCompliant) {
        violations.push(
            `Stability Rate violation: ${stabilityRate.toFixed(2)}% exceeds the 20% threshold. ` +
            `Highest daily profit of $${highestDailyProfit.toFixed(2)} on ${formatDate(highestDailyProfitDate)} ` +
            `represents ${stabilityRate.toFixed(2)}% of total profit ($${totalNetProfit.toFixed(2)}).`
        );
    }

    return {
        dailyProfits,
        highestDailyProfit,
        highestDailyProfitDate,
        totalNetProfit,
        stabilityRate,
        isCompliant,
        threshold,
        violations
    };
}

/**
 * Formats a date string from YYYY-MM-DD to a more readable format
 */
function formatDate(dateString: string): string {
    if (!dateString) return "";

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Gets summary statistics for the stability rule analysis
 */
export function getStabilityRuleSummary(result: StabilityRuleResult): string {
    if (result.dailyProfits.length === 0) {
        return "No trading data available for stability analysis.";
    }

    const { stabilityRate, highestDailyProfit, highestDailyProfitDate, totalNetProfit, isCompliant } = result;

    const status = isCompliant ? "✅ COMPLIANT" : "❌ NON-COMPLIANT";
    const formattedDate = formatDate(highestDailyProfitDate);

    return `${status} - Stability Rate: ${stabilityRate.toFixed(2)}% | ` +
        `Highest Daily Profit: $${highestDailyProfit.toFixed(2)} (${formattedDate}) | ` +
        `Total Profit: $${totalNetProfit.toFixed(2)} | ` +
        `Threshold: ${result.threshold}%`;
}

/**
 * Calculates what the total profit needs to be for compliance
 */
export function calculateRequiredProfitForCompliance(
    highestDailyProfit: number,
    threshold: number = 20
): number {
    // Required Total Profit = Highest Daily Profit / (Threshold / 100)
    return highestDailyProfit / (threshold / 100);
}

/**
 * Calculates additional profit needed to become compliant
 */
export function calculateAdditionalProfitNeeded(
    currentTotalProfit: number,
    highestDailyProfit: number,
    threshold: number = 20
): number {
    const requiredTotalProfit = calculateRequiredProfitForCompliance(highestDailyProfit, threshold);
    const additionalNeeded = requiredTotalProfit - currentTotalProfit;
    return Math.max(0, additionalNeeded);
}