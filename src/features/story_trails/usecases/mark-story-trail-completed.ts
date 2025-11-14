import { UserProgressRepository } from '../domain/interface/user-progress-repository';
import { StoryTrailRepository } from '../domain/interface/story-trail-repository';
import { UserRepository } from '../domain/interface/user-repository';

// We'll define a constant for how many stories are needed to level up.
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
        private readonly storyTrailRepository: StoryTrailRepository
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

        // Mark the story as completed. This returns true if it's the first time.
        const wasJustCompleted = await this.userProgressRepository.markStoryAsCompleted(userId, trailId);

        // If the user had already completed this story, no need to check for level up.
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

        // Otherwise, no level up occurred.
        return { didLevelUp: false, newLevel: user.level };
    }
}