import { StorySegment } from './story-segment';

export class StoryTrail {
    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly description: string,
        public readonly imageUrl: string,
        public readonly difficultyLevel: number,
        public readonly segments: StorySegment[]
    ) { }
}