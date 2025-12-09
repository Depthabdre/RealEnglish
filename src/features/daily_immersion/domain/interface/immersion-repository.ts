import { ImmersionShort } from '../entities/immersion-short';

export interface ImmersionRepository {
    /**
     * Fetches a randomized list of shorts based on category and user history.
     * Should exclude videos the user has recently watched to keep the feed fresh.
     */
    getPersonalizedFeed(
        userId: string,
        category: string, // e.g., 'funny', 'real_life', or 'mix'
        limit: number
    ): Promise<ImmersionShort[]>;

    /**
     * Saves a batch of new videos found by the Harvester.
     * Should handle "Upsert" (ignore if youtubeId already exists).
     */
    saveBatch(shorts: ImmersionShort[]): Promise<void>;

    /**
     * Checks if a YouTube video ID already exists in our DB.
     * Used by the Harvester to avoid processing duplicates.
     */
    existsByYoutubeId(youtubeId: string): Promise<boolean>;

    /**
     * Marks a specific short as watched by the user.
     */
    markAsWatched(userId: string, shortId: string): Promise<void>;

    /**
     * Toggles the "Saved/Favorite" status for a user.
     * Returns the new state (true = saved, false = unsaved).
     */
    toggleSave(userId: string, shortId: string): Promise<boolean>;

    /**
     * Retrieves a list of videos the user has explicitly saved.
     */
    getSavedShorts(userId: string): Promise<ImmersionShort[]>;
}