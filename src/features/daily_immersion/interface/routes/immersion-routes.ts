import { Router } from 'express';
import { ImmersionController } from '../controllers/immersion-controller';
import { authMiddleware } from '../../../authentication/interface/middleware/auth_middleware';

const immersionRouter = Router();
const controller = new ImmersionController();

// --- FEED ROUTES ---

// GET /api/daily-immersion/feed?category=funny
immersionRouter.get(
    '/feed',
    authMiddleware,
    controller.getFeed
);

// GET /api/daily-immersion/saved
// (Must come before /:shortId routes to avoid conflict)
immersionRouter.get(
    '/saved',
    authMiddleware,
    controller.getSavedLibrary
);

// --- INTERACTION ROUTES ---

// POST /api/daily-immersion/{shortId}/save
immersionRouter.post(
    '/:shortId/save',
    authMiddleware,
    controller.toggleSaveVideo
);

// POST /api/daily-immersion/{shortId}/watch
immersionRouter.post(
    '/:shortId/watch',
    authMiddleware,
    controller.markVideoAsWatched
);

// --- ADMIN / DEV ROUTES ---

// POST /api/daily-immersion/harvest
// (In production, you might want to add an admin check middleware here)
immersionRouter.post(
    '/harvest',
    authMiddleware,
    controller.triggerManualHarvest
);

export default immersionRouter;