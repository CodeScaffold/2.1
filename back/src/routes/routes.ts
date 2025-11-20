import Router = require("@koa/router");
import type {Context} from "koa";
import {prisma} from "../database";
import {AccountType, Decision as PrismaDecision, Prisma, Reasons, RiskType} from "@prisma/client";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import Joi from "joi";
import loginRouter from './login';

console.log('🔍 Loading routes.ts...');

dotenv.config();

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

// Validation schemas based on Prisma schema
const reportSchema = Joi.object({
  accountLogin: Joi.string().min(1).max(50).required(),
  ThirtySecondTrades: Joi.string().max(500).required(),
  NewsHedgeTrades: Joi.string().max(500).required(),
  Rule80Percent: Joi.string().max(500).required(),
  MarginViolations: Joi.string().max(500).required(),
  StabilityRule: Joi.string().max(20).optional(),
  Agent: Joi.string().max(100).required(),

  // Decision enum - accept various cases
  Decision: Joi.string().valid(
      'Approved', 'Rejected', 'Review',           // PascalCase (Prisma format)
      'APPROVED', 'REJECTED', 'REVIEW',           // Uppercase
      'approved', 'rejected', 'review'            // Lowercase
  ).optional(),

  // MetaTraderVersion - accept MT4/MT5 variations
  MetaTraderVersion: Joi.string().valid('MT4', 'MT5', 'mt4', 'mt5', 'Mt4' , 'Mt5').optional(),

  AccountPhase: Joi.string().max(50).optional(),
  Note: Joi.string().max(1000).allow('').optional(),

  // AccountType enum - accept various cases
  accountType: Joi.string().valid(
      'LEGEND', 'PEAK_SCALP', 'BLACK', 'FLASH',           // Uppercase (Prisma format)
      'Legend', 'Peak_Scalp', 'Black', 'Flash',           // PascalCase
      'legend', 'peak_scalp', 'black', 'flash'            // Lowercase
  ).optional(),

  // RiskType enum - accept various cases
  riskType: Joi.string().valid(
      'AGGRESSIVE', 'NORMAL',                              // Uppercase (Prisma format)
      'Aggressive', 'Normal',                              // PascalCase
      'aggressive', 'normal'                               // Lowercase
  ).optional(),

  accountBalance: Joi.number().min(0).max(1000000).optional(),
  tradingLogin: Joi.string().max(255).optional(),
  // email removed - not in Prisma Reports model
});

const normalizeDecision = (decision: string | undefined): PrismaDecision | undefined => {
  if (!decision) return undefined;

  // Convert to PascalCase (Prisma format)
  const normalized = decision.charAt(0).toUpperCase() + decision.slice(1).toLowerCase();

  // Validate it's a valid Decision enum
  const validDecisions = ['Approved', 'Rejected', 'Review'];
  if (validDecisions.includes(normalized)) {
    return normalized as PrismaDecision;
  }

  // ✅ Log invalid values for debugging
  console.warn(`Invalid Decision value: ${decision}, normalized to: ${normalized}`);
  return undefined;
};

const normalizeAccountType = (type: string | undefined): AccountType | undefined => {
  if (!type) return undefined;

  // Convert to uppercase and replace spaces with underscores
  const normalized = type.toUpperCase().replace(/\s+/g, '_');

  // Validate it's a valid AccountType
  if (Object.values(AccountType).includes(normalized as AccountType)) {
    return normalized as AccountType;
  }

  return undefined;
};

const normalizeRiskType = (type: string | undefined): RiskType | undefined => {
  if (!type) return undefined;

  const normalized = type.toUpperCase();

  if (Object.values(RiskType).includes(normalized as RiskType)) {
    return normalized as RiskType;
  }

  return undefined;
};

const normalizeMetaTraderVersion = (version: string | undefined): string | undefined => {
  if (!version) return undefined;

  // Always return uppercase MT4/MT5
  const normalized = version.toUpperCase();
  if (normalized === 'MT4' || normalized === 'MT5') {
    return normalized;
  }

  return undefined;
};


const emailSchema = Joi.string().email().max(254);
const idSchema = Joi.number().integer().positive();

// Validation middleware
const validateBody = (schema: Joi.ObjectSchema) => {
  return async (ctx: Context, next: Function) => {
    try {
      const { error, value } = schema.validate(ctx.request.body);
      if (error) {
        ctx.status = 400;
        ctx.body = {
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        };
        return;
      }
      ctx.request.body = value; // Use validated/sanitized data
      await next();
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid request body' };
    }
  };
};

