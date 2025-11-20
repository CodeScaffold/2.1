import {
  AnalysisResult,
  ExtendedTrade,
  HedgedGroup,
  NewsEvent,
  Trade,
  AccountType,
} from "./types";
import { contractSizes } from "./constants";
import { analyzeEightyProfit } from "../components/rules/eightyProfitRule";
import { API_URL } from "../components/settings.ts";
import {parseNewsDateTimeWithTimezone} from "./timezoneUtils.ts";

const LEVERAGE = 50;
const MARGIN_THRESHOLD_PERCENTAGE = 0.5;
const WINDOW_MINUTES = 30;

type ProfitTargets = {
  phase1: number; // e.g., 0.10 for 10%
  phase2: number; // e.g., 0.05 for 5%
};

export function getProfitTargets(
  accountType: AccountType,
  aggressive: boolean,
): ProfitTargets {
  if (accountType === AccountType.PEAK_SCALP) {
    return aggressive
      ? { phase1: 0.2, phase2: 0.1 }
      : { phase1: 0.08, phase2: 0.05 };
  } else {
    return aggressive
      ? { phase1: 0.2, phase2: 0.1 }
      : { phase1: 0.1, phase2: 0.05 };
  }
}

/**
 * Auto-detects the statement type:
 * - If the file contains "Opogroup-Server1" (near the top), it's assumed to be an MT5 statement.
 * - If it contains "Currency" (near the top), it's assumed to be an MT4 statement.
 */
function detectStatementType(fileText: string): "MT4" | "MT5" {
  if (fileText.includes("Opogroup-Server")) {
    return "MT5";
  }
  if (fileText.includes("Currency")) {
    return "MT4";
  }
  throw new Error("Unrecognized statement format");
}

