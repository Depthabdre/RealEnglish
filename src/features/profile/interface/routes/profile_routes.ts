import { Router } from 'express';
import { ProfileController } from '../controllers/profile_controller';
import { authMiddleware } from '../../../authentication/interface/middleware/auth_middleware';

const profileRouter = Router();
const controller = new ProfileController();

// --- PROFILE ROUTES ---

// GET /api/profile/me
// Loads the "Garden" (Tree stage, stats, streak)
profileRouter.get(
    '/me',
    authMiddleware,
    controller.getMe
);

// PATCH /api/profile/me
// Updates Name or Avatar
profileRouter.patch(
    '/me',
    authMiddleware,
    controller.updateMe
);

export default profileRouter;