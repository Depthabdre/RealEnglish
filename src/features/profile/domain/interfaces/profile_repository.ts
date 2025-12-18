// src/feature/profile/domain/interfaces/profile_repository.ts

import { UserProfile } from '../entities/user_profile';

// Helper type for the raw return from Prisma before we format it
export interface RawUserStats {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    currentStreak: number;
    lastActiveDate: Date;
    createdAt: Date;
    _count: {
        completedStories: number;
        watchedShorts: number;
    };
}

export interface ProfileRepository {
    /**
     * Fetches user details along with the count of stories and shorts
     * to calculate the "Tree Stage".
     */
    getUserWithStats(userId: string): Promise<RawUserStats | null>;

    /**
     * Updates the user's basic identity information.
     */
    updateIdentity(userId: string, fullName?: string, avatarUrl?: string): Promise<void>;

    updateStreak(userId: string, newStreak: number, lastActiveDate: Date): Promise<void>;
}