const validateParam = (paramName: string, schema: Joi.Schema) => {
  return async (ctx: Context, next: Function) => {
    const { error, value } = schema.validate(ctx.params[paramName]);
    if (error) {
      ctx.status = 400;
      ctx.body = { error: `Invalid ${paramName} parameter` };
      return;
    }
    ctx.params[paramName] = value;
    await next();
  };
};

const validateQuery = (queryName: string, schema: Joi.Schema, required = false) => {
  return async (ctx: Context, next: Function) => {
    const queryValue = Array.isArray(ctx.query[queryName])
        ? ctx.query[queryName][0]
        : ctx.query[queryName];

    if (!queryValue) {
      if (required) {
        ctx.status = 400;
        ctx.body = { error: `Missing required query parameter: ${queryName}` };
        return;
      }
      await next();
      return;
    }

    const { error, value } = schema.validate(queryValue);
    if (error) {
      ctx.status = 400;
      ctx.body = { error: `Invalid ${queryName} query parameter` };
      return;
    }

    ctx.query[queryName] = value;
    await next();
  };
};

// User authorization middleware
const getUserInfo = (ctx: Context) => {
  const user = ctx.state.user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return {
    email: user.email || 'unknown',
    id: user.id,
    roles: user.roles || []
  };
};

// Role-based access control
const router = new Router();

// Mount authentication routes (login, logout, me)
router.use(loginRouter.routes()).use(loginRouter.allowedMethods());

console.log('🔍 Login router routes:', loginRouter.stack?.map(layer => ({
  path: layer.path,
  methods: layer.methods
})));

// News endpoint (read-only, lower permissions)
router.get("/news", async (ctx: Context) => {
  try {
    const news = await prisma.forexNews.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Limit results
    });

    ctx.body = news.map((entry) => entry.data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching news:`, error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch Forex news" };
  }
});

// Reports endpoints (requires admin role)
router.get("/forfxreports", async (ctx: Context) => {
  try {
    // Return all reports without limit
    ctx.body = await prisma.reports.findMany({
      orderBy: {createdAt: "desc"},
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching reports:`, error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch reports" };
  }
});

router.get('/opo-token', async (ctx) => {
  try {
    const email = process.env.DEV_EMAIL;
    const password = process.env.DEV_PASSWORD;

    if (!email || !password) {
      ctx.status = 500;
      ctx.body = { error: 'OPO credentials not configured' };
      return;
    }

    console.log('🔐 Authenticating with OPO API...');

    // Authenticate with OPO API using your backend credentials
    const authResponse = await fetch('https://opotrade.azurewebsites.net/api/Authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': '*/*'
      },
      body: JSON.stringify({
        username: email,  // Changed from 'email' to 'username'
        password: password,
        crmToken: "string"  // Added required crmToken field
      })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ OPO authentication failed:', authResponse.status, errorText);
      ctx.status = 500;
      ctx.body = { error: 'Failed to authenticate with OPO API' };
      return;
    }

    const authData = await authResponse.json();
    const token = authData.token || authData.access_token;

    if (!token) {
      console.error('❌ No token received from OPO API');
      ctx.status = 500;
      ctx.body = { error: 'No token received from OPO API' };
      return;
    }

    console.log('✅ Successfully got OPO token');

    ctx.body = {
      token: token,
      expiresIn: authData.expiresIn || authData.expires_in // Include expiry if available
    };

  } catch (error) {
    console.error('❌ Error getting OPO token:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error while getting OPO token' };
  }
});


