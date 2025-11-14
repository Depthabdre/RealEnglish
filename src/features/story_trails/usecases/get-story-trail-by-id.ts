import { StoryTrail } from '../domain/entities/story-trail';
import { StoryTrailRepository } from '../domain/interface/story-trail-repository';

export interface GetStoryTrailByIdInput {
    trailId: string;
}

export class GetStoryTrailByIdUseCase {
    constructor(private readonly storyTrailRepository: StoryTrailRepository) { }

    async execute(input: GetStoryTrailByIdInput): Promise<StoryTrail | null> {
        return this.storyTrailRepository.findById(input.trailId);
    }
}