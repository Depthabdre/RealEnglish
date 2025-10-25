import { Request, Response } from 'express';
import { DIContainer } from '../../../../di_container';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middleware/auth_middleware';
export class AuthController {
    // The controller asks the DIContainer for the use cases it needs.
    private readonly signUpUseCase = DIContainer.getSignUpUseCase();
    private readonly signInUseCase = DIContainer.getSignInUseCase();
    private readonly forgotPasswordUseCase = DIContainer.getForgotPasswordUseCase();
    private readonly verifyOtpUseCase = DIContainer.getVerifyOtpUseCase();
    private readonly resetPasswordUseCase = DIContainer.getResetPasswordUseCase();
    private readonly getMeUseCase = DIContainer.getGetMeUseCase();
    private readonly googleSignInUseCase = DIContainer.getGoogleSignInUseCase();

    async signUp(req: Request, res: Response): Promise<void> {
        try {
            const { fullName, email, password } = req.body;
            await this.signUpUseCase.execute({ fullName, email, password });
            res.status(201).json({ message: 'User created successfully.' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // --- UPDATED signIn METHOD ---
    async signIn(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const user = await this.signInUseCase.execute({ email, password });

            const payload = { id: user.id, email: user.email };
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });

            // The response now only contains the user and the essential access token.
            res.status(200).json({
                user: user,
                access_token: accessToken
            });

        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            await this.forgotPasswordUseCase.execute({ email });
            res.status(200).json({ message: 'If a user with that email exists, a password reset OTP has been sent.' });
        } catch (error: any) {
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    }

    async verifyOtp(req: Request, res: Response): Promise<void> {
        try {
            const { email, otpCode } = req.body;
            const otpResult = await this.verifyOtpUseCase.execute({ email, otpCode });

            // Return the response with the key "password_reset_token" to match the Flutter app
            res.status(200).json({ password_reset_token: otpResult.resetToken });

        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { token, newPassword } = req.body;
            await this.resetPasswordUseCase.execute({ token, newPassword });
            res.status(200).json({ message: 'Password has been reset successfully.' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
    async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Because the `authMiddleware` ran successfully, we can be 100% sure
            // that `req.user` exists and contains the user's ID.
            const userId = req.user!.id;

            // Delegate the work to the use case
            const user = await this.getMeUseCase.execute({ userId });

            // Send the user profile back to the Flutter app
            res.status(200).json(user);
        } catch (error: any) {
            // This would happen if the user ID from a valid token somehow doesn't exist in the DB
            res.status(404).json({ error: error.message });
        }
    }
    async googleSignIn(req: Request, res: Response): Promise<void> {
        try {
            const { token: googleToken } = req.body;
            if (!googleToken) {
                throw new Error('Google ID token is required.');
            }

            // 1. The use case handles verification and getting our user profile.
            const user = await this.googleSignInUseCase.execute({ token: googleToken });

            // 2. CRITICAL: Now that we have our user, we issue OUR OWN JWT.
            const payload = { id: user.id, email: user.email };
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });

            // 3. Send the same response format as our normal sign-in.
            res.status(200).json({
                user: user,
                access_token: accessToken,
            });

        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }
}