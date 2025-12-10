import { Response } from 'express';
import { DIContainer } from '../../../../di_container';
import { AuthenticatedRequest } from '../../../authentication/interface/middleware/auth_middleware';

export class ImmersionController {
    // Inject Use Cases via DI Container
    private readonly getFeedUseCase = DIContainer.getGetPersonalizedFeedUseCase();
    private readonly toggleSaveUseCase = DIContainer.getToggleSaveVideoUseCase();
    private readonly markWatchedUseCase = DIContainer.getMarkVideoWatchedUseCase();
    private readonly getSavedShortsUseCase = DIContainer.getGetSavedShortsUseCase();
    private readonly harvestUseCase = DIContainer.getHarvestYouTubeShortsUseCase();

    /**
     * Handles: GET /daily-immersion/feed
     * Query Params: ?category=funny&limit=10
     * Fetches the infinite scroll feed.
     */
    public getFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;

            // Extract query params (defaulting if necessary)
            const category = req.query.category as string || 'mix';
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

            const shorts = await this.getFeedUseCase.execute({ userId, category, limit });

            // 200 OK: Always return a list (even if empty, though our lazy harvest prevents empty)
            res.status(200).json(shorts);

        } catch (error: any) {
            console.error('Error in getFeed:', error);
            res.status(500).json({ error: 'Failed to load video feed.' });
        }
    }

    /**
     * Handles: GET /daily-immersion/saved
     * Fetches the list of videos the user has bookmarked.
     */
    public getSavedLibrary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const savedShorts = await this.getSavedShortsUseCase.execute({ userId });

            res.status(200).json(savedShorts);

        } catch (error: any) {
            console.error('Error in getSavedLibrary:', error);
            res.status(500).json({ error: 'Failed to retrieve saved library.' });
        }
    }

    /**
     * Handles: POST /daily-immersion/{shortId}/save
     * Toggles the "saved" status of a video (Like/Unlike).
     */
    public toggleSaveVideo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { shortId } = req.params;

            const result = await this.toggleSaveUseCase.execute({ userId, shortId });

            // 200 OK: Returns { isSaved: true/false }
            res.status(200).json(result);

        } catch (error: any) {
            console.error('Error in toggleSaveVideo:', error);
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    }

    /**
     * Handles: POST /daily-immersion/{shortId}/watch
     * Marks a video as watched (for analytics and feed filtering).
     */
    public markVideoAsWatched = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { shortId } = req.params;

            await this.markWatchedUseCase.execute({ userId, shortId });

            // 200 OK: Action completed successfully (No content needed)
            res.status(200).send();

        } catch (error: any) {
            console.error('Error in markVideoAsWatched:', error);
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    }

    /**
     * Handles: POST /daily-immersion/harvest
     * ADMIN/DEV Route: Triggers the YouTube scraper manually.
     * Body: { "category": "funny" }
     */
    public triggerManualHarvest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const category = req.body.category || 'funny';

            const stats = await this.harvestUseCase.execute({ category });

            res.status(200).json({
                message: 'Harvest completed successfully',
                stats: stats
            });

        } catch (error: any) {
            console.error('Error in triggerManualHarvest:', error);
            res.status(500).json({ error: 'Harvesting failed.' });
        }
    }
}