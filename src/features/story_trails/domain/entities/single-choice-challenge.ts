import { Choice } from './choice';

export class SingleChoiceChallenge {
    constructor(
        public readonly id: string,
        public readonly challengeType: 'singleChoice',
        public readonly prompt: string,
        public readonly choices: Choice[],
        public readonly correctAnswerId: string,
        public readonly correctFeedback?: string | null,
        public readonly incorrectFeedback?: string | null
    ) { }
}