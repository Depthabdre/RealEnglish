import { AuthRepository } from '../domain/interfaces/auth_repository';

// This might take a userId or token if you need to invalidate a token on the server-side.
// For a simple implementation, it might not need any input.
export interface SignOutInput {
    // Example: userId?: string;
}

export class SignOutUseCase {
    constructor(private readonly authRepository: AuthRepository) { }

    async execute(input?: SignOutInput): Promise<void> {
        await this.authRepository.signOut();
    }
}