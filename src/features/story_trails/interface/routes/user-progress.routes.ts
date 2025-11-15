import { Router } from 'express';
import { StoryTrailController } from '../controllers/story-trail-controller';
import { authMiddleware } from '../../../authentication/interface/middleware/auth_middleware'; // Adjust this path if necessary

// Create a new router instance for user progress related endpoints
const userProgressRouter = Router();

// We still use the StoryTrailController because it contains the relevant method
const controller = new StoryTrailController();

/**
 * @route   POST /api/user-progress/story-trails/{trailId}/complete
 * @desc    Marks a story trail as completed for the authenticated user.
 * @access  Private (Requires authentication)
 */
userProgressRouter.post(
    '/story-trails/:trailId/complete',
    authMiddleware, // First, verify the user's JWT token
    controller.markStoryTrailAsCompleted // If the token is valid, proceed to the controller logic
);

export default userProgressRouter;