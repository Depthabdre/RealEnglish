import { SingleChoiceChallenge } from './single-choice-challenge';

export class StorySegment {
    constructor(
        public readonly id: string,
        public readonly type: string,
        public readonly textContent: string,
        public readonly imageUrl: string | null,
        // --- ADD THIS LINE ---
        public readonly audioUrl: string | null,
        // --------------------
        public readonly challenge: SingleChoiceChallenge | null
    ) { }
}