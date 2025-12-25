import { Router } from 'express';
import multer from 'multer'; // <--- 1. Import Multer
import { ProfileController } from '../controllers/profile_controller';
import { authMiddleware } from '../../../authentication/interface/middleware/auth_middleware';

// 2. Configure Multer (Ram Storage)
const upload = multer({ storage: multer.memoryStorage() });

const profileRouter = Router();
const controller = new ProfileController();

// GET /api/profile/me
profileRouter.get(
    '/me',
    authMiddleware,
    controller.getMe
);

// PATCH /api/profile/me
profileRouter.patch(
    '/me',
    authMiddleware,
    // 👇👇👇 THIS LINE IS CRITICAL 👇👇👇
    upload.single('avatar'),
    // 👆👆👆 IT MUST BE HERE 👆👆👆
    controller.updateMe
);

export default profileRouter;