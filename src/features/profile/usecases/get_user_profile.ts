// src/feature/profile/use-cases/get_user_profile.ts

import { ProfileRepository } from '../domain/interfaces/profile_repository';
import { UserProfile } from '../domain/entities/user_profile';

export class GetUserProfile {
    constructor(private readonly repository: ProfileRepository) { }

    async execute(userId: string): Promise<UserProfile> {
        const rawUser = await this.repository.getUserWithStats(userId);

        if (!rawUser) {
            throw new Error('User not found'); // Handled by Controller
        }

        // --- 1. CALCULATE TREE GROWTH ---
        // Formula: Story = 10 pts, Short = 1 pt
        const storyPoints = rawUser._count.completedStories * 10;
        const shortPoints = rawUser._count.watchedShorts * 1;
        const totalPoints = storyPoints + shortPoints;

        // Determine Stage (The UI maps these strings to images)
        let treeStage = 'seed';
        if (totalPoints >= 20) treeStage = 'sprout';
        if (totalPoints >= 100) treeStage = 'sapling';
        if (totalPoints >= 300) treeStage = 'young_tree';
        if (totalPoints >= 600) treeStage = 'majestic_tree';

        // --- 2. CHECK STREAK STATUS ---
        // Normalize dates to YYYY-MM-DD to ignore time
        const today = new Date().toISOString().split('T')[0];
        const lastActive = rawUser.lastActiveDate.toISOString().split('T')[0];

        // If lastActive is today, the streak is "safe" (Active)
        // If lastActive was yesterday, streak is safe but needs action today.
        // For UI purposes: "Is Streak Active" usually means "Did I practice TODAY?"
        const isStreakActive = (today === lastActive);

        // --- 3. RETURN DOMAIN ENTITY ---
        return new UserProfile(
            rawUser.id,
            {
                fullName: rawUser.fullName,
                avatarUrl: rawUser.avatarUrl || 'default_avatar',
                joinedAt: rawUser.createdAt
            },
            {
                currentStreak: rawUser.currentStreak,
                isStreakActive: isStreakActive,
                lastActiveDate: rawUser.lastActiveDate
            },
            {
                treeStage: treeStage,
                totalPoints: totalPoints,
                stats: {
                    storiesCompleted: rawUser._count.completedStories,
                    shortsWatched: rawUser._count.watchedShorts
                }
            }
        );
    }
}