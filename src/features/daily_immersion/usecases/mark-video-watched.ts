import { ImmersionRepository } from '../domain/interface/immersion-repository';

export interface MarkVideoWatchedInput {
    userId: string;
    shortId: string;
}

export class MarkVideoWatchedUseCase {
    constructor(
        private readonly immersionRepository: ImmersionRepository
    ) { }

    async execute(input: MarkVideoWatchedInput): Promise<void> {
        // Fire and forget logic (we don't return anything)
        await this.immersionRepository.markAsWatched(input.userId, input.shortId);
        console.log(`👀 Marked video ${input.shortId} as watched by ${input.userId}`);
    }
}