async function fetchHighImpactNews(): Promise<NewsEvent[]> {
  try {
    console.log('🔍 Fetching high impact news...');

    const response = await fetch(`${API_URL}/news`, {
      method: 'GET',
      credentials: 'include', // Add this!
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ News fetch failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log('✅ News fetched successfully');

    // Better handling of the data structure
    let newsArray: NewsEvent[] = [];

    if (Array.isArray(data)) {
      // If data is already an array
      newsArray = data;
    } else if (data && Array.isArray(data[0])) {
      // If data is nested array
      newsArray = data[0];
    } else if (data && typeof data === 'object') {
      // If data is an object, try to extract arrays
      const values = Object.values(data);
      const firstArrayValue = values.find(v => Array.isArray(v));
      newsArray = firstArrayValue as NewsEvent[] || [];
    }

    // Ensure we return an array
    if (!Array.isArray(newsArray)) {
      console.warn('⚠️ News data is not an array:', typeof newsArray);
      return [];
    }

    return newsArray;
  } catch (error) {
    console.error("❌ Error fetching high impact news:", error);
    return [];
  }
}
function parseTotalNetProfit(rows: NodeListOf<Element>): number {
  for (const row of Array.from(rows)) {
    const text = row.textContent || "";
    if (text.toLowerCase().includes("total net profit")) {
      const regex = /total net profit[:\s]*([\d\s.,-]+)/i;
      const match = text.match(regex);
      if (match && match[1]) {
        // Remove spaces and commas to normalize the numeric value.
        const cleanedValue = match[1].replace(/[\s,]+/g, "");
        return parseFloat(cleanedValue);
      } else {
        console.log("No matching numeric value found in row:", text);
      }
    }
  }
  console.log("No Total Net Profit row found.");
  return 0;
}

export async function parseUnifiedStatement(
  file: File,
  options: string[],
  aggressive: boolean,
  profitTargetPercentage?: number,
  accountType?: AccountType,
  funded?: boolean,
  accountPhase?: "phase1" | "phase2",
): Promise<AnalysisResult | null> {
  if (!file) return null;
  try {
    const fileText = await file.text();
    const statementType = detectStatementType(fileText);

    // Parse the HTML
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(fileText, "text/html");
    const rows = doc.querySelectorAll("tr");
    if (!rows.length) throw new Error("No rows found");




    let analysisResult: AnalysisResult | null = null;
    if (statementType === "MT4") {
      analysisResult = await parseMT4StatementFromRows(
        rows,
        options,
        aggressive,
        profitTargetPercentage,
        accountType,
        funded,
        accountPhase,
        file.name,
      );
    } else {
      analysisResult = await parseMT5StatementFromRows(
        rows,
        options,
        aggressive,
        profitTargetPercentage,
        accountType,
        funded,
        accountPhase,
        file.name,
      );
    }
    return analysisResult;
  } catch (error) {
    console.error("Error parsing statement:", error);
    return {
      violations: [],
      profitTarget: 0,
      maxAllowedProfit: 0,
      isCompliant: false,
      error: "Parsing error",
      initialBalance: 0,
      totalNetProfit: 0,
      statementType: "",
    };
  }
}

/* *******************************
   MT4 Statement Parsing Logic
******************************** */
async function parseMT4StatementFromRows(
  rows: NodeListOf<Element>,
  options: string[],
  aggressive: boolean,
  profitTargetPercentage: number | undefined,
  accountType: AccountType | undefined,
  funded: boolean | undefined,
  accountPhase: "phase1" | "phase2" | undefined,
  fileName: string,
): Promise<AnalysisResult> {
  // Extract account login from the statement header
  let accountLoginFromStatement = "";
  for (const row of rows) {
    const headerText = row.textContent?.trim() || "";
    const match = headerText.match(/^Account:\s*([0-9]+)/i);
    if (match) {
      accountLoginFromStatement = match[1];
      break;
    }
  }
  let initialBalance = 0;
  const tradeData: Trade[] = [];
  const newsEvents = await fetchHighImpactNews();

  // First pass: extract initial balance and trades
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 5) continue;
    const rowText = row.textContent?.toLowerCase() || "";
    // Find initial balance (look for keywords)
    if (
      (rowText.includes("initial deposit") ||
        rowText.includes("initial balance")) &&
      rowText.includes("balance")
    ) {
      const depositStr =
        cells[4]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";
      initialBalance = parseFloat(depositStr);
      continue;
    }
    // the row has enough cells for a trade row
    if (cells.length < 14) continue;
    const ticket = cells[0]?.textContent?.trim() || "";
    const openTimeStr = cells[1]?.textContent?.trim() || "";
    const positionType = cells[2]?.textContent?.trim().toLowerCase() || "";
    const volumeStr = cells[3]?.textContent?.trim() || "";
    const symbol = cells[4]?.textContent?.trim()?.toUpperCase() || "";
    const openPriceStr = cells[5]?.textContent?.trim() || "";
    const closeTimeStr = cells[8]?.textContent?.trim() || "";
    const closePriceStr = cells[9]?.textContent?.trim() || "";
    const profitStr =
      cells[13]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";

    const openTime = new Date(`${openTimeStr} GMT+0300`);
    const closeTime = new Date(`${closeTimeStr} GMT+0300`);
    const lotSize = parseFloat(volumeStr.replace(",", "."));
    const openPrice = parseFloat(openPriceStr.replace(",", "."));
    const closePrice = parseFloat(closePriceStr.replace(",", "."));
    const amount = parseFloat(profitStr);

    if (
      !isNaN(openTime.getTime()) &&
      !isNaN(closeTime.getTime()) &&
      !isNaN(lotSize) &&
      !isNaN(openPrice) &&
      !isNaN(closePrice) &&
      !isNaN(amount)
    ) {
      const commissionStr = cells[10]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";
      const commission = parseFloat(commissionStr);
      const swapStr       = cells[12]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";
      const swap           = parseFloat(swapStr);
      const duration = (closeTime.getTime() - openTime.getTime()) / 1000;
      tradeData.push({
        marginUseAmount: 0,
        ticket,
        openTime,
        closeTime,
        amount,
        pair: symbol,
        positionType,
        duration,
        openPrice,
        lotSize,
        commission,
        swap,
      });
    }
  }

  let analysisResult: AnalysisResult;

  analysisResult = analyzeEightyProfit(
      tradeData,
      initialBalance,
      aggressive,
      profitTargetPercentage,
      accountType,
      accountPhase,
      funded ? parseTotalNetProfit(rows) : undefined,
  );

  const marginViolations = calculateMarginViolations(
    tradeData,
    initialBalance,
    newsEvents,
  );
  const marginUsageGroups = calculateMarginUsageGroups(
    tradeData,
    initialBalance,
  );

  analysisResult.marginViolations = marginViolations;
  analysisResult.marginUsageGroups = marginUsageGroups;
  if (marginViolations.length > 0 || marginUsageGroups.length > 0) {
    analysisResult.isCompliant = false;
  }
  if (options.includes("30-second")) {
    analysisResult.thirtySecondTrades = tradeData.filter((t) => {
      const seconds = (t.closeTime.getTime() - t.openTime.getTime()) / 1000;
      return seconds < 30 && t.amount > 0;
    });
  }

  const allTrades: ExtendedTrade[] = tradeData.map((t) => {
    const { ffDate, ffTime } = toForexFactoryDateTime(t.openTime);
    return {
      ...t,
      direction: t.positionType.toUpperCase(),
      instrument: t.pair || "",
      ffDate,
      ffTime,
    };
  });
  // Extract actual Total Net Profit for MT4
  const parsedNetProfit = parseTotalNetProfit(rows);
  return {
    ...analysisResult,
    initialBalance,
    allTrades,
    accountLogin: accountLoginFromStatement || `${extractStatementNumber(fileName)}`,
    statementType: "MT4",
    totalNetProfit: parsedNetProfit,
  };
}



