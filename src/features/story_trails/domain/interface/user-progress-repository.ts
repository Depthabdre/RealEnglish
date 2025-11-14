export interface UserProgressRepository {
    /**
     * Marks a story trail as completed for a given user.
     * Returns true if the story was not previously completed, false otherwise.
     */
    markStoryAsCompleted(userId: string, trailId: string): Promise<boolean>;

    /**
     * Counts the number of completed stories for a user at a specific level.
     */
    getCompletedStoryCountForLevel(userId: string, level: number): Promise<number>;
}