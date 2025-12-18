import { Response } from 'express';
import { DIContainer } from '../../../../di_container';
import { AuthenticatedRequest } from '../../../authentication/interface/middleware/auth_middleware';

export class ProfileController {
    // Inject Use Cases via DI Container
    private readonly getProfileUseCase = DIContainer.getGetUserProfileUseCase();
    private readonly updateProfileUseCase = DIContainer.getUpdateProfileIdentityUseCase();

    /**
     * Handles: GET /api/profile/me
     * Returns the full Garden/Tree state, Streak, and Identity.
     */
    public getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;

            const profile = await this.getProfileUseCase.execute(userId);

            res.status(200).json({
                status: 'success',
                data: profile
            });

        } catch (error: any) {
            console.error('Error in getMe:', error);
            if (error.message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.status(500).json({ error: 'Failed to load profile.' });
        }
    }

    /**
     * Handles: PATCH /api/profile/me
     * Body: { "fullName": "New Name", "avatarUrl": "hero_2.png" }
     * Allows updating name or avatar (identity).
     */
    public updateMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { fullName, avatarUrl } = req.body;

            await this.updateProfileUseCase.execute({
                userId,
                fullName,
                avatarUrl
            });

            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully'
            });

        } catch (error: any) {
            console.error('Error in updateMe:', error);
            res.status(500).json({ error: 'Failed to update profile.' });
        }
    }
}