router.post("/forfxreports",
    validateBody(reportSchema),
    async (ctx: Context) => {
      try {
        const {
          accountLogin,
          ThirtySecondTrades,
          NewsHedgeTrades,
          Rule80Percent,
          MarginViolations,
          StabilityRule,
          Agent,
          Decision: decisionRaw,
          MetaTraderVersion: metaTraderVersionRaw,
          AccountPhase,
          Note,
          accountType,
          riskType,
          accountBalance,
          tradingLogin,
        } = ctx.request.body;

        const user = getUserInfo(ctx);

        const decisionEnum = normalizeDecision(decisionRaw);
        const metaTraderVersionStr = normalizeMetaTraderVersion(metaTraderVersionRaw);
        const normalizedAccountType = normalizeAccountType(accountType);
        const normalizedRiskType = normalizeRiskType(riskType);

        // Log the normalizations for debugging
        console.log('Field normalizations:', {
          original: { decisionRaw, metaTraderVersionRaw, accountType, riskType },
          normalized: { decisionEnum, metaTraderVersionStr, normalizedAccountType, normalizedRiskType }
        });

        // Find or create account and client relationships
        let existingAccount = await prisma.account.findUnique({
          where: { tradingLogin: accountLogin },
          include: { Client: true }
        });

        let client;
        if (existingAccount) {
          client = existingAccount.Client;
        } else {
          // Create account logic
          const existingPending = await prisma.upgradePendingAccount.findFirst({
            where: { login: accountLogin },
          });

          const payoutAcct = await prisma.payout.findFirst({
            where: { login: accountLogin },
          });

          let clientData;
          if (existingPending?.email && emailSchema.validate(existingPending.email).error === undefined) {
            clientData = {
              email: existingPending.email,
              firstName: existingPending.firstName || "Unknown",
              lastName: existingPending.lastName || "",
              country: existingPending.country,
            };
          } else if (payoutAcct?.email && emailSchema.validate(payoutAcct.email).error === undefined) {
            const [firstName, ...lastParts] = payoutAcct.fullName.split(" ");
            clientData = {
              email: payoutAcct.email,
              firstName,
              lastName: lastParts.join(" "),
              country: null,
            };
          } else {
            // Create minimal pending account
            const pendingAccount = await prisma.upgradePendingAccount.create({
              data: {
                id: accountLogin,
                login: accountLogin,
                email: `unknown.${accountLogin}@pending.local`,
                firstName: "Unknown",
                lastName: "",
                programId: "",
                programName: normalizedAccountType || "unknown",
                version: "",
                balance: 0,
                equity: 0,
                invoiceId: "",
                state: AccountPhase || "unknown",
                userId: "",
                country: null,
                updatedAt: new Date(),
              },
            });

            clientData = {
              email: pendingAccount.email,
              firstName: pendingAccount.firstName,
              lastName: pendingAccount.lastName,
              country: pendingAccount.country,
            };
          }

          // Create or find client
          client = await prisma.client.upsert({
            where: { email: clientData.email },
            create: clientData,
            update: {
              firstName: clientData.firstName,
              lastName: clientData.lastName,
              country: clientData.country,
            },
          });

          // Create account with Client relation
          existingAccount = await prisma.account.create({
            data: {
              tradingLogin: accountLogin,
              programName: normalizedAccountType || "unknown",
              clientId: client.id,
            },
            include: {
              Client: true
            }
          });
        }

        const report = await prisma.reports.create({
          data: {
            accountLogin: existingAccount.login,
            tradingLogin: tradingLogin || accountLogin,
            ThirtySecondTrades,
            NewsHedgeTrades,
            Rule80Percent,
            MarginViolations,
            StabilityRule,
            Agent,
            Decision: decisionEnum,
            MetaTraderVersion: metaTraderVersionStr,
            AccountPhase,
            Note,
            accountType: normalizedAccountType,
            riskType: normalizedRiskType,
            accountBalance,
          },
        });

        // Zapier notification (only for approved accounts)
        if (decisionEnum === PrismaDecision.Approved && ZAPIER_WEBHOOK_URL) {
          await handleZapierNotification(accountLogin, AccountPhase || "", Note || "", normalizedAccountType);
        }

        ctx.status = 201;
        ctx.body = {
          success: true,
          reportId: report.id,
          message: "Report created successfully"
        };

      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error creating report:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          user: ctx.state.user?.email || 'unknown',
          ip: ctx.ip
        });
        ctx.status = 500;
        ctx.body = { error: "Failed to create report" };
      }
    }
);

const normalizeCommends = (commend: string | undefined): any => {
  if (!commend) return undefined;

  // Map common variations to Prisma enum values
  const commendMap: Record<string, string> = {
    'slslippage': 'SlSlippage',
    'openslippage': 'OpenSlippage',
    'openslslippage': 'OpenSlSlippage',
    'open sl slippage': 'OpenSlSlippage',  // ✅ Add space variations
    'highspread': 'HighSpread',
    'high spread': 'HighSpread',           // ✅ Add space variation
    'maxdrawdown': 'MaxDrawDown',
    'max drawdown': 'MaxDrawDown',         // ✅ Add space variation
    'max draw down': 'MaxDrawDown'         // ✅ Add space variation
  };

  const normalized = commendMap[commend.toLowerCase().replace(/\s+/g, '')]; // Remove spaces before lookup
  return normalized || commend;
};

