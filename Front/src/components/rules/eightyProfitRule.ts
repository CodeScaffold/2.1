import {
  AnalysisResult,
  ChainViolation,
  Trade,
  AccountType,
} from "../../utils/types";
import { getProfitTargets } from "../../utils/metaParser";

const PROFIT_LIMIT_PERCENTAGE = 0.8;

function calculateEightyProfitTarget(
    accountBalance: number,
    closedTradePL: number | undefined,
    effectiveProfitTargetPercentage: number,
): { profitTarget: number; maxAllowedProfit: number } {
  const PROFIT_LIMIT_MULTIPLIER = 0.8;
  if (closedTradePL !== undefined && closedTradePL > 0) {
    const profitTarget = closedTradePL * PROFIT_LIMIT_MULTIPLIER;
    const maxAllowedProfit = profitTarget * PROFIT_LIMIT_PERCENTAGE;
    return { profitTarget, maxAllowedProfit };
  } else {
    const profitTarget = accountBalance * effectiveProfitTargetPercentage;
    const maxAllowedProfit = profitTarget * PROFIT_LIMIT_PERCENTAGE;
    return { profitTarget, maxAllowedProfit };
  }
}

function calculateNetProfit(trades: Trade[]): number {
  return trades.reduce((acc, trade) => {
    const profit = trade.amount;
    const commission = trade.commission ?? 0; // negative for cost
    const swap = trade.swap ?? 0;

    // Net effect on balance is profit + swap + commission (commission is negative)
    return acc + profit + swap + commission;
  }, 0);
}

/**
 * Calculates the account balance at the closing time of the chain.
 * Simply adds the net effect of all trades in the chain to the current balance.
 */
function calculateClosingBalanceForChain(
    chainTrades: Trade[],
    currentBalance: number,
): number {
  const chainNetEffect = calculateNetProfit(chainTrades);
  const closingBalance = currentBalance + chainNetEffect;

  return closingBalance;
}

/**
 * Analyzes the trades using the 80% profit rule.
 *
 * If a valid closed trade P/L value is provided (i.e. > 0), the profit target for funded accounts is calculated as:
 *     profitTarget = closedTradePL * 0.8
 * Otherwise, the profit target is based on the account balance and effective target percentage.
 *
 * Returns an AnalysisResult containing any chain violations, profit target, max allowed profit, and compliance status.
 */
export function analyzeEightyProfit(
    trades: Trade[],
    accountBalance: number,
    aggressive: boolean,
    profitTargetPercentage?: number,
    accountType?: AccountType,
    accountPhase?: "phase1" | "phase2",
    totalNetProfit?: number,
): AnalysisResult {
  // Determine the effective profit target percentage.
  let effectiveProfitTargetPercentage: number;
  if (profitTargetPercentage !== undefined) {
    effectiveProfitTargetPercentage = profitTargetPercentage;
  } else if (accountType !== undefined) {
    const targets = getProfitTargets(accountType, aggressive);
    effectiveProfitTargetPercentage =
        accountPhase === "phase2" ? targets.phase2 : targets.phase1;
  } else {
    effectiveProfitTargetPercentage = aggressive ? 0.2 : 0.1;
  }

  const { profitTarget, maxAllowedProfit } = calculateEightyProfitTarget(
      accountBalance,
      totalNetProfit,
      effectiveProfitTargetPercentage,
  );

  const violations: ChainViolation[] = [];
  const sortedTrades = trades
      .slice()
      .sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
  let currentChain: Trade[] = [];
  let totalProfit = 0;
  let currentBalance = accountBalance;

  for (const trade of sortedTrades) {
    // Determine if this trade overlaps with any trade in the current chain.
    const isOverlapping = currentChain.some(
        (t) => trade.openTime <= t.closeTime,
    );

    // Compute net for this trade (for currentBalance update)
    const commission = trade.commission ?? 0;
    const tradeNet = trade.amount + (trade.swap ?? 0) + commission;

    if (isOverlapping || currentChain.length === 0) {
      currentChain.push(trade);
      if (trade.amount > 0) {
        totalProfit += trade.amount;
      }
      currentBalance += tradeNet;
    } else {
      // Check if the previous chain violated the rule
      if (totalProfit >= maxAllowedProfit) {
        const closingBalance = calculateClosingBalanceForChain(
            currentChain,
            currentBalance - calculateNetProfit(currentChain),
        );

        violations.push({
          trades: [...currentChain],
          totalProfit,
          closingBalance,
        });
      }

      // Start new chain
      currentChain = [trade];
      totalProfit = trade.amount > 0 ? trade.amount : 0;
      currentBalance += tradeNet;
    }
  }

  // Check the final chain.
  if (currentChain.length && totalProfit >= maxAllowedProfit) {
    const closingBalance = calculateClosingBalanceForChain(
        currentChain,
        currentBalance - calculateNetProfit(currentChain),
    );

    violations.push({
      trades: [...currentChain],
      totalProfit,
      closingBalance,
    });
  }

  return {
    violations,
    profitTarget,
    maxAllowedProfit,
    isCompliant: violations.length === 0,
    initialBalance: accountBalance,
    totalNetProfit: totalNetProfit !== undefined ? totalNetProfit : 0,
    statementType: "",
  };
}