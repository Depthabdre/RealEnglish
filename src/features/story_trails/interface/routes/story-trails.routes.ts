import { Router } from 'express';
import { StoryTrailController } from '../controllers/story-trail-controller';
import { authMiddleware } from '../../../authentication/interface/middleware/auth_middleware'; // Adjust path if necessary

// Create a new router instance
const storyTrailRouter = Router();

// Instantiate our controller
const controller = new StoryTrailController();

// --- DEFINE THE ROUTES ---
// The path here is relative to where the router will be mounted (e.g., '/api/story-trails')

// GET /api/story-trails/level/{level}/next
storyTrailRouter.get(
    '/level/:level/next',
    authMiddleware, // 1. Run security check
    controller.getNextStoryTrailForLevel // 2. If security passes, run controller logic
);

// GET /api/story-trails/{trailId}
storyTrailRouter.get(
    '/:trailId',
    authMiddleware,
    controller.getStoryTrailById
);

// GET /api/story-trails/segments/{segmentId}/audio
storyTrailRouter.get(
    '/segments/:segmentId/audio',
    authMiddleware,
    controller.getSegmentAudio
);

export default storyTrailRouter;