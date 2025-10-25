// IMPORTANT: This must be the very first line to load our .env file
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
// Import the fully composed router
import authRouter from './features/authentication/interface/routes/auth_routes';

const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
// Mount our authentication routes under the `/api/auth` prefix
app.use('/api/auth', authRouter);

// A simple root route to check if the server is up
app.get('/', (req, res) => {
    res.send('RealEnglish API Server is running!');
});

// --- Start the Server ---
app.listen(3000, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});