import { SingleChoiceChallenge } from './single-choice-challenge';

export class StorySegment {
    constructor(
        public readonly id: string,
        // --- ADD THIS ---
        public readonly orderIndex: number,
        // ----------------
        public readonly type: string,
        public readonly textContent: string,
        public readonly imageUrl: string | null,
        public readonly audioUrl: string | null,
        public readonly challenge: SingleChoiceChallenge | null
    ) { }
}