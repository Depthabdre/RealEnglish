// IMPORTANT: This must be the very first line to load our .env file
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
// --- Import Authentication Routes ---
import authRouter from './features/authentication/interface/routes/auth_routes';

// --- Import Story Trails Routes (NEW) ---
import storyTrailRouter from './features/story_trails/interface/routes/story-trails.routes';
import userProgressRouter from './features/story_trails/interface/routes/user-progress.routes';

const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
// Mount our authentication routes under the `/api/auth` prefix
app.use('/api/auth', authRouter);

// --- Mount Story Trails Routes (NEW) ---
// Mount the story trail routes under the `/api/story-trails` prefix
app.use('/api/story-trails', storyTrailRouter);

// Mount the user progress routes under the `/api/user-progress` prefix
app.use('/api/user-progress', userProgressRouter);


// A simple root route to check if the server is up
app.get('/', (req, res) => {
    res.send('RealEnglish API Server is running!');
});

// --- Start the Server ---
app.listen(3000, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});