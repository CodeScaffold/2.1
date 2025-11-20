import Koa from "koa";
import cors from "@koa/cors";
import koaBody from "koa-body";
import serve from "koa-static";
import path from "path";
import bodyParser from "koa-bodyparser";
import dotenv from "dotenv";
import cron from "node-cron";
import helmet from "koa-helmet";
import ratelimit from "koa-ratelimit";
import { updateData } from "./data/update_time_format";
import protectedRoutes, { syncPendingAccountsToClients } from "./routes/routes";
import loginRoutes from "./routes/login";
import { prisma } from "./database";
import { savePendingAccounts, savePrograms } from "./data/getPendingYpFirm";
import { fetchAllPayouts } from "./data/getPayout";
import session from 'koa-session';
import type { Context } from "koa";

dotenv.config();

const app = new Koa();

app.proxy = true;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const globalLimiter = ratelimit({
  driver: 'memory',
  db: new Map(),
  duration: 60000, // 1 minute
  errorMessage: 'Too many requests, please try again later',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 100 // requests per minute
});

// Stricter rate limiting for auth endpoints
const authLimiter = ratelimit({
  driver: 'memory',
  db: new Map(),
  duration: 300000, // 5 minutes
  errorMessage: 'Too many authentication attempts, please try again later',
  id: (ctx) => ctx.ip,
  max: 10 // auth attempts per 5 minutes
});

// CORS configuration
app.use(cors({
  origin: "https://backoffice.opofinance.com",
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

// Handle preflight requests
app.use(async (ctx, next) => {
  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
    return;
  }
  await next();
});

if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET environment variable is required!');
  process.exit(1);
}

app.keys = [process.env.SESSION_SECRET];

app.use(session({
  key: 'auth-session',
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // only enforce secure cookies in production
  sameSite: 'none', // Use 'none' for cross-site cookie sharing
}, app));

// Apply rate limiting
app.use(globalLimiter);

// Body parsing with size limits
app.use(
    koaBody({
      multipart: true,
      json: true,
      formidable: {
        maxFileSize: 10 * 1024 * 1024, // Reduced to 10MB
        maxFieldsSize: 2 * 1024 * 1024, // 2MB for form fields
      },
      jsonLimit: '1mb',
      formLimit: '56kb',
      textLimit: '56kb'
    }),
);

// Static file serving (consider moving to CDN in production)
app.use(serve(path.join(__dirname, "public")));

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    ctx.status = err.status || 500;

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      ctx.body = {
        error: ctx.status === 500 ? 'Internal Server Error' : err.message
      };
    } else {
      ctx.body = {
        error: err.message,
        stack: err.stack
      };
    }

    // Log error for monitoring
    console.error(`[${new Date().toISOString()}] Error:`, {
      message: err.message,
      status: ctx.status,
      url: ctx.url,
      method: ctx.method,
      ip: ctx.ip,
      userAgent: ctx.header['user-agent'],
      stack: err.stack // Add stack trace for debugging
    });
  }
});

// Health check endpoint (public)
app.use(async (ctx, next) => {
  if (ctx.path === '/health' && ctx.method === 'GET') {
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.9'
    };
    return;
  }
  await next();
});

// Authentication endpoints (public with stricter rate limiting)
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/auth/') || ctx.path === '/login') {
    return authLimiter(ctx, next);
  }
  await next();
});

// Add login routes BEFORE the authentication middleware
app.use(loginRoutes.routes());
app.use(loginRoutes.allowedMethods());

// Authentication middleware for protected routes
app.use(async (ctx, next) => {
  const publicPaths = ['/health', '/login', '/logout']; // FIXED: Added /me back

  if (publicPaths.includes(ctx.path)) {
    return next();
  }
  if (ctx.path === '/me') {
    return next();
  }
  // Check if user is logged in via session
  if (!ctx.session?.user) {
    ctx.status = 401;
    ctx.body = { error: 'Not authenticated' };
    return;
  }

  // Add user to context for routes to use
  ctx.state.user = ctx.session.user;
  await next();
});

// Protected routes
app.use(protectedRoutes.routes());

// ALL YOUR CRON JOBS STAY EXACTLY THE SAME
if (process.env.ENABLE_CRON !== 'false') {
  // Forex news update every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Running Forex news update...`);
    try {
      await updateData();
      console.log(`[${new Date().toISOString()}] News update completed.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] News update error:`, error);
    }
  });

  // Program list refresh every 12 hours
  cron.schedule("0 0 */12 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Refreshing program list...`);
    try {
      await savePrograms();
      console.log(`[${new Date().toISOString()}] Program list refreshed.`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Programs refresh error:`, err);
    }
  });

  // Pending accounts save every 10 minutes
  cron.schedule("0 */10 * * * *", async () => {
    try {
      await savePendingAccounts();
      console.log(`[${new Date().toISOString()}] Pending accounts save completed.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Pending accounts save error:`, error);
    }
  });

  // Payout sync every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Running payout sync...`);
    try {
      const allPayouts = await fetchAllPayouts();
      console.log(`[${new Date().toISOString()}] Fetched ${allPayouts.length} payouts`);

      for (const payout of allPayouts) {
        try {
          const existing = await prisma.payout.findUnique({
            where: { id: payout.id },
          });

          if (!existing) {
            await prisma.payout.create({
              data: {
                id: payout.id,
                userId: payout.userId,
                createdAt: new Date(payout.createdAt),
                fullName: payout.fullName,
                email: payout.email,
                accountId: payout.accountId,
                login: payout.login,
                amount: payout.amount,
                transferAmount: payout.transferAmount,
                profitSplit: payout.profitSplit,
                payoutDetails: payout.payoutDetails,
                state: payout.state,
                rejectionReason: payout.rejectionReason ?? null,
              },
            });
          }
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Failed to save payout ${payout.id}:`, err);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Payout sync error:`, error);
    }
  });

  // Client sync every hour
  cron.schedule('0 0 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running sync-pending-accounts cron...`);
    try {
      const count = await syncPendingAccountsToClients();
      console.log(`[${new Date().toISOString()}] Synced ${count} pending accounts to clients.`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error syncing pending accounts:`, err);
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;