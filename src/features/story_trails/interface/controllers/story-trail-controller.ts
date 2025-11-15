import { Response } from 'express';
import { DIContainer } from '../../../../di_container';
import { AuthenticatedRequest } from '../../../authentication/interface/middleware/auth_middleware'; // Adjust this path if necessary

export class StoryTrailController {
    // The controller asks the DIContainer for the fully constructed use cases it needs.
    private readonly getNextStoryTrailUseCase = DIContainer.getGetNextStoryTrailUseCase();
    private readonly getStoryTrailByIdUseCase = DIContainer.getGetStoryTrailByIdUseCase();
    private readonly markStoryTrailCompletedUseCase = DIContainer.getMarkStoryTrailCompletedUseCase();
    private readonly getAudioForSegmentUseCase = DIContainer.getGetAudioForSegmentUseCase();

    /**
     * Handles: GET /story-trails/level/{level}/next
     * Fetches the next uncompleted story for the authenticated user's level.
     */
    public getNextStoryTrailForLevel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            // The userId is guaranteed to be present by the auth middleware.
            const userId = req.user!.id;
            const level = parseInt(req.params.level, 10);

            if (isNaN(level)) {
                res.status(400).json({ error: 'A valid level number is required in the URL.' });
                return;
            }

            // Delegate the complex logic to the use case.
            const storyTrail = await this.getNextStoryTrailUseCase.execute({ level, userId });

            // Format the response based on the use case's result.
            if (storyTrail) {
                // 200 OK: A story was found and is returned.
                res.status(200).json(storyTrail);
            } else {
                // 204 No Content: The user has completed all stories for this level.
                res.status(204).send();
            }
        } catch (error: any) {
            console.error('Error in getNextStoryTrailForLevel:', error);
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    }

    /**
     * Handles: GET /story-trails/{trailId}
     * Fetches a single story trail by its unique ID.
     */
    public getStoryTrailById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { trailId } = req.params;
            const storyTrail = await this.getStoryTrailByIdUseCase.execute({ trailId });

            if (storyTrail) {
                // 200 OK: The story was found.
                res.status(200).json(storyTrail);
            } else {
                // 404 Not Found: No story with that ID exists.
                res.status(404).json({ error: 'Story trail not found.' });
            }
        } catch (error: any) {
            console.error('Error in getStoryTrailById:', error);
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    }

    /**
     * Handles: POST /user-progress/story-trails/{trailId}/complete
     * Marks a story trail as completed for the authenticated user.
     */
    public markStoryTrailAsCompleted = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { trailId } = req.params;

            const completionStatus = await this.markStoryTrailCompletedUseCase.execute({ userId, trailId });

            // 200 OK: The progress was saved successfully.
            res.status(200).json(completionStatus);
        } catch (error: any) {
             // Handle specific, known errors gracefully.
            if (error.message.includes('not found')) {
                res.status(404).json({ error: 'User or StoryTrail not found.' });
            } else {
                console.error('Error in markStoryTrailAsCompleted:', error);
                res.status(500).json({ error: 'An internal server error occurred.' });
            }
        }
    }
    
    /**
     * Handles: GET /story-trails/segments/{segmentId}/audio
     * Generates and streams audio for a specific story segment.
     */
    public getSegmentAudio = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { segmentId } = req.params;
            const audioBuffer = await this.getAudioForSegmentUseCase.execute({ segmentId });

            // Set the correct HTTP headers for the audio response.
            res.set('Content-Type', 'audio/mpeg');
            
            // Send the raw audio data buffer back to the client.
            res.status(200).send(audioBuffer);
        } catch (error: any) {
            console.error('Error in getSegmentAudio:', error);
            res.status(404).json({ error: 'Audio content for this segment could not be found or generated.' });
        }
    }
}