/* *******************************
   MT5 Statement Parsing Logic
******************************** */
async function parseMT5StatementFromRows(
  rows: NodeListOf<Element>,
  options: string[],
  aggressive: boolean,
  profitTargetPercentage: number | undefined,
  accountType: AccountType | undefined,
  funded: boolean | undefined,
  accountPhase: "phase1" | "phase2" | undefined,
  fileName: string,
): Promise<AnalysisResult> {
  // Extract account login from the statement header
  let accountLoginFromStatement = "";
  for (const row of rows) {
    const headerText = row.textContent?.trim() || "";
    const match = headerText.match(/^Account:\s*([0-9]+)/i);
    if (match) {
      accountLoginFromStatement = match[1];
      break;
    }
  }
  let initialBalance = 0;
  const tradeData: Trade[] = [];

  for (const row of rows) {
    const rowText = row.textContent?.toLowerCase() || "";
    // Look for rows that mention "initial deposit" or "initial balance"
    if (rowText.includes("initial deposit") || rowText.includes("balance")) {
      const cells = row.querySelectorAll("td");
      const balanceStr =
        cells[12]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";
      const deposit = parseFloat(balanceStr);

      if (!isNaN(deposit) && deposit > 0) {
        initialBalance = deposit;
        break;
      }
    }
  }

  // Second pass: Parse Trades
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    const isOrdersRow = cells[3]?.textContent?.toLowerCase().includes("order");
    if (isOrdersRow || cells.length < 14) continue;

    if (cells.length < 14) continue;
    const openTimeStr = cells[0]?.textContent?.trim() || "";
    const ticket = cells[1]?.textContent?.trim() || "";
    const pair = cells[2]?.textContent?.trim() || "";
    const positionType = cells[3]?.textContent?.trim() || "";
    const lotSizeStrRaw = cells[5]?.textContent?.trim() || "";
    const lotSizeStr = lotSizeStrRaw.replace(",", ".").replace(/[^\d.]/g, "");
    const openPriceStr = cells[6]?.textContent?.trim() || "";
    const closeTimeStr = cells[9]?.textContent?.trim() || "";
    const amountStr =
      cells[13]?.textContent?.trim().replace(/[\s,]/g, "") || "0";

    const openTime = new Date(`${openTimeStr} GMT+0300`);
    const closeTime = new Date(`${closeTimeStr} GMT+0300`);
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
      const commissionStr = cells[11]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";
      const commission    = parseFloat(commissionStr);
      const swapStr       = cells[12]?.textContent?.trim().replace(/[^\d.-]/g, "") || "0";
      const swap          = parseFloat(swapStr);
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
        commission,
        swap,
      });
      // Logging after pushing each MT5 trade
      // console.log(`[parser] Parsed MT5 trade: ticket=${ticket}, symbol=${pair}, lotSize=${lotSize}`);
    }
  }

  let analysisResult: AnalysisResult;
  analysisResult = analyzeEightyProfit(
      tradeData,
      initialBalance,
      aggressive,
      profitTargetPercentage,
      accountType,
      accountPhase,
      funded ? parseTotalNetProfit(rows) : undefined,
  );

  const newsEvents = await fetchHighImpactNews();
  const marginViolations = calculateMarginViolations(
    tradeData,
    initialBalance,
    newsEvents,
  );
  const marginUsageGroups = calculateMarginUsageGroups(
    tradeData,
    initialBalance,
  );
  analysisResult.marginViolations = marginViolations;
  analysisResult.marginUsageGroups = marginUsageGroups;
  if (marginViolations.length > 0 || marginUsageGroups.length > 0) {
    analysisResult.isCompliant = false;
  }
  if (options.includes("30-second")) {
    analysisResult.thirtySecondTrades = tradeData.filter((t) => {
      const seconds = (t.closeTime.getTime() - t.openTime.getTime()) / 1000;
      return seconds < 30 && t.amount > 0;
    });
  }
  const allTrades: ExtendedTrade[] = tradeData.map((t) => {
    const { ffDate, ffTime } = toForexFactoryDateTime(t.openTime);
    return {
      ...t,
      direction: t.positionType.toUpperCase(),
      instrument: t.pair || "",
      ffDate,
      ffTime,
    };
  });
  // Extract actual Total Net Profit for MT5
  const parsedNetProfit = parseTotalNetProfit(rows);
  return {
    ...analysisResult,
    initialBalance,
    allTrades,
    accountLogin: accountLoginFromStatement || `${extractStatementNumber(fileName)}`,
    statementType: "MT5",
    totalNetProfit: parsedNetProfit,
  };
}

