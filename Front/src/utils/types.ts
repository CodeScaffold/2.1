export interface Trade {
  ticket: string;
  openTime: Date;
  closeTime: Date;
  amount: number;
  pair?: string;
  positionType: string;
  duration: number;
  openPrice: number;
  lotSize: number;
  marginUseAmount: number;
  commission?: number;
  swap?: number;
}
export interface ExtendedTrade extends Trade {
  direction: string; // e.g. "BUY" or "SELL"
  instrument: string; // e.g. "EURUSD"
  ffDate: string; // e.g. "Apr 18 2024"
  ffTime: string; // e.g. "03:30"
}

export interface ChainViolation {
  trades: Trade[];
  totalProfit: number;
  closingBalance: number;
}

export interface HedgedGroup {
  trades: Trade[];
  totalProfit: number;
  isHedgeGroup: boolean;
}

export interface NewsEvent {
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: string;
  date_time?: string;
}

export interface MarginViolation {
  newsEvent: NewsEvent;
  trades: Trade[];
  totalMarginUsed: number;
  threshold: number;
}

export interface AnalysisResult {
  violations: ChainViolation[];
  profitTarget: number;
  maxAllowedProfit: number;
  isCompliant: boolean;
  initialBalance: number;
  error?: string;
  allTrades?: ExtendedTrade[];
  thirtySecondTrades?: Trade[];
  newsHedgeTrades?: Trade[];
  accountLogin?: string;
  statementType: string;
  marginUsageGroups?: HedgedGroup[];
  marginViolations?: MarginViolation[];
  totalNetProfit?: number;
  rawNetProfit?: number;
  trades?: Trade[];
}

export interface MarginUsageProps {
  violations: MarginViolation[];
}

export interface StatementParserProps {
  accountPhase: string | undefined;
  profitTargetPercentage?: number;
  funded: boolean;
  MetaTraderVersion: string | undefined;
}
export interface WrapperParams {
  version?: string;
  [key: string]: string | undefined;
}

export interface ResultDataType {
  id: number;
  clientId: number;
  account: number;
  ticket: number;
  pair: string;
  lot: number;
  openPrice: number;
  tp: number;
  sl: number;
  closePrice: number;
  closeTimeDate: string;
  reason: string;
  commend: string;
  version: string;
  difference: number;
  compensate: number;
  firstCheck: boolean;
  secondCheck: boolean;
  archivedAt?: string;
  updatedResults: string;
}

export interface Range {
  startDate: Date;
  endDate: Date;
  key: string;
}
export interface DateRangePickerComponentProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
}

export interface Range {
  startDate: Date;
  endDate: Date;
  key: string;
}

export enum AccountType {
  FLASH = "Flash",
  LEGEND = "Legend",
  PEAK_SCALP = "Peak_Scalp",
  BLACK = "Black",
}

export enum RiskType {
  AGGRESSIVE,
  NORMAL,
}
export interface UpgradePendingAccount {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  updatedAt: string;
  programId: string;
  version: string;
  login: string;
  balance: number;
  equity: number;
  state: string;
  invoiceId: string;
  userId: string;
  programName: string;
}

export interface PayoutAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  programId: string;
  programName: string;
  version: string;
  login: string;
  balance: number;
  equity: number;
  state: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  accountId: string;
  amount: number;
  transferAmount: number;
  profitSplit: number;
  email: string;
  fullName: string;
  login: string;
  payoutDetails: any;
  state: string;
  rejectionReason?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  paymentAgent?: string;
}

export interface Report {
  id: number;
  accountLogin: string;
  violations: string[];
  agentDecision: string;
  agent: string;
  createdAt: string;
  accountPhase: string;
  metaTraderVersion: string;
  note: string;
  accountType?: string;
  riskType?: string;
  email?: string;
  accountBalance?: number;
  marginViolations: string;
  stabilityRule: string;
  rule80Percent: string;
  newsHedgeTrades: string;
  thirtySecondTrades: string;
}


export interface Account {
  tradingLogin: String;
  clientId: String;
  login: string;
  programName: string;
  status?: string;
  reports: Report[];
}

export interface Client {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  country?: string;
  accounts: Account[];
}