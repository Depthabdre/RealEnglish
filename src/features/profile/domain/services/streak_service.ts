import { ProfileRepository } from '../interfaces/profile_repository';

export class StreakService {
    constructor(private readonly profileRepository: ProfileRepository) { }

    /**
     * This is called whenever a user finishes a learning activity.
     */
    async updateStreak(userId: string): Promise<void> {
        // 1. Get current data
        const user = await this.profileRepository.getUserWithStats(userId);
        if (!user) return;

        const now = new Date();
        const lastActive = new Date(user.lastActiveDate);

        // 2. Normalize to "YYYY-MM-DD" strings to ignore hours/minutes
        const todayStr = now.toISOString().split('T')[0];
        const lastActiveStr = lastActive.toISOString().split('T')[0];

        // Calculate "Yesterday"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // 3. The Logic
        let newStreak = user.currentStreak;

        // SCENARIO A: Already practiced today?
        if (todayStr === lastActiveStr) {
            // Do nothing to the streak count, just update timestamp
            // (We update timestamp so we know the EXACT time they practiced)
            await this.profileRepository.updateStreak(userId, newStreak, now);
            return;
        }

        // SCENARIO B: Practiced yesterday? (Consecutive day)
        if (lastActiveStr === yesterdayStr) {
            newStreak = user.currentStreak + 1;
        }
        // SCENARIO C: Missed a day (or more)?
        else {
            newStreak = 1; // Reset to 1 (because they did it today)
        }

        // 4. Save to DB
        await this.profileRepository.updateStreak(userId, newStreak, now);
    }
}