/* *******************************
       Utility Functions
******************************** */
function toForexFactoryDateTime(date: Date): {
  ffDate: string;
  ffTime: string;
} {
  const shortMonth = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return {
    ffDate: `${shortMonth} ${day} ${year}`,
    ffTime: `${hours}:${minutes}`,
  };
}

function extractStatementNumber(fileName: string): string | number {
  const match = fileName.match(/\d+/);
  return match ? parseInt(match[0], 10) : "Unknown";
}

/**
 * Sample margin violation calculation (common for MT4 – adjust if needed)
 */
function calculateMarginViolations(
  trades: Trade[],
  initialBalance: number,
  newsEvents: NewsEvent[],
): any[] {
  const violations: any[] = [];
  // For each news event, find trades in the window and calculate total margin used.
  newsEvents.forEach((news: NewsEvent) => {
    const newsDateTime = parseNewsDateTimeWithTimezone(news, trades[0]?.openTime);
    const windowStart = new Date(
      newsDateTime.getTime() - WINDOW_MINUTES * 60 * 1000,
    );
    const windowEnd = new Date(
      newsDateTime.getTime() + WINDOW_MINUTES * 60 * 1000,
    );
    const tradesInWindow = trades.filter(
      (trade) => trade.openTime >= windowStart && trade.openTime <= windowEnd,
    );
    if (tradesInWindow.length === 0) return;
    const totalMarginUsed = tradesInWindow.reduce((sum, trade) => {
      const pairKey = trade.pair?.toUpperCase() || "";
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

function calculateMarginUsageGroups(
  trades: Trade[],
  initialBalance: number,
): HedgedGroup[] {
  const marginUsageGroups: HedgedGroup[] = [];
  trades.forEach((trade) => {
    const margin =
      (trade.lotSize * (contractSizes[trade.pair?.toUpperCase() || ""] || 0)) /
      LEVERAGE;
    if (margin > initialBalance * MARGIN_THRESHOLD_PERCENTAGE) {
      marginUsageGroups.push({
        trades: [trade],
        totalProfit: trade.amount,
        isHedgeGroup: false,
      });
    }
  });
  return marginUsageGroups;
}
