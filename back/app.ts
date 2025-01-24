import Koa from 'koa';
import cors from '@koa/cors';
import koaBody from 'koa-body';
import serve from 'koa-static';
import path from 'path';
import bodyParser from "koa-bodyparser";
import passport from 'koa-passport';
import dotenv from 'dotenv';
import setupPassport from './src/auth/passport';
import routes from './src/routes';


dotenv.config();

const app = new Koa();

// Serve static files from the 'public' directory
app.use(serve(path.join(__dirname, 'public')));

// Setup passport authentication
setupPassport(app);
app.use(passport.initialize());

// Handle file uploads, JSON, and form data
app.use(
    koaBody({
        multipart: true,
        json: true,
        formidable: {
            maxFileSize: 100 * 1024 * 1024, // 100MB file size limit
        },
    }),
);

app.use(bodyParser()); // Parse JSON and URL-encoded data

// Enable CORS for cross-origin requests
app.use(cors());

// Import application routes
app.use(routes);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});