
import Koa from 'koa';
import Router from '@koa/router';
import koaStatic from 'koa-static';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from '@koa/cors';
import fs from 'fs/promises';

const app = new Koa();
const router = new Router();

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS
app.use(cors());

// Define contractSizes
const contractSizes = {
    "XAUUSD": 100,
    "USDJPY": 100000,
    "DJIUSD": 1,
    "NDXUSD": 1
    // Add more pairs as needed
};

// Serve the high_impact_news.json file via an API endpoint
router.get('/api/news', async (ctx) => {
    try {
        const filePath = path.join(__dirname, 'high_impact_news.json');
        const data = await fs.readFile(filePath, 'utf8');
        ctx.type = 'application/json';
        ctx.body = JSON.parse(data);
    } catch (error) {
        console.error('Error reading high_impact_news.json:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to load the high-impact news data' };
    }
});

// Serve the contractSizes via an API endpoint
router.get('/api/contract-sizes', (ctx) => {
    ctx.type = 'application/json';
    ctx.body = contractSizes;
});

// Add routes and middleware
app.use(router.routes()).use(router.allowedMethods());

// Serve static files if needed
app.use(koaStatic(path.join(__dirname, 'public')));

// Define PORT
const PORT = 3001;

// Start the server
app.listen(PORT, () => {
    console.log(`Koa server is running at http://localhost:${PORT}`);
});
