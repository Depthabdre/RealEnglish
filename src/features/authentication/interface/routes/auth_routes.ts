import { Router } from 'express';
import { AuthController } from '../controllers/auth_controller';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth_middleware';

const authRouter = Router();
// Since the controller now gets its own dependencies from the DI Container,
// we can create it very simply.
const controller = new AuthController();

// Map the HTTP routes to the controller methods
authRouter.post('/signup', (req, res) => controller.signUp(req, res));
authRouter.post('/signin', (req, res) => controller.signIn(req, res));
authRouter.post('/forgot-password', (req, res) => controller.forgotPassword(req, res));
authRouter.post('/verify-otp', (req, res) => controller.verifyOtp(req, res));
authRouter.post('/reset-password', (req, res) => controller.resetPassword(req, res));
authRouter.get('/me', authMiddleware, (req, res) => controller.getMe(req as AuthenticatedRequest, res));
authRouter.post('/google-signin', (req, res) => controller.googleSignIn(req, res));

export default authRouter;