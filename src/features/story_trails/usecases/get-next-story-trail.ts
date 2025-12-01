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
        // Normalize Level: If frontend sends 0, treat as 1.
        const level = input.level < 1 ? 1 : input.level;

        // 1. Try to find an existing, uncompleted story
        const existingTrail = await this.storyTrailRepository.findNextIncompleteByLevel(level, input.userId);

        if (existingTrail) {
            console.log("♻️ Returning existing story from Database.");
            return existingTrail;
        }

        // 2. Generate new story via AI
        console.log("🤖 Generating NEW story via AI...");
        const newTrail = await this.storyGenerationService.generateStoryForLevel(level);

        // 3. Save to DB
        console.log("💾 Saving new story to Database...");
        await this.storyTrailRepository.save(newTrail);

        return newTrail;
    }
}