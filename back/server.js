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

// Serve the high_impact_news.json file via an API endpoint
router.get('/api/news', async (ctx) => {
    try {
        const filePath = path.join(__dirname, 'high_impact_news.json');
        const data = await fs.readFile(filePath, 'utf8');
        ctx.type = 'application/json';
        ctx.body = JSON.parse(data);
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: 'Failed to load the high-impact news data' };
    }
});

// Add routes and middleware
app.use(router.routes()).use(router.allowedMethods());

// Serve static files if needed
app.use(koaStatic(path.join(__dirname, 'public')));

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Koa server is running at http://localhost:${PORT}`);
});
