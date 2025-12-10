import { ImmersionRepository } from '../domain/interface/immersion-repository';
import { ImmersionShort } from '../domain/entities/immersion-short';

export interface GetSavedShortsInput {
    userId: string;
}

export class GetSavedShortsUseCase {
    constructor(
        private readonly immersionRepository: ImmersionRepository
    ) { }

    async execute(input: GetSavedShortsInput): Promise<ImmersionShort[]> {
        const savedShorts = await this.immersionRepository.getSavedShorts(input.userId);
        console.log(`📂 Retrieved ${savedShorts.length} saved videos for user ${input.userId}`);
        return savedShorts;
    }
}