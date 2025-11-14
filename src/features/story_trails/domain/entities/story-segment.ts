import { SingleChoiceChallenge } from './single-choice-challenge';

export type SegmentType = 'narration' | 'choiceChallenge';

export class StorySegment {
    constructor(
        public readonly id: string,
        public readonly type: SegmentType,
        public readonly textContent: string, // Text for challenges, or the source text for narration audio
        public readonly imageUrl?: string | null,
        public readonly audioEndpoint?: string | null, // For narration segments
        public readonly challenge?: SingleChoiceChallenge | null
    ) { }
}