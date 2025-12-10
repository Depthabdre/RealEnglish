import { ImmersionRepository } from '../domain/interface/immersion-repository';

export interface ToggleSaveVideoInput {
    userId: string;
    shortId: string;
}

export class ToggleSaveVideoUseCase {
    constructor(
        private readonly immersionRepository: ImmersionRepository
    ) { }

    async execute(input: ToggleSaveVideoInput): Promise<{ isSaved: boolean }> {
        // We simply delegate to the repo and return the new state
        const newStatus = await this.immersionRepository.toggleSave(input.userId, input.shortId);

        console.log(`👉 User ${input.userId} toggled save for ${input.shortId}. New Status: ${newStatus}`);

        return { isSaved: newStatus };
    }
}