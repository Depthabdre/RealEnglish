import { UserProgressRepository } from '../domain/interface/user-progress-repository';
import { StoryTrailRepository } from '../domain/interface/story-trail-repository';
import { UserRepository } from '../domain/interface/user-repository';
// 1. IMPORT THE SERVICE
import { StreakService } from '../../profile/domain/services/streak_service';

const STORIES_REQUIRED_FOR_LEVEL_UP = 1;

export interface MarkStoryTrailCompletedInput {
    userId: string;
    trailId: string;
}

export interface LevelCompletionStatus {
    didLevelUp: boolean;
    newLevel: number;
}

export class MarkStoryTrailCompletedUseCase {
    constructor(
        private readonly userProgressRepository: UserProgressRepository,
        private readonly userRepository: UserRepository,
        private readonly storyTrailRepository: StoryTrailRepository,
        // 2. INJECT THE SERVICE
        private readonly streakService: StreakService
    ) { }

    async execute(input: MarkStoryTrailCompletedInput): Promise<LevelCompletionStatus> {
        const { userId, trailId } = input;

        const [user, story] = await Promise.all([
            this.userRepository.findById(userId),
            this.storyTrailRepository.findById(trailId)
        ]);

        if (!user || !story) {
            throw new Error('User or StoryTrail not found.');
        }

        // Mark the story as completed.
        const wasJustCompleted = await this.userProgressRepository.markStoryAsCompleted(userId, trailId);

        // 3. UPDATE STREAK
        // We do this regardless of whether they "just" completed it or are re-playing it.
        // Practice is practice.
        await this.streakService.updateStreak(userId);

        // If the user had already completed this story previously, 
        // they get the streak point (above), but no new level calculation.
        if (!wasJustCompleted) {
            return { didLevelUp: false, newLevel: user.level };
        }

        // Check if the user is eligible for a level up
        if (user.level === story.difficultyLevel) {
            const completedCount = await this.userProgressRepository.getCompletedStoryCountForLevel(userId, user.level);

            if (completedCount >= STORIES_REQUIRED_FOR_LEVEL_UP) {
                const newLevel = user.level + 1;
                await this.userRepository.updateLevel(userId, newLevel);
                return { didLevelUp: true, newLevel: newLevel };
            }
        }

        return { didLevelUp: false, newLevel: user.level };
    }
}