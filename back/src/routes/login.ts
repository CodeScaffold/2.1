import Koa from "koa";
import Router from "@koa/router";
import bcrypt from "bcrypt";
import { prisma } from "../database";

const router = new Router();

console.log('🔍 Setting up login routes...');

// Add debugging middleware
router.use(async (ctx: Koa.Context, next: Function) => {
    console.log(`🔑 Login router: ${ctx.method} ${ctx.path}`);
    console.log(`🔑 Session exists:`, !!ctx.session);
    console.log(`🔑 Request headers:`, ctx.headers);
    await next();
});

router.post("/login", async (ctx: Koa.Context) => {
    console.log('🔑 Login route hit!', ctx.method, ctx.path);

    try {
        // Log raw request body for debugging
        console.log('🔑 Raw request body:', ctx.request.body);
        console.log('🔑 Request body type:', typeof ctx.request.body);

        const { email, password } = ctx.request.body || {};

        console.log('🔑 Extracted email:', email);
        console.log('🔑 Extracted password length:', password ? password.length : 'undefined');

        if (!email || !password) {
            console.log('❌ Missing email or password');
            ctx.status = 400;
            ctx.body = { message: "Email and password are required" };
            return;
        }

        console.log('🔍 Looking up user:', email);

        // Test database connection first
        try {
            await prisma.$connect();
            console.log('✅ Database connection successful');
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError);
            ctx.status = 500;
            ctx.body = { message: "Database connection failed" };
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log('❌ User not found');
            ctx.status = 401;
            ctx.body = { message: "Invalid credentials" };
            return;
        }

        console.log('✅ User found:', user.email);
        console.log('🔍 Checking password...');

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('❌ Invalid password');
            ctx.status = 401;
            ctx.body = { message: "Invalid credentials" };
            return;
        }

        console.log('✅ Password valid');
        console.log('🔑 Creating session...');

        // Check if session is available
        if (!ctx.session) {
            console.error('❌ Session not available');
            ctx.status = 500;
            ctx.body = { message: "Session not available" };
            return;
        }

        const agentName = user.email.split('@')[0];
        ctx.session.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            agentName,
        };

        console.log('✅ Session created:', ctx.session.user);

        ctx.status = 200;
        ctx.body = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                agentName: user.email.split("@")[0],
            }
        };

        console.log('✅ Login successful response sent');
    } catch (error: any) {
        console.error('❌ Login error:', error);
        console.error('❌ Error stack:', error.stack);
        ctx.status = 500;
        ctx.body = { message: "Login failed", error: error.message };
    }
});

router.get("/me", async (ctx: Koa.Context) => {
    console.log('🔑 Me route hit!');
    console.log('🔑 Session user:', ctx.session?.user);

    if (!ctx.session?.user) {
        console.log('❌ No session user found');
        ctx.status = 401;
        ctx.body = { message: "Not authenticated" };
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: ctx.session.user.id }
        });

        if (!user) {
            console.log('❌ User not found in database');
            ctx.status = 404;
            ctx.body = { message: "User not found" };
            return;
        }

        console.log('✅ User found, returning data');
        ctx.body = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                agentName: user.email.split("@")[0],
            }
        };
    } catch (error) {
        console.error('❌ Me route error:', error);
        ctx.status = 500;
        ctx.body = { message: "Failed to get user info" };
    }
});

router.post("/logout", async (ctx: Koa.Context) => {
    console.log('🔑 Logout route hit!');
    try {
        ctx.session = null;
        ctx.body = { message: "Logged out" };
        console.log('✅ Logout successful');
    } catch (error) {
        console.error('❌ Logout error:', error);
        ctx.status = 500;
        ctx.body = { message: "Logout failed" };
    }
});

console.log('✅ Login routes configured');
export default router;