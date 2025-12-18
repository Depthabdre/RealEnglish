// src/feature/profile/domain/entities/user_profile.ts

export class UserProfile {
    constructor(
        public readonly id: string,

        // 1. Identity: Who they are
        public readonly identity: {
            readonly fullName: string;
            readonly avatarUrl: string;
            readonly joinedAt: Date;
        },

        // 2. Habit: The "Watering" Schedule
        public readonly habit: {
            readonly currentStreak: number;
            // True if they have already practiced TODAY
            readonly isStreakActive: boolean;
            readonly lastActiveDate: Date;
        },

        // 3. Growth: The "Tree" Visualization
        public readonly growth: {
            // "seed" | "sprout" | "sapling" | "young_tree" | "majestic_tree"
            readonly treeStage: string;
            readonly totalPoints: number;
            readonly stats: {
                readonly storiesCompleted: number;
                readonly shortsWatched: number;
            };
        }
    ) { }
}