const loginSchema = Joi.string().min(1).max(50);

const resultSchema = Joi.object({
  clientId: Joi.string().optional(),
  account: Joi.string().optional(),
  ticket: Joi.string().optional(),
  tp: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  sl: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  pair: Joi.string().optional(),
  lot: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  openPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  closePrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  closeTimeDate: Joi.string().optional(),
  reason: Joi.string().valid(
      'OpenPriceSlippage', 'SlippageOnSL', 'HighSpread',
      'OpenClosePriceSlippage', 'MaxDrawdown', 'timeout'
  ).optional(),
  commend: Joi.string().optional(),
  version: Joi.string().optional(),
  difference: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  compensateInUsd: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
});

const normalizeVersions = (version: string | undefined): any => {
  if (!version) return undefined;

  // Map common variations to Prisma enum values
  const versionMap: Record<string, string> = {
    'meta4': 'Meta4',
    'meta5': 'Meta5',
    'mt4': 'Meta4',
    'mt5': 'Meta5',
    'ctrader': 'cTrader'
  };

  const normalized = versionMap[version.toLowerCase()];
  return normalized || version;
};

// Zapier notification handler (extracted for security)
async function handleZapierNotification(
    accountLogin: string,
    accountPhase: string,
    note: string,
    accountType?: string
) {
  try {
    if (!ZAPIER_WEBHOOK_URL) {
      console.log('Zapier webhook URL not configured');
      return;
    }

    const pendingList = await prisma.upgradePendingAccount.findMany();
    const payoutAcct = await prisma.payout.findFirst({
      where: { login: accountLogin },
    });

    let acct = pendingList.find((a) => a.login === accountLogin);
    if (!acct && payoutAcct) {
      const [firstName, ...lastParts] = payoutAcct.fullName.split(" ");
      acct = {
        login: payoutAcct.login,
        email: payoutAcct.email,
        firstName,
        lastName: lastParts.join(" "),
        programName: accountType || "unknown",
      } as any;
    }

    if (!acct || !acct.email || !acct.firstName) {
      console.log(`[${new Date().toISOString()}] Skipping notification: incomplete account data for ${accountLogin}`);
      return;
    }

    if (accountPhase.toLowerCase() === "phase1" || note.toLowerCase().includes('rev')) {
      console.log(`[${new Date().toISOString()}] Skipping notification: conditions not met for ${accountLogin}`);
      return;
    }

    // Check if already notified
    const existing = await prisma.zapierMailTrack.findUnique({
      where: { email: acct.email },
    });

    if (existing?.notified) {
      console.log(`[${new Date().toISOString()}] Skipping notification: already notified ${acct.email}`);
      return;
    }

    const nameCapitalized = acct.firstName.charAt(0).toUpperCase() + acct.firstName.slice(1).toLowerCase();

    const zapPayload = {
      email: acct.email,
      name: nameCapitalized,
      login: acct.login,
    };

    console.log(`[${new Date().toISOString()}] Sending notification for login: ${acct.login}`);

    // Send to Zapier
    const zapRes = await fetch(ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zapPayload),
      timeout: 10000, // 10 second timeout
    });

    if (!zapRes.ok) {
      throw new Error(`Zapier returned status ${zapRes.status}`);
    }

    // Update notification tracking
    await prisma.zapierMailTrack.upsert({
      where: { email: acct.email },
      update: { notified: true },
      create: { email: acct.email, notified: true },
    });

    // Send to Telegram if configured
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramToken && telegramChatId) {
      const telegramMessage =
          `🆕 Account Approved\n` +
          `Name: ${nameCapitalized}\n` +
          `Login: ${acct.login}`;

      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage,
        }),
        timeout: 10000,
      });
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Zapier notification error:`, error);
  }
}

// Other endpoints with proper validation and authorization
router.get("/leverage", async (ctx: Context) => {
  try {
    ctx.body = await prisma.leverage.findMany({
      orderBy: {pair: "asc"},
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching leverage:`, error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch leverage data" };
  }
});

router.get("/upgrade-pending",
    async (ctx: Context) => {
      try {
        ctx.body = await prisma.upgradePendingAccount.findMany({
          orderBy: {updatedAt: "desc"},
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching upgrade pending:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to fetch upgrade pending accounts" };
      }
    }
);

router.get("/payouts",
    async (ctx: Context) => {
      try {
        // Return all payouts without limit
        const payouts = await prisma.payout.findMany({
          orderBy: { createdAt: "desc" },
        });
        ctx.body = payouts;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching payouts:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to fetch payouts" };
      }
    }
);

router.patch("/payouts/:id",
    validateParam('id', idSchema),
    async (ctx: Context) => {
      try {
        const id = ctx.params.id;
        const updateSchema = Joi.object({
          amount: Joi.number().min(0).max(1000000).optional(),
          state: Joi.string().max(50).optional(),
        });

        const { error, value } = updateSchema.validate(ctx.request.body);
        if (error) {
          ctx.status = 400;
          ctx.body = { error: 'Invalid update data' };
          return;
        }

        // ✅ ADD MISSING PAYOUT VARIABLE:
        ctx.body = await prisma.payout.update({
          where: {id},
          data: value,
        }); // ✅ This was missing the payout variable
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating payout:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to update payout" };
      }
    }
);

router.delete("/forfxreports/:id",
    validateParam('id', idSchema),
    async (ctx: Context) => {
      try {
        const id = Number(ctx.params.id);
        await prisma.reports.delete({
          where: { id },
        });
        ctx.status = 204;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting report:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to delete report" };
      }
    }
);

// Add this to your routes/routes.ts file
router.post('/api/symbol/:symbol', async (ctx) => {
  try {
    const { symbol } = ctx.params;
    const email = process.env.DEV_EMAIL;
    const password = process.env.DEV_PASSWORD;

    if (!email || !password) {
      ctx.status = 500;
      ctx.body = { error: 'Missing API credentials' };
      return;
    }

    // First, authenticate with the external API
    const authResponse = await fetch('https://opotrade.azurewebsites.net/api/Authentication/login', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        crmToken: "string"
      })
    });

    if (!authResponse.ok) {
      console.error(`❌ External API authentication failed: ${authResponse.status}`);
      ctx.status = 401;
      ctx.body = { error: 'External API authentication failed' };
      return;
    }

    // Get cookies from auth response for subsequent requests
    const setCookieHeader = authResponse.headers.get('set-cookie');

    // Then fetch symbol info using the authentication
    const symbolResponse = await fetch(
        `https://opotrade.azurewebsites.net/api/Symbol/getsymbolsbyname?symbol=${symbol.toUpperCase()}&source=mt5`,
        {
          headers: {
            'Cookie': setCookieHeader || '',
            'Accept': '*/*',
          }
        }
    );

    if (!symbolResponse.ok) {
      console.error(`❌ Failed to fetch symbol info for ${symbol}: ${symbolResponse.status}`);
      ctx.status = symbolResponse.status;
      ctx.body = { error: 'Failed to fetch symbol info from external API' };
      return;
    }

    ctx.body = await symbolResponse.json();

  } catch (error) {
    console.error('Error in symbol proxy:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

router.get(
    "/result",
    validateQuery("page", Joi.number().integer().min(1), false),
    async (ctx: Context) => {
      // Handle includeArchived query param and where clause
      const includeArchived = ctx.query.includeArchived === "true";
      const whereClause: Prisma.ResultWhereInput = includeArchived
          ? {}
          : { archivedAt: null };
      // Apply dynamic filters
      const {
        id: idParam,
        clientId: clientIdParam,
        account: accountParam,
        ticket: ticketParam,
        pair: pairParam,
        reason: reasonParam,
        startDate,
        endDate,
      } = ctx.query as Record<string, string>;

      if (idParam) {
        whereClause.id = Number(idParam);
      }
      if (clientIdParam) {
        whereClause.clientId = clientIdParam;
      }
      if (accountParam) {
        whereClause.account = accountParam;
      }
      if (ticketParam) {
        whereClause.ticket = ticketParam;
      }
      if (pairParam) {
        whereClause.pair = pairParam;
      }
      if (reasonParam) {
        whereClause.reason = reasonParam as Reasons;
      }
      if (startDate || endDate) {
        whereClause.closeTimeDate = {};
        if (startDate) {
          whereClause.closeTimeDate.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.closeTimeDate.lte = new Date(endDate);
        }
      }
      try {
        const paginate = ctx.query.paginate !== "false";
        if (paginate) {
          const page = parseInt(ctx.query.page as string) || 1;
          // Apply pagination parameters
          const pageSize = 10;
          const skip = (page - 1) * pageSize;

          const [items, total] = await Promise.all([
            prisma.result.findMany({
              where: whereClause,
              orderBy: { id: "desc" },
              skip,
              take: pageSize,
            }),
            prisma.result.count({ where: whereClause }),
          ]);
          ctx.body = { results: items, totalResultsCount: total };
        } else {
          ctx.body = await prisma.result.findMany({
            where: whereClause,
            orderBy: { id: "desc" },
          });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching results:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to fetch results" };
      }
    }
);

// Replace the POST /result route error handling section with this improved version:

router.post("/result",
    validateBody(resultSchema),
    async (ctx: Context) => {
      try {
        const {
          clientId,
          account,
          ticket,
          tp,
          sl,
          pair,
          lot,
          openPrice,
          closePrice,
          closeTimeDate,
          reason,
          commend,
          version,
          difference,
          compensateInUsd
        } = ctx.request.body;

        console.log('📝 Creating result with data:', {
          clientId,
          account,
          ticket,
          tp,
          sl,
          pair,
          lot,
          openPrice,
          closePrice,
          closeTimeDate,
          reason,
          commend,
          version,
          difference,
          compensateInUsd
        });

        // Normalize enums
        const normalizedCommend = normalizeCommends(commend);
        const normalizedVersion = normalizeVersions(version);

        console.log('🔄 Normalized enums:', {
          originalCommend: commend,
          normalizedCommend,
          originalVersion: version,
          normalizedVersion
        });

        // Helper function to safely parse numbers
        const safeParseFloat = (value: any): number | null => {
          if (value === null || value === undefined || value === "") {
            return null;
          }
          if (value === "0" || value === 0) {
            return 0;
          }
          const parsed = parseFloat(value.toString());
          return isNaN(parsed) ? null : parsed;
        };

        // Helper function to safely parse dates
        const safeParseDateInput = (value: any): Date | null => {
          if (!value) return null;
          try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
          } catch {
            return null;
          }
        };

        // Prepare data for database
        const dbData = {
          clientId: clientId?.toString() || null,
          account: account?.toString() || null,
          ticket: ticket?.toString() || null,
          tp: safeParseFloat(tp),
          sl: safeParseFloat(sl),
          pair: pair?.toString() || null,
          lot: safeParseFloat(lot),
          openPrice: safeParseFloat(openPrice),
          closePrice: safeParseFloat(closePrice),
          closeTimeDate: safeParseDateInput(closeTimeDate),
          reason: reason as Reasons,
          commend: normalizedCommend,
          version: normalizedVersion,
          difference: safeParseFloat(difference),
          compensate: safeParseFloat(compensateInUsd),
        };

        console.log('💾 Database data prepared:', dbData);

        if (ticket) {
          const existingResult = await prisma.result.findUnique({
            where: { ticket: ticket.toString() }
          });

          if (existingResult) {
            ctx.status = 409;
            ctx.body = {
              message: "This ticket already exists in database."
            };
            return;
          }
        }

        // Create the result in database
        const result = await prisma.result.create({
          data: dbData,
        });

        console.log('✅ Result created successfully:', result.id);

        ctx.status = 201;
        ctx.body = {
          success: true,
          id: result.id,
          message: "Result created successfully"
        };

      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error creating result:`, error);
        console.error('📋 Full request body:', JSON.stringify(ctx.request.body, null, 2));

        // Handle specific Prisma errors with meaningful messages
        if (error && typeof error === 'object') {
          const prismaError = error as any;

          // Handle unique constraint violations (P2002)
          if (prismaError.code === 'P2002') {
            const target = prismaError.meta?.target;
            if (target && target.includes('ticket')) {
              ctx.status = 409; // Conflict status for duplicates
              ctx.body = {
                message: "This ticket already exists in database."
              };
              return;
            }
            // Handle other unique constraint violations
            ctx.status = 409;
            ctx.body = {
              message: `Duplicate entry detected for: ${target ? target.join(', ') : 'unknown field'}`
            };
            return;
          }

          // Handle other specific Prisma errors
          if (prismaError.code === 'P2025') {
            ctx.status = 404;
            ctx.body = {
              message: "Record not found."
            };
            return;
          }

          if (prismaError.code === 'P2003') {
            ctx.status = 400;
            ctx.body = {
              message: "Foreign key constraint failed."
            };
            return;
          }

          // Handle validation errors
          if (prismaError.code === 'P2006' || prismaError.code === 'P2007') {
            ctx.status = 400;
            ctx.body = {
              message: "Invalid data provided."
            };
            return;
          }
        }

        // Handle general errors
        let errorMessage = 'Failed to create result';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        ctx.status = 500;
        ctx.body = {
          message: errorMessage
        };
      }
    }
);

// PATCH /result/:id
router.patch(
    "/result/:id",
    validateParam("id", idSchema),
    async (ctx: Context) => {
      try {
        const id = Number(ctx.params.id);
        const { firstCheck, secondCheck } = ctx.request.body as { firstCheck: boolean; secondCheck: boolean };
        const updateData: any = { firstCheck, secondCheck };
        if (secondCheck) {
          updateData.archivedAt = new Date();
        } else {
          updateData.archivedAt = null;
        }
        const result = await prisma.result.update({
          where: { id },
          data: updateData,
        });
        ctx.body = result;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating result:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to update result" };
      }
    }
);

// Client router with proper security
const clientRouter = new Router();

clientRouter.get('/clients',
    validateQuery('email', emailSchema, false),
    validateQuery('login', loginSchema, false),
    async (ctx: Context) => {
      try {
        const emailParam = ctx.query.email as string | undefined;
        const loginParam = ctx.query.login as string | undefined;

        const whereClause: any = {};
        if (emailParam) whereClause.email = emailParam;
        if (loginParam) {
          whereClause.accounts = { some: { tradingLogin: loginParam } };
        }

        const clients = await prisma.client.findMany({
          where: whereClause,
          orderBy: { id: 'asc' },
          include: {
            accounts: {
              ...(loginParam ? { where: { tradingLogin: loginParam } } : {}),
              include: {
                reports: {
                  orderBy: { createdAt: 'desc' },
                  take: 10 // Limit reports per account
                },
                Reports_Reports_tradingLoginToAccount: {
                  orderBy: { createdAt: 'desc' },
                  take: 10
                }
              }
            }
          }
        });

        // Merge and dedupe reports
        ctx.body = clients.map(client => {
          const processedAccounts = client.accounts.map(acc => {
            const allReports = [
              ...(acc.reports ?? []),
              ...(acc.Reports_Reports_tradingLoginToAccount ?? [])
            ];

            const deduped = Array.from(new Map(allReports.map(r => [r.id, r])).values())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            // Return account with processed reports, maintaining the expected structure
            return {
              ...acc,
              reports: deduped,
              Reports_Reports_tradingLoginToAccount: []
            };
          });

          return {
            ...client,
            accounts: processedAccounts
          };
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching clients:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to fetch clients" };
      }
    }
);

clientRouter.get('/clients/:id',
    validateParam('id', idSchema),
    async (ctx: Context) => {
      try {
        const id = Number(ctx.params.id);

        const client = await prisma.client.findUnique({
          where: { id },
          include: {
            accounts: {
              include: {
                reports: {
                  orderBy: { createdAt: 'desc' },
                  take: 20 // Limit reports
                }
              }
            }
          }
        });

        if (!client) {
          ctx.status = 404;
          ctx.body = { error: 'Client not found' };
          return;
        }

        // Process accounts to get all reports
        const processedAccounts = await Promise.all(client.accounts.map(async (acc) => {
          const reports = await prisma.reports.findMany({
            where: {
              OR: [
                { accountLogin: acc.login },
                { tradingLogin: acc.tradingLogin ?? '' }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
          });

          return {
            ...acc,
            reports: Array.from(new Map(reports.map(r => [r.id, r])).values())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          };
        }));

        ctx.body = {
          ...client,
          accounts: processedAccounts
        };
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching client:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to fetch client data" };
      }
    }
);

clientRouter.post('/sync-clients',
    async (ctx: Context) => {
      try {
        const synced = await syncPendingAccountsToClients();
        ctx.body = {
          success: true,
          synced,
          message: `Successfully synced ${synced} pending accounts to clients`
        };
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error syncing clients:`, error);
        ctx.status = 500;
        ctx.body = { error: "Failed to sync clients" };
      }
    }
);

router.get('/client-by-login/:login',
    validateParam('login', loginSchema),
    async (ctx: Context) => {
      try {
        const { login } = ctx.params;

        const account = await prisma.account.findUnique({
          where: { tradingLogin: login },
          include: { Client: true }
        });

        if (!account) {
          ctx.status = 404;
          ctx.body = { error: 'Account not found' };
          return;
        }

        const client = await prisma.client.findUnique({
          where: { id: account.clientId },
          include: {
            accounts: {
              include: {
                reports: {
                  orderBy: { createdAt: 'desc' },
                  take: 10
                }
              }
            }
          }
        });

        if (!client) {
          ctx.status = 404;
          ctx.body = { error: 'Client not found' };
          return;
        }

        ctx.body = client;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching client by login:`, error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch client data' };
      }
    }
);

// Admin debug endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug-reports/:login',
      validateParam('login', loginSchema),
      async (ctx: Context) => {
        try {
          const { login } = ctx.params;

          const reportsByTradingLogin = await prisma.reports.findMany({
            where: { tradingLogin: login },
            orderBy: { createdAt: 'desc' },
            take: 5
          });

          const reportsByAccountLogin = await prisma.reports.findMany({
            where: { accountLogin: login },
            orderBy: { createdAt: 'desc' },
            take: 5
          });

          const account = await prisma.account.findUnique({
            where: { tradingLogin: login }
          });

          ctx.body = {
            searchLogin: login,
            account: account ? {
              login: account.login,
              tradingLogin: account.tradingLogin,
              programName: account.programName,
              clientId: account.clientId
            } : null,
            reportsByTradingLogin: reportsByTradingLogin.length,
            reportsByAccountLogin: reportsByAccountLogin.length,
            sampleReports: reportsByTradingLogin.slice(0, 2).map(r => ({
              id: r.id,
              tradingLogin: r.tradingLogin,
              accountLogin: r.accountLogin,
              createdAt: r.createdAt,
              Decision: r.Decision
            }))
          };
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Debug error:`, error);
          ctx.status = 500;
          ctx.body = { error: 'Debug query failed' };
        }
      }
  );
}

// Sync function for pending accounts
export async function syncPendingAccountsToClients(): Promise<number> {
  try {
    const pendingAccounts = await prisma.upgradePendingAccount.findMany();
    const payoutAccounts = await prisma.payout.findMany();

    type RawAcct = {
      login: string;
      email: string;
      firstName: string;
      lastName: string;
      programName: string;
      country?: string | null;
    };

    const unified: RawAcct[] = [];

    // Process pending accounts
    pendingAccounts.forEach((a) => {
      if (a.email && emailSchema.validate(a.email).error === undefined) {
        unified.push({
          login: a.login,
          email: a.email,
          firstName: a.firstName ?? "",
          lastName: a.lastName ?? "",
          programName: a.programName,
          country: a.country,
        });
      }
    });

    // Process payout accounts
    payoutAccounts.forEach((p) => {
      if (p.email && emailSchema.validate(p.email).error === undefined) {
        const [firstName, ...rest] = p.fullName.split(" ");
        unified.push({
          login: p.login,
          email: p.email,
          firstName,
          lastName: rest.join(" "),
          programName: p.state,
          country: null,
        });
      }
    });

    // Group by email
    const accountsByEmail = unified.reduce((map, acct) => {
      if (!map[acct.email]) map[acct.email] = [];
      map[acct.email].push(acct);
      return map;
    }, {} as Record<string, RawAcct[]>);

    let count = 0;
    for (const [email, accts] of Object.entries(accountsByEmail)) {
      const { firstName, lastName, country } = accts[0];

      const client = await prisma.client.upsert({
        where: { email },
        create: { email, firstName, lastName, country },
        update: { firstName, lastName, country },
      });

      for (const acct of accts) {
        await prisma.account.upsert({
          where: { tradingLogin: acct.login },
          create: {
            tradingLogin: acct.login,
            programName: acct.programName,
            clientId: client.id,
          },
          update: {
            programName: acct.programName,
            clientId: client.id,
          },
        });
      }
      count++;
    }

    return count;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync error:`, error);
    throw error;
  }
}

// Mount client router
router.use(clientRouter.routes()).use(clientRouter.allowedMethods());

// Secure YPFirm login route
router.post("/api/ypfirm-login", async (ctx: Context) => {
  try {
    const response = await fetch(process.env.YPFIRM_API as string, {
      method: "POST",
      headers: {
        "x-api-key": process.env.YPFIRM_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: process.env.DEV_EMAIL,
        password: process.env.DEV_PASSWORD,
      }),
    });

    if (!response.ok) {
      ctx.status = response.status;
      ctx.body = { error: "Failed to login to YPFirm API" };
      return;
    }

    ctx.body = await response.json();
  } catch (error) {
    console.error("YPFirm login error:", error);
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

export default router;