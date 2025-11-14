import { StoryTrail } from '../domain/entities/story-trail';
import { StoryGenerationService } from '../domain/interface/ai-services';
import { StoryTrailRepository } from '../domain/interface/story-trail-repository';

export interface GetNextStoryTrailInput {
    level: number;
    userId: string;
}

export class GetNextStoryTrailUseCase {
    constructor(
        private readonly storyTrailRepository: StoryTrailRepository,
        private readonly storyGenerationService: StoryGenerationService
    ) { }

    async execute(input: GetNextStoryTrailInput): Promise<StoryTrail | null> {
        // 1. Try to find an existing, uncompleted story from the database first.
        const existingTrail = await this.storyTrailRepository.findNextIncompleteByLevel(input.level, input.userId);

        if (existingTrail) {
            return existingTrail;
        }

        // 2. If no story is found, generate a brand new one using the AI service.
        const newTrail = await this.storyGenerationService.generateStoryForLevel(input.level);

        // 3. Save the newly generated story to the database for future use.
        await this.storyTrailRepository.save(newTrail);

        // 4. Return the new story to the user.
        return newTrail;
    }
}