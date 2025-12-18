// src/feature/profile/use-cases/update_profile_identity.ts

import { ProfileRepository } from '../domain/interfaces/profile_repository';

interface UpdateRequest {
    userId: string;
    fullName?: string;
    avatarUrl?: string;
}

export class UpdateProfileIdentity {
    constructor(private readonly repository: ProfileRepository) { }

    async execute(request: UpdateRequest): Promise<void> {
        if (!request.fullName && !request.avatarUrl) {
            return; // Nothing to update
        }
        await this.repository.updateIdentity(
            request.userId,
            request.fullName,
            request.avatarUrl
        );